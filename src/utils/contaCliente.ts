import { supabase } from '../lib/supabase';

// ==============================================================================
// ÁREA DO CLIENTE ("Meus pedidos")
// Entrada por código no WhatsApp (função cliente-codigo + RPCs do CLIENTE_MEUS_PEDIDOS.sql).
// A sessão fica no aparelho por 60 dias.
// ==============================================================================

const CHAVE_SESSAO = 'maisacai_cliente_sessao';
const CHAVE_ULTIMO_PEDIDO = 'maisacai_ultimo_pedido';

export interface SessaoCliente {
  token: string;
  telefone: string; // celular com DDD, só dígitos: 41997349076
}

export interface ItemPedidoCliente {
  name: string;
  category?: string;
  quantity: number;
  priceCalculated: number;
  extras?: { id: string; name: string; price: number }[];
  notes?: string;
}

export interface PedidoCliente {
  id: number;
  tracking_code: string;
  created_at: string;
  status: string;
  order_type: string;
  payment_method: string;
  total_amount: number;
  items: ItemPedidoCliente[];
  delivery_address: string | null;
  delivery_zone: string | null;
  customer_name: string | null;
}

const lerJSON = <T,>(chave: string): T | null => {
  try {
    const v = localStorage.getItem(chave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
};
const gravar = (chave: string, valor: unknown) => {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // modo privado: segue sem guardar
  }
};

/** Celular com DDD, sem o 55. Vazio se não parecer um celular. */
export function celularLocal(entrada: string): string {
  let d = String(entrada || '').replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  if (d.length === 9) d = '41' + d;
  if (d.length === 10 && /[6-9]/.test(d[2])) d = d.slice(0, 2) + '9' + d.slice(2);
  return d.length === 11 && d[2] === '9' ? d : '';
}

/** (41) 99734-9076 */
export function formatarCelular(d: string): string {
  const n = d.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n ? `(${n}` : '';
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

export const sessaoAtual = (): SessaoCliente | null => lerJSON<SessaoCliente>(CHAVE_SESSAO);

export async function enviarCodigo(telefone: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const r = await fetch('/.netlify/functions/cliente-codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) {
      return { ok: true };
    }
    return { ok: false, erro: j.erro || 'Não foi possível enviar o código no WhatsApp. Tente de novo.' };
  } catch {
    return { ok: false, erro: 'Sem conexão. Verifique sua internet e tente de novo.' };
  }
}

export async function validarCodigo(telefone: string, codigo: string): Promise<{ ok: boolean; erro?: string }> {
  const { data, error } = await supabase.rpc('cliente_validar_codigo', { p_telefone: telefone, p_codigo: codigo });
  if (error) return { ok: false, erro: 'Não foi possível confirmar agora. Tente de novo.' };
  const r = data as { ok: boolean; token?: string; erro?: string; restantes?: number };
  if (r?.ok && r.token) {
    gravar(CHAVE_SESSAO, { token: r.token, telefone } satisfies SessaoCliente);
    return { ok: true };
  }
  const erros: Record<string, string> = {
    expirado: 'Esse código expirou. Peça um novo.',
    tentativas: 'Muitas tentativas. Peça um novo código.',
    incorreto: r?.restantes ? `Código incorreto. Você ainda tem ${r.restantes} ${r.restantes === 1 ? 'tentativa' : 'tentativas'}.` : 'Código incorreto. Peça um novo.',
  };
  return { ok: false, erro: erros[r?.erro || ''] || 'Código incorreto.' };
}

/** Pedidos do cliente logado. null = sessão inválida (sai automaticamente). */
export async function carregarMeusPedidos(): Promise<PedidoCliente[] | null> {
  const s = sessaoAtual();
  if (!s) return null;
  const { data, error } = await supabase.rpc('cliente_meus_pedidos', { p_token: s.token });
  if (error) throw error;
  const r = data as { ok: boolean; pedidos?: PedidoCliente[] };
  if (!r?.ok) {
    gravar(CHAVE_SESSAO, null);
    return null;
  }
  return r.pedidos || [];
}

export async function sairDaConta() {
  const s = sessaoAtual();
  gravar(CHAVE_SESSAO, null);
  if (s) await supabase.rpc('cliente_sair', { p_token: s.token });
}

// ─── Último pedido do aparelho (aviso "seu pedido está em preparo", sem precisar entrar) ───

export interface UltimoPedido {
  codigo: string;
  id: number | null;
  criadoEm: string;
}

export const guardarUltimoPedido = (p: UltimoPedido) => gravar(CHAVE_ULTIMO_PEDIDO, p);
export const ultimoPedido = (): UltimoPedido | null => lerJSON<UltimoPedido>(CHAVE_ULTIMO_PEDIDO);
export const esquecerUltimoPedido = () => gravar(CHAVE_ULTIMO_PEDIDO, null);

// ─── Status ───

export const STATUS_FINAIS = ['Finalizado', 'Cancelado'];

export function etapasDoPedido(orderType: string) {
  return orderType === 'Delivery'
    ? ['Pendente', 'Em Preparo', 'Saiu para Entrega', 'Finalizado']
    : ['Pendente', 'Em Preparo', 'Finalizado'];
}

export function rotuloStatus(status: string, orderType: string): string {
  const retirada = orderType !== 'Delivery';
  const mapa: Record<string, string> = {
    Pendente: 'Recebido',
    'Em Preparo': 'Em preparo',
    'Saiu para Entrega': 'Saiu para entrega',
    Finalizado: retirada ? 'Retirado' : 'Entregue',
    Cancelado: 'Cancelado',
  };
  return mapa[status] || status;
}

export function textoDoStatus(status: string, orderType: string): string {
  const retirada = orderType !== 'Delivery';
  const mapa: Record<string, string> = {
    Pendente: 'Recebemos seu pedido e já vamos começar.',
    'Em Preparo': retirada ? 'Estamos preparando. Avisamos quando estiver pronto para retirar.' : 'Estamos preparando seu pedido com carinho.',
    'Saiu para Entrega': 'Seu pedido está a caminho!',
    Finalizado: retirada ? 'Pedido retirado. Bom apetite!' : 'Pedido entregue. Bom apetite!',
    Cancelado: 'Este pedido foi cancelado. Fale com a loja se tiver dúvida.',
  };
  return mapa[status] || '';
}

/** Pedido feito hoje (horário de Brasília). */
export function ehDeHoje(iso: string): boolean {
  const f = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return f(new Date(iso)) === f(new Date());
}
