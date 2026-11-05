/**
 * Helpers para normalização e consistência de formas de pagamento,
 * tipos de pedidos e filtros financeiros em todo o sistema.
 */

export type CanonicalPaymentMethod = 'Dinheiro' | 'PIX' | 'Cartão' | 'Outros';
export type CanonicalOrderType = 'entrega' | 'retirada' | 'mesa' | 'balcao';

/**
 * Normaliza qualquer variação de forma de pagamento vinda do cardápio do cliente,
 * do PDV, da edição de pedido ou de integrações externas.
 */
export function normalizePaymentMethod(method?: string | null): CanonicalPaymentMethod {
  if (!method) return 'Outros';

  const clean = method.trim().toLowerCase();

  if (
    clean === 'dinheiro' ||
    clean === 'numerario' ||
    clean === 'dinheiro' ||
    clean === 'cash'
  ) {
    return 'Dinheiro';
  }

  if (
    clean === 'mb way' ||
    clean === 'mbway' ||
    clean === 'mb_way'
  ) {
    return 'PIX';
  }

  if (
    clean === 'cartão' ||
    clean === 'cartao' ||
    clean === 'multibanco' ||
    clean === 'tpa' ||
    clean === 'card' ||
    clean === 'débito' ||
    clean === 'debito' ||
    clean === 'crédito' ||
    clean === 'credito'
  ) {
    return 'Cartão';
  }

  if (clean === 'pix') {
    return 'PIX';
  }

  // "Cartão de Débito", "Cartão de Crédito" (PDV) e variações
  if (clean.includes('cart') || clean.includes('débito') || clean.includes('debito') || clean.includes('crédito') || clean.includes('credito')) {
    return 'Cartão';
  }
  if (clean.includes('pix')) return 'PIX';
  if (clean.includes('dinheiro')) return 'Dinheiro';

  return 'Outros';
}

/**
 * Forma de pagamento com o detalhe de crédito/débito, usada nos gráficos do painel.
 */
export function detailPaymentMethod(method?: string | null): string {
  const raw = (method || 'Dinheiro').trim();
  const lower = raw.toLowerCase();
  if (lower.includes('pix') || lower.includes('mbway')) return 'PIX';
  if (lower.includes('crédito') || lower.includes('credito')) return 'Cartão de Crédito';
  if (lower.includes('débito') || lower.includes('debito')) return 'Cartão de Débito';
  if (lower.includes('cartão') || lower.includes('cartao') || lower.includes('card')) return 'Cartão';
  if (lower.includes('dinheiro') || lower.includes('cash') || lower.includes('numerario')) return 'Dinheiro';
  return raw;
}

// ─── Pagamento dividido ──────────────────────────────────────────────────────
// Um pedido pago em mais de uma forma fica gravado em payment_method assim:
//   "Dinheiro R$ 50,00 + PIX R$ 30,00"
// Os relatórios usam paymentParts() para somar cada parte na forma certa.

export interface PaymentPart {
  method: string;
  amount: number;
}

const brlNum = (n: number) => n.toFixed(2).replace('.', ',');

export function formatSplitPayment(parts: PaymentPart[]): string {
  const validas = parts.filter(p => p.amount > 0);
  if (validas.length === 1) return validas[0].method;
  return validas.map(p => `${p.method} R$ ${brlNum(p.amount)}`).join(' + ');
}

export function isSplitPayment(method?: string | null): boolean {
  return Boolean(method && method.includes(' + ') && method.includes('R$'));
}

/**
 * Divide o total do pedido entre as formas de pagamento.
 * Pedido com uma forma só devolve uma parte com o total inteiro.
 * Se as partes gravadas não fecharem com o total (pedido editado depois), a diferença vai para a última.
 */
export function paymentParts(method: string | null | undefined, total: number): PaymentPart[] {
  if (!isSplitPayment(method)) {
    return [{ method: (method || 'Dinheiro').trim(), amount: total }];
  }
  const parts: PaymentPart[] = [];
  for (const pedaco of (method as string).split(' + ')) {
    const m = pedaco.match(/^(.*?)\s*R\$\s*([\d.]*\d(?:,\d{1,2})?)\s*$/);
    if (!m) return [{ method: (method as string).trim(), amount: total }];
    const valor = parseFloat(m[2].replace(/\./g, '').replace(',', '.'));
    if (isNaN(valor)) return [{ method: (method as string).trim(), amount: total }];
    parts.push({ method: m[1].trim(), amount: valor });
  }
  const soma = parts.reduce((s, p) => s + p.amount, 0);
  const diff = Math.round((total - soma) * 100) / 100;
  if (diff !== 0 && parts.length > 0) {
    parts[parts.length - 1] = { ...parts[parts.length - 1], amount: Math.max(0, parts[parts.length - 1].amount + diff) };
  }
  return parts;
}

/** Texto curto da forma de pagamento para listas e recibos. */
export function paymentLabel(method?: string | null): string {
  if (isSplitPayment(method)) return (method as string).trim();
  return normalizePaymentMethod(method);
}

/**
 * Normaliza o tipo de atendimento (Delivery vs Entrega, Takeaway vs Retirada, Mesa, Balcão).
 */
export function normalizeOrderType(type?: string | null): CanonicalOrderType {
  if (!type) return 'entrega';

  const clean = type.trim().toLowerCase();

  if (clean === 'delivery' || clean === 'entrega') {
    return 'entrega';
  }

  if (clean === 'takeaway' || clean === 'retirada' || clean === 'recolha') {
    return 'retirada';
  }

  if (clean === 'mesa') {
    return 'mesa';
  }

  if (clean === 'balcao' || clean === 'balcão') {
    return 'balcao';
  }

  return 'entrega';
}

/**
 * Retorna se um pedido está ativo para fins de relatórios e faturamento.
 * Pedidos com status "Cancelado" são desconsiderados dos cálculos financeiros.
 */
export function isOrderActive(orderOrStatus?: any): boolean {
  if (!orderOrStatus) return false;
  const status = typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus.status;
  if (!status) return true;
  return status.trim().toLowerCase() !== 'cancelado';
}
