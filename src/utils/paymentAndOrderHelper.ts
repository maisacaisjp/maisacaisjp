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

  return 'Outros';
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
