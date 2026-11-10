import { supabase } from '../lib/supabase';

export interface CashbackConfig {
  enabled: boolean;
  percent: number; // Ex: 5 para 5%
  /** Dias até o crédito de cada compra vencer. */
  validadeDias: number;
}

export const DEFAULT_CASHBACK_PERCENT = 5;
// Os saldos vindos do Multipedidos vencem até 60 dias depois da compra
export const DEFAULT_CASHBACK_VALIDADE_DIAS = 60;

// Cache local rápido para não fazer requisições repetidas
let cachedConfig: CashbackConfig | null = null;
let lastConfigFetch = 0;

/**
 * Busca a configuração de cashback da loja salva em `settings`.
 * Fallback padrão: ativado com 5% e validade de 60 dias.
 */
export async function getCashbackConfig(): Promise<CashbackConfig> {
  const now = Date.now();
  if (cachedConfig && now - lastConfigFetch < 60000) {
    return cachedConfig;
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['cashback_enabled', 'cashback_percent', 'cashback_validade_dias']);

    if (error) throw error;

    let enabled = true;
    let percent = DEFAULT_CASHBACK_PERCENT;
    let validadeDias = DEFAULT_CASHBACK_VALIDADE_DIAS;

    data?.forEach((row: { key: string; value: any }) => {
      if (row.key === 'cashback_enabled') {
        enabled = String(row.value) !== 'false';
      }
      if (row.key === 'cashback_percent') {
        const val = parseFloat(String(row.value));
        if (!isNaN(val) && val >= 0) percent = val;
      }
      if (row.key === 'cashback_validade_dias') {
        const val = parseInt(String(row.value), 10);
        if (!isNaN(val) && val > 0) validadeDias = val;
      }
    });

    cachedConfig = { enabled, percent, validadeDias };
    lastConfigFetch = now;
    return cachedConfig;
  } catch (err) {
    console.warn('[Cashback] Erro ao carregar configurações de cashback, usando valores padrão:', err);
    return { enabled: true, percent: DEFAULT_CASHBACK_PERCENT, validadeDias: DEFAULT_CASHBACK_VALIDADE_DIAS };
  }
}

/**
 * Salva a configuração de cashback na tabela settings da loja.
 */
export async function saveCashbackConfig(enabled: boolean, percent: number, validadeDias: number = DEFAULT_CASHBACK_VALIDADE_DIAS): Promise<boolean> {
  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('settings').upsert([
      { key: 'cashback_enabled', value: String(enabled), updated_at: nowIso },
      { key: 'cashback_percent', value: String(percent), updated_at: nowIso },
      { key: 'cashback_validade_dias', value: String(validadeDias), updated_at: nowIso }
    ]);
    if (error) throw error;
    cachedConfig = { enabled, percent, validadeDias };
    lastConfigFetch = Date.now();
    return true;
  } catch (err) {
    console.error('[Cashback] Erro ao salvar configurações de cashback:', err);
    return false;
  }
}

// ─── Créditos com validade ───────────────────────────────────────────────────
// As regras ficam em cashbackLotes.ts (as mesmas que o servidor usa no checkout).
import {
  aplicarPedidoNosLotes,
  cleanCustomerPhone,
  lotesDoRegistro,
  resumo,
  r2,
  type CashbackInfo,
} from './cashbackLotes';

export { cleanCustomerPhone };
export type { CashbackLote, CashbackInfo } from './cashbackLotes';

/** Gestor logado lê direto do banco; cliente no cardápio consulta pela função do Netlify. */
async function temSessaoGestor(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
}

async function infoDoServidor(clean: string): Promise<CashbackInfo> {
  const r = await fetch('/.netlify/functions/cashback-saldo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefone: clean }),
  });
  const body = await r.json().catch(() => null);
  if (!r.ok || !body?.ok) throw new Error(body?.erro || `cashback-saldo respondeu ${r.status}`);
  return {
    saldo: Number(body.saldo) || 0,
    proximoVencimento: body.proximoVencimento ?? null,
    valorProximoVencimento: Number(body.valorProximoVencimento) || 0,
  };
}

async function infoDoBanco(clean: string): Promise<CashbackInfo> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', `cashback_balance_${clean}`)
    .maybeSingle();
  if (error) throw error;
  return resumo(data ? lotesDoRegistro(data.value) : []);
}

/**
 * Saldo válido do cliente (sem os créditos vencidos) e o próximo vencimento.
 */
export async function getCustomerCashbackInfo(phone: string): Promise<CashbackInfo> {
  const clean = cleanCustomerPhone(phone);
  const vazio: CashbackInfo = { saldo: 0, proximoVencimento: null, valorProximoVencimento: 0 };
  if (!clean) return vazio;
  try {
    const info = (await temSessaoGestor()) ? await infoDoBanco(clean) : await infoDoServidor(clean);
    try {
      localStorage.setItem(`cashback_bal_${clean}`, String(info.saldo));
    } catch (e) {}
    return info;
  } catch (err) {
    console.warn('[Cashback] Erro ao consultar saldo do cliente, usando local:', err);
    try {
      const local = parseFloat(localStorage.getItem(`cashback_bal_${clean}`) || '0') || 0;
      return { ...vazio, saldo: Math.max(0, r2(local)) };
    } catch (e) {
      return vazio;
    }
  }
}

/**
 * Retorna o saldo válido de cashback de um cliente (em R$).
 */
export async function getCustomerCashbackBalance(phone: string): Promise<number> {
  return (await getCustomerCashbackInfo(phone)).saldo;
}

/**
 * Atualiza o saldo de cashback do cliente após um pedido do PDV (gestor logado).
 * Pedido do cardápio online é gravado pela função pedido-criar, que já faz isso no servidor.
 * @param phone Telefone do cliente
 * @param earnedAmount Valor de cashback acumulado na compra atual
 * @param redeemedAmount Valor de saldo que o cliente utilizou para abater na compra atual
 */
export async function applyOrderCashback(
  phone: string,
  earnedAmount: number,
  redeemedAmount: number,
  orderId?: any
): Promise<number> {
  const clean = cleanCustomerPhone(phone);
  if (!clean) return 0;

  let atual;
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', `cashback_balance_${clean}`)
      .maybeSingle();
    if (error) throw error;
    atual = data ? lotesDoRegistro(data.value) : [];
  } catch (err) {
    console.warn('[Cashback] Não foi possível ler o saldo; cashback deste pedido não foi registrado:', err);
    return 0;
  }

  const { validadeDias } = await getCashbackConfig();
  const { info, value } = aplicarPedidoNosLotes(atual, earnedAmount, redeemedAmount, validadeDias, orderId || null);

  try {
    localStorage.setItem(`cashback_bal_${clean}`, String(info.saldo));
  } catch (e) {}

  try {
    const { error } = await supabase.from('settings').upsert({
      key: `cashback_balance_${clean}`,
      value,
      updated_at: value.updated_at
    });
    if (error) throw error;
  } catch (err) {
    console.warn('[Cashback] Erro ao atualizar saldo no Supabase:', err);
  }

  return info.saldo;
}

/** "18/11" a partir de "2026-11-18". */
export const dataCurta = (iso: string | null) => (iso ? iso.split('-').reverse().slice(0, 2).join('/') : '');
