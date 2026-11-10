// Saldo de cashback do cliente para o cardápio online.
// O banco não mostra mais os saldos para quem não está logado; esta função devolve só o saldo
// e o próximo vencimento do telefone informado (sem nome nem histórico).
import { CORS, json, supabaseAdmin } from '../lib/admin';
import { cleanCustomerPhone, lotesDoRegistro, resumo } from '../../src/utils/cashbackLotes';

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers: CORS });
  if (req.method !== 'POST') return json(405, { ok: false, erro: 'Método não permitido.' });

  let tel = '';
  try {
    tel = cleanCustomerPhone((await req.json())?.telefone);
  } catch {
    // corpo inválido
  }
  if (tel.length < 10 || tel.length > 13) return json(400, { ok: false, erro: 'Telefone inválido.' });

  try {
    const { data, error } = await supabaseAdmin()
      .from('settings')
      .select('value')
      .eq('key', `cashback_balance_${tel}`)
      .maybeSingle();
    if (error) throw error;
    return json(200, { ok: true, ...resumo(data ? lotesDoRegistro(data.value) : []) });
  } catch (e: any) {
    console.error('[cashback-saldo]', e?.message || e);
    return json(500, { ok: false, erro: 'Não foi possível consultar o saldo agora.' });
  }
};
