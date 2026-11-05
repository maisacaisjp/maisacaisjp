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

/**
 * Limpa o número de telefone para chave única (apenas dígitos).
 */
export function cleanCustomerPhone(phone: string): string {
  return String(phone || '').replace(/\D/g, '');
}

// ─── Créditos com validade ───────────────────────────────────────────────────
// Cada compra vira um crédito ("lote") com a sua data de vencimento, como no Multipedidos.
// Ao usar o saldo, consome primeiro o crédito que vence antes. Crédito vencido não conta.
// Registro antigo, só com { balance, expires_at }, vira um lote único.

export interface CashbackLote {
  valor: number;
  /** yyyy-mm-dd; vale até o fim desse dia. null = sem vencimento. */
  expira: string | null;
}

export interface CashbackInfo {
  saldo: number;
  /** Data do crédito que vence primeiro (yyyy-mm-dd), se houver. */
  proximoVencimento: string | null;
  valorProximoVencimento: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

const hojeSP = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

const somarDias = (dias: number) => {
  const d = new Date(`${hojeSP()}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

const vencido = (l: CashbackLote) => l.expira !== null && l.expira < hojeSP();

// Vence primeiro quem tem data; sem data fica por último
const ordemVencimento = (a: CashbackLote, b: CashbackLote) =>
  (a.expira ?? '9999-12-31').localeCompare(b.expira ?? '9999-12-31');

function lotesDoRegistro(value: any): CashbackLote[] {
  if (value === null || value === undefined) return [];
  if (typeof value === 'object' && Array.isArray(value.lotes)) {
    return value.lotes
      .map((l: any) => ({ valor: Number(l.valor) || 0, expira: l.expira ? String(l.expira).slice(0, 10) : null }))
      .filter((l: CashbackLote) => l.valor > 0);
  }
  const saldo = typeof value === 'object' ? Number(value.balance) || 0 : parseFloat(String(value)) || 0;
  const expira = typeof value === 'object' && value.expires_at ? String(value.expires_at).slice(0, 10) : null;
  return saldo > 0 ? [{ valor: saldo, expira }] : [];
}

const lotesValidos = (lotes: CashbackLote[]) => lotes.filter(l => !vencido(l) && l.valor > 0).sort(ordemVencimento);

function resumo(lotes: CashbackLote[]): CashbackInfo {
  const validos = lotesValidos(lotes);
  const saldo = r2(validos.reduce((s, l) => s + l.valor, 0));
  const primeiro = validos.find(l => l.expira !== null) || null;
  const valorProx = primeiro ? r2(validos.filter(l => l.expira === primeiro.expira).reduce((s, l) => s + l.valor, 0)) : 0;
  return { saldo, proximoVencimento: primeiro ? primeiro.expira : null, valorProximoVencimento: valorProx };
}

async function lerLotes(clean: string): Promise<CashbackLote[] | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', `cashback_balance_${clean}`)
    .maybeSingle();
  if (error) throw error;
  return data ? lotesDoRegistro(data.value) : [];
}

/**
 * Saldo válido do cliente (sem os créditos vencidos) e o próximo vencimento.
 */
export async function getCustomerCashbackInfo(phone: string): Promise<CashbackInfo> {
  const clean = cleanCustomerPhone(phone);
  const vazio: CashbackInfo = { saldo: 0, proximoVencimento: null, valorProximoVencimento: 0 };
  if (!clean) return vazio;
  try {
    const lotes = await lerLotes(clean);
    const info = resumo(lotes || []);
    try {
      localStorage.setItem(`cashback_bal_${clean}`, String(info.saldo));
    } catch (e) {}
    return info;
  } catch (err) {
    console.warn('[Cashback] Erro ao consultar saldo do cliente no Supabase, usando local:', err);
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
 * Atualiza o saldo de cashback do cliente após um pedido.
 * Usa primeiro o crédito que vence antes; o cashback ganho vira um crédito novo com validade.
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

  let lotes: CashbackLote[];
  try {
    lotes = lotesValidos((await lerLotes(clean)) || []);
  } catch (err) {
    console.warn('[Cashback] Não foi possível ler o saldo; cashback deste pedido não foi registrado:', err);
    return 0;
  }

  // Abate o valor usado, do crédito que vence primeiro para o último
  let aUsar = r2(Math.max(0, redeemedAmount));
  for (const l of lotes) {
    if (aUsar <= 0) break;
    const tira = Math.min(l.valor, aUsar);
    l.valor = r2(l.valor - tira);
    aUsar = r2(aUsar - tira);
  }
  lotes = lotes.filter(l => l.valor > 0);

  if (earnedAmount > 0) {
    const { validadeDias } = await getCashbackConfig();
    lotes.push({ valor: r2(earnedAmount), expira: somarDias(validadeDias) });
  }

  lotes.sort(ordemVencimento);
  const info = resumo(lotes);

  try {
    localStorage.setItem(`cashback_bal_${clean}`, String(info.saldo));
  } catch (e) {}

  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('settings').upsert({
      key: `cashback_balance_${clean}`,
      value: {
        balance: info.saldo,
        lotes,
        expires_at: info.proximoVencimento,
        last_order_id: orderId || null,
        last_earned: r2(earnedAmount),
        last_redeemed: r2(redeemedAmount),
        updated_at: nowIso
      },
      updated_at: nowIso
    });
    if (error) throw error;
  } catch (err) {
    console.warn('[Cashback] Erro ao atualizar saldo no Supabase:', err);
  }

  return info.saldo;
}

/** "18/11" a partir de "2026-11-18". */
export const dataCurta = (iso: string | null) => (iso ? iso.split('-').reverse().slice(0, 2).join('/') : '');
