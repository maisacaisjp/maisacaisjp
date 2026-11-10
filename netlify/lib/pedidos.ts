// Gravação de pedido pelo servidor: usada pelo cardápio online (pedido-criar) e pela Maya (maya-api).
// Faz, nesta ordem: caixa aberto → pedido → cadastro do cliente → cashback.
import { supabaseAdmin, configCashback } from './admin';
import { aplicarPedidoNosLotes, cleanCustomerPhone, lotesDoRegistro, resumo, r2 } from '../../src/utils/cashbackLotes';

export interface ItemPedido {
  name: string;
  category?: string;
  quantity: number;
  priceCalculated: number;
  basePrice?: number;
  extras?: Array<{ name: string; price: number; [k: string]: unknown }>;
  notes?: string;
}

export interface NovoPedido {
  customer_name: string;
  customer_phone: string;
  order_type: string;
  payment_method: string;
  delivery_address?: string | null;
  delivery_zone?: string | null;
  change_for?: string | null;
  nif?: string | null;
  notes?: string | null;
  items: ItemPedido[];
  /** Taxa informada pelo navegador; vale só se o bairro não for achado no banco. */
  taxa_entrega_cliente?: number;
  usar_cashback?: boolean;
  /** Cardápio online calcula subtotal + taxa e cashback; a Maya manda o total pronto. */
  total_pronto?: number;
  ganhar_cashback?: boolean;
}

export class ErroPedido extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}

const texto = (v: unknown, max: number) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

function limparItens(itens: unknown): ItemPedido[] {
  if (!Array.isArray(itens) || itens.length === 0) throw new ErroPedido(400, 'O pedido está sem itens.');
  if (itens.length > 60) throw new ErroPedido(400, 'Pedido com itens demais.');
  return itens.map((i: any) => {
    const quantity = Math.round(num(i?.quantity));
    const priceCalculated = r2(num(i?.priceCalculated));
    if (!(quantity >= 1 && quantity <= 99)) throw new ErroPedido(400, 'Quantidade inválida em um item.');
    if (!(priceCalculated >= 0 && priceCalculated <= 2000)) throw new ErroPedido(400, 'Preço inválido em um item.');
    const extras = Array.isArray(i?.extras) ? i.extras.slice(0, 40).map((e: any) => ({ ...e, name: String(e?.name ?? '').slice(0, 120), price: r2(num(e?.price) || 0) })) : [];
    return {
      name: texto(i?.name, 200) || 'Item',
      category: texto(i?.category, 80) || undefined,
      quantity,
      priceCalculated,
      basePrice: Number.isFinite(num(i?.basePrice)) ? r2(num(i.basePrice)) : undefined,
      extras,
      notes: texto(i?.notes, 500) || '',
    };
  });
}

