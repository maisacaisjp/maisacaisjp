// Regras do saldo de cashback (sem banco e sem tela): usadas no navegador e nas funções do Netlify.
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

export const r2 = (n: number) => Math.round(n * 100) / 100;

export const hojeSP = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

export const somarDias = (dias: number) => {
  const d = new Date(`${hojeSP()}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

/** Só dígitos: chave do saldo é `cashback_balance_<dígitos>`. */
export function cleanCustomerPhone(phone: string): string {
  return String(phone || '').replace(/\D/g, '');
}

const vencido = (l: CashbackLote) => l.expira !== null && l.expira < hojeSP();

// Vence primeiro quem tem data; sem data fica por último
export const ordemVencimento = (a: CashbackLote, b: CashbackLote) =>
  (a.expira ?? '9999-12-31').localeCompare(b.expira ?? '9999-12-31');

export function lotesDoRegistro(value: any): CashbackLote[] {
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

export const lotesValidos = (lotes: CashbackLote[]) => lotes.filter(l => !vencido(l) && l.valor > 0).sort(ordemVencimento);

export function resumo(lotes: CashbackLote[]): CashbackInfo {
  const validos = lotesValidos(lotes);
  const saldo = r2(validos.reduce((s, l) => s + l.valor, 0));
  const primeiro = validos.find(l => l.expira !== null) || null;
  const valorProx = primeiro ? r2(validos.filter(l => l.expira === primeiro.expira).reduce((s, l) => s + l.valor, 0)) : 0;
  return { saldo, proximoVencimento: primeiro ? primeiro.expira : null, valorProximoVencimento: valorProx };
}

/**
 * Novo registro de saldo depois de um pedido: abate o valor usado (do crédito que vence primeiro)
 * e acrescenta o cashback ganho como crédito novo, vencendo em `validadeDias`.
 */
export function aplicarPedidoNosLotes(
  lotesAtuais: CashbackLote[],
  ganho: number,
  usado: number,
  validadeDias: number,
  orderId?: unknown
) {
  let lotes = lotesValidos(lotesAtuais.map(l => ({ ...l })));
  let aUsar = r2(Math.max(0, usado));
  for (const l of lotes) {
    if (aUsar <= 0) break;
    const tira = Math.min(l.valor, aUsar);
    l.valor = r2(l.valor - tira);
    aUsar = r2(aUsar - tira);
  }
  lotes = lotes.filter(l => l.valor > 0);
  if (ganho > 0) lotes.push({ valor: r2(ganho), expira: somarDias(validadeDias) });
  lotes.sort(ordemVencimento);
  const info = resumo(lotes);
  const nowIso = new Date().toISOString();
  return {
    info,
    value: {
      balance: info.saldo,
      lotes,
      expires_at: info.proximoVencimento,
      last_order_id: orderId ?? null,
      last_earned: r2(ganho),
      last_redeemed: r2(usado),
      updated_at: nowIso,
    },
  };
}
