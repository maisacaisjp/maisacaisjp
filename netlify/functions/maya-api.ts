// Porta única da Maya (n8n) para o sistema. Só aceita chamadas com a chave da Maya no cabeçalho
// "x-maya-chave" (guardada em segredos_internos 'maya_api' e na credencial do n8n — nunca no fluxo).
//
// Ações (POST JSON { acao, ... }):
//   relatorio     → { tipo, termo, data_inicio, data_fim, telefone, order_id } → { resultado }
//   status_pedido → { telefone, termo } → último pedido DESTE telefone (cliente não vê pedido de outra pessoa)
//   criar_pedido  → { telefone, customer_name, order_type, payment_method, total_amount, delivery_address, delivery_zone, items_description }
import { CORS, iguais, json, segredo, supabaseAdmin } from '../lib/admin';
import { montarRelatorio } from '../lib/mayaRelatorios';
import { criarPedido, ErroPedido } from '../lib/pedidos';

const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '');

async function statusPedido(telefone: string, termo: string) {
  const tel = soDigitos(telefone).replace(/^55(?=\d{10,11}$)/, '');
  if (tel.length < 8) return { encontrado: false, mensagem: 'Telefone do cliente não identificado.' };
  const final = tel.slice(-8);
  const busca = String(termo || '').replace(/[#\s]/g, '');
  let q = supabaseAdmin()
    .from('orders')
    .select('id,status,customer_name,order_type,total_amount,items,created_at,tracking_code,delivery_address,delivery_zone')
    .ilike('customer_phone', `%${final}%`)
    .order('created_at', { ascending: false })
    .limit(1);
  if (/^\d{1,6}$/.test(busca)) q = q.eq('id', Number(busca));
  else if (/^[0-9a-f]{6,}$/i.test(busca) && !/^\d+$/.test(busca)) q = q.ilike('tracking_code', `%${busca}%`);
  let { data } = await q;
  // Número/código não bate com este telefone: mostra o último pedido do próprio cliente
  if ((!data || !data.length) && busca) {
    const r = await supabaseAdmin()
      .from('orders')
      .select('id,status,customer_name,order_type,total_amount,items,created_at,tracking_code,delivery_address,delivery_zone')
      .ilike('customer_phone', `%${final}%`)
      .order('created_at', { ascending: false })
      .limit(1);
    data = r.data;
  }
  if (!data || !data.length) return { encontrado: false, mensagem: 'Nenhum pedido encontrado para este WhatsApp.' };
  return { encontrado: true, pedido: data[0] };
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers: CORS });
  if (req.method !== 'POST') return json(405, { ok: false, erro: 'Método não permitido.' });

  try {
    const esperado = await segredo('maya_api');
    const recebido = req.headers.get('x-maya-chave') || '';
    if (!esperado || !iguais(recebido, esperado)) return json(401, { ok: false, erro: 'Não autorizado.' });
  } catch (e: any) {
    console.error('[maya-api] Erro ao ler a chave:', e?.message || e);
    return json(503, { ok: false, erro: 'Serviço indisponível.' });
  }

  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return json(400, { ok: false, erro: 'Corpo inválido.' });
  }
  const acao = String(corpo?.acao || 'relatorio');

  try {
    if (acao === 'relatorio') {
      const resultado = await montarRelatorio(corpo);
      return json(200, { ok: true, resultado });
    }
    if (acao === 'status_pedido') {
      return json(200, { ok: true, ...(await statusPedido(corpo?.telefone, corpo?.termo)) });
    }
    if (acao === 'criar_pedido') {
      const total = Number(corpo?.total_amount) || 0;
      const desc = String(corpo?.items_description || 'Açaí').trim().slice(0, 500);
      const r = await criarPedido({
        customer_name: corpo?.customer_name || 'Cliente',
        customer_phone: soDigitos(corpo?.telefone).replace(/^55(?=\d{10,11}$)/, ''),
        order_type: corpo?.order_type || 'Delivery',
        payment_method: corpo?.payment_method || 'PIX',
        delivery_address: corpo?.delivery_address || null,
        delivery_zone: corpo?.delivery_zone || null,
        notes: desc,
        items: [{ name: desc, quantity: 1, priceCalculated: total }],
        total_pronto: total,
        ganhar_cashback: false,
      });
      return json(200, { ok: true, ...r });
    }
    return json(400, { ok: false, erro: 'Ação desconhecida.' });
  } catch (e: any) {
    if (e instanceof ErroPedido) return json(e.status, { ok: false, erro: e.message });
    console.error('[maya-api]', acao, e?.message || e);
    return json(500, { ok: false, erro: 'Erro interno.' });
  }
};
