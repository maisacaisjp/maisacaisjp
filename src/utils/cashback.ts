import { supabase } from '../lib/supabase';

export interface CashbackConfig {
  enabled: boolean;
  percent: number; // Ex: 5 para 5%
}

export const DEFAULT_CASHBACK_PERCENT = 5;

// Cache local rápido para não fazer requisições repetidas
let cachedConfig: CashbackConfig | null = null;
let lastConfigFetch = 0;

/**
 * Busca a configuração de cashback da loja salva em `settings`.
 * Fallback padrão: ativado com 5%.
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
      .in('key', ['cashback_enabled', 'cashback_percent']);

    if (error) throw error;

    let enabled = true;
    let percent = DEFAULT_CASHBACK_PERCENT;

    data?.forEach((row: { key: string; value: any }) => {
      if (row.key === 'cashback_enabled') {
        enabled = String(row.value) !== 'false';
      }
      if (row.key === 'cashback_percent') {
        const val = parseFloat(String(row.value));
        if (!isNaN(val) && val >= 0) {
          percent = val;
        }
      }
    });

    cachedConfig = { enabled, percent };
    lastConfigFetch = now;
    return cachedConfig;
  } catch (err) {
    console.warn('[Cashback] Erro ao carregar configurações de cashback, usando valores padrão:', err);
    return { enabled: true, percent: DEFAULT_CASHBACK_PERCENT };
  }
}

/**
 * Salva a configuração de cashback na tabela settings da loja.
 */
export async function saveCashbackConfig(enabled: boolean, percent: number): Promise<boolean> {
  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('settings').upsert([
      { key: 'cashback_enabled', value: String(enabled), updated_at: nowIso },
      { key: 'cashback_percent', value: String(percent), updated_at: nowIso }
    ]);
    if (error) throw error;
    cachedConfig = { enabled, percent };
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

/**
 * Retorna o saldo atual de cashback de um cliente (em R$).
 */
export async function getCustomerCashbackBalance(phone: string): Promise<number> {
  const clean = cleanCustomerPhone(phone);
  if (!clean) return 0;

  // 1. Tenta do localStorage primeiro como resposta imediata
  let localBalance = 0;
  try {
    const local = localStorage.getItem(`cashback_bal_${clean}`);
    if (local) localBalance = parseFloat(local) || 0;
  } catch (e) {
    // ignore
  }

  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', `cashback_balance_${clean}`)
      .maybeSingle();

    if (data?.value) {
      let val = 0;
      if (typeof data.value === 'object' && data.value.balance !== undefined) {
        val = Number(data.value.balance) || 0;
      } else {
        val = parseFloat(String(data.value)) || 0;
      }
      try {
        localStorage.setItem(`cashback_bal_${clean}`, String(val));
      } catch (e) {}
      return Math.max(0, Number(val.toFixed(2)));
    }
  } catch (err) {
    console.warn('[Cashback] Erro ao consultar saldo do cliente no Supabase, usando local:', err);
  }

  return Math.max(0, Number(localBalance.toFixed(2)));
}

/**
 * Atualiza o saldo de cashback do cliente após um pedido.
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

  const currentBalance = await getCustomerCashbackBalance(clean);
  const newBalance = Math.max(0, Number((currentBalance - redeemedAmount + earnedAmount).toFixed(2)));

  try {
    localStorage.setItem(`cashback_bal_${clean}`, String(newBalance));
  } catch (e) {}

  try {
    await supabase.from('settings').upsert({
      key: `cashback_balance_${clean}`,
      value: {
        balance: newBalance,
        last_order_id: orderId || null,
        last_earned: earnedAmount,
        last_redeemed: redeemedAmount,
        updated_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Cashback] Erro ao atualizar saldo no Supabase:', err);
  }

  return newBalance;
}