export async function criarPedido(p: NovoPedido) {
  const sb = supabaseAdmin();
  const nome = texto(p.customer_name, 80);
  if (!nome) throw new ErroPedido(400, 'Por favor, preencha o seu nome.');
  const telefone = cleanCustomerPhone(p.customer_phone).slice(0, 13);
  const tipo = texto(p.order_type, 30) || 'Delivery';
  const entrega = tipo === 'Delivery';
  const itens = limparItens(p.items);
  const bairro = entrega ? texto(p.delivery_zone, 80) : null;

  // Taxa de entrega: vale a do banco (bairro ativo); se o bairro não existir, a informada
  let taxa = 0;
  if (entrega && p.total_pronto === undefined) {
    let taxaBanco: number | null = null;
    if (bairro) {
      const { data } = await sb.from('delivery_zones').select('fee').eq('name', bairro).eq('is_active', true).maybeSingle();
      if (data && Number.isFinite(Number(data.fee))) taxaBanco = Number(data.fee);
    }
    const taxaCliente = num(p.taxa_entrega_cliente);
    taxa = taxaBanco ?? (taxaCliente >= 0 && taxaCliente <= 100 ? taxaCliente : 0);
  }

  const subtotal = r2(itens.reduce((s, i) => s + i.priceCalculated * i.quantity, 0));
  const cfg = await configCashback();

  // Saldo atual do cliente (só lê se for usar ou ganhar)
  const ganhar = p.ganhar_cashback !== false && cfg.enabled && !!telefone;
  let lotes: ReturnType<typeof lotesDoRegistro> = [];
  if (telefone && (p.usar_cashback || ganhar)) {
    const { data } = await sb.from('settings').select('value').eq('key', `cashback_balance_${telefone}`).maybeSingle();
    lotes = data ? lotesDoRegistro(data.value) : [];
  }
  const saldo = resumo(lotes).saldo;

  let total: number;
  let usado = 0;
  if (p.total_pronto !== undefined) {
    total = r2(num(p.total_pronto));
    if (!(total >= 0 && total <= 10000)) throw new ErroPedido(400, 'Valor total inválido.');
  } else {
    const bruto = r2(subtotal + taxa);
    usado = cfg.enabled && p.usar_cashback && saldo > 0 ? r2(Math.min(saldo, bruto)) : 0;
    total = Math.max(0, r2(bruto - usado));
  }
  const ganho = ganhar && p.total_pronto === undefined ? r2(Math.max(0, subtotal - usado) * (cfg.percent / 100)) : 0;

  const { data: caixa } = await sb.from('cash_sessions').select('id').eq('status', 'aberto').order('opened_at', { ascending: false }).limit(1).maybeSingle();

  const notas = [usado > 0 ? `[Desconto Cashback: R$ ${usado.toFixed(2)}]` : null, texto(p.notes, 500)].filter(Boolean).join(' ') || null;

  const { data: pedido, error } = await sb
    .from('orders')
    .insert({
      cash_session_id: caixa?.id ?? null,
      customer_name: nome,
      customer_phone: telefone || null,
      order_type: tipo,
      payment_method: texto(p.payment_method, 40) || 'PIX',
      status: 'Pendente',
      total_amount: total,
      delivery_address: entrega ? texto(p.delivery_address, 300) : null,
      delivery_zone: bairro,
      change_for: texto(p.change_for, 40),
      nif: texto(p.nif, 20),
      notes: notas,
      items: itens,
    })
    .select('id, tracking_code, status, created_at')
    .single();
  if (error || !pedido) {
    console.error('[pedidos] Erro ao gravar pedido:', error?.message);
    throw new ErroPedido(500, 'Não foi possível registrar o pedido agora. Tente novamente.');
  }

  // Cadastro do cliente (não impede o pedido se falhar)
  if (telefone) {
    try {
      const agora = new Date().toISOString();
      const { data: cli } = await sb.from('customers').select('id, total_orders, total_spent').eq('phone', telefone).maybeSingle();
      if (cli) {
        await sb
          .from('customers')
          .update({ name: nome, total_orders: (cli.total_orders || 0) + 1, total_spent: r2((Number(cli.total_spent) || 0) + total), last_order_at: agora })
          .eq('id', cli.id);
      } else {
        await sb.from('customers').insert({ phone: telefone, name: nome, total_orders: 1, total_spent: total, last_order_at: agora });
      }
    } catch (e: any) {
      console.warn('[pedidos] Cadastro do cliente não atualizado:', e?.message || e);
    }
  }

  // Cashback (não impede o pedido se falhar)
  let saldoFinal = saldo;
  if (telefone && (ganho > 0 || usado > 0)) {
    try {
      const { info, value } = aplicarPedidoNosLotes(lotes, ganho, usado, cfg.validadeDias, pedido.id);
      const { error: e2 } = await sb.from('settings').upsert({ key: `cashback_balance_${telefone}`, value, updated_at: value.updated_at });
      if (e2) throw e2;
      saldoFinal = info.saldo;
    } catch (e: any) {
      console.warn('[pedidos] Cashback não atualizado:', e?.message || e);
    }
  }

  return {
    id: pedido.id as number,
    tracking_code: (pedido.tracking_code as string) || null,
    status: pedido.status as string,
    subtotal,
    taxa_entrega: taxa,
    total,
    cashback_usado: usado,
    cashback_ganho: ganho,
    saldo_cashback: saldoFinal,
  };
}
