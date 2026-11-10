// Checkout do cardápio online: grava o pedido pelo servidor.
// O banco não aceita mais pedido gravado direto do navegador; a taxa de entrega e o desconto
// de cashback são conferidos aqui (o cliente não consegue usar saldo que não tem).
import { CORS, json } from '../lib/admin';
import { criarPedido, ErroPedido } from '../lib/pedidos';

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers: CORS });
  if (req.method !== 'POST') return json(405, { ok: false, erro: 'Método não permitido.' });

  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return json(400, { ok: false, erro: 'Pedido inválido.' });
  }

  try {
    const r = await criarPedido({
      customer_name: corpo?.customer_name,
      customer_phone: corpo?.customer_phone,
      order_type: corpo?.order_type,
      payment_method: corpo?.payment_method,
      delivery_address: corpo?.delivery_address,
      delivery_zone: corpo?.delivery_zone,
      change_for: corpo?.change_for,
      nif: corpo?.nif,
      items: corpo?.items,
      taxa_entrega_cliente: corpo?.taxa_entrega,
      usar_cashback: corpo?.usar_cashback === true,
    });
    return json(200, { ok: true, ...r });
  } catch (e: any) {
    if (e instanceof ErroPedido) return json(e.status, { ok: false, erro: e.message });
    console.error('[pedido-criar]', e?.message || e);
    return json(500, { ok: false, erro: 'Não foi possível registrar o pedido agora. Tente novamente.' });
  }
};
