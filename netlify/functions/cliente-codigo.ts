import { createClient } from '@supabase/supabase-js';

// Área do cliente: gera o código de acesso e envia pelo WhatsApp da loja (Evolution, instância da Mais Açaí).
// Precisa no Netlify: CLIENTE_OTP_SEGREDO (sai do script CLIENTE_MEUS_PEDIDOS.sql) e as variáveis da Evolution.

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const resposta = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

/** Celular com DDD, sem o 55: "41997349076". Aceita o formato antigo sem o 9. */
function celularLocal(entrada: unknown): string {
  let d = String(entrada || '').replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  if (d.length === 9) d = '41' + d;
  if (d.length === 10 && /[6-9]/.test(d[2])) d = d.slice(0, 2) + '9' + d.slice(2);
  return d.length === 11 && d[2] === '9' ? d : '';
}

const MENSAGENS_ERRO: Record<string, [number, string]> = {
  aguarde: [429, 'Aguarde 1 minuto para pedir outro código.'],
  limite: [429, 'Muitas tentativas. Tente de novo mais tarde.'],
  telefone_invalido: [400, 'Confira o número do WhatsApp com DDD.'],
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers });
  if (req.method !== 'POST') return resposta(405, { ok: false, erro: 'Método não permitido.' });

  const segredo = process.env.CLIENTE_OTP_SEGREDO;
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  const instancia = process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE;
  if (!segredo || !evolutionUrl || !evolutionKey || !instancia) {
    console.error('[cliente-codigo] Faltam variáveis: CLIENTE_OTP_SEGREDO e/ou EVOLUTION_*');
    return resposta(503, { ok: false, erro: 'Entrada temporariamente indisponível. Tente mais tarde.' });
  }

  let telefone = '';
  try {
    telefone = celularLocal((await req.json())?.telefone);
  } catch {
    // corpo inválido
  }
  if (!telefone) return resposta(400, { ok: false, erro: MENSAGENS_ERRO.telefone_invalido[1] });

  const { data: codigo, error } = await supabase.rpc('cliente_criar_codigo', { p_telefone: telefone, p_segredo: segredo });
  if (error || !codigo) {
    const chave = Object.keys(MENSAGENS_ERRO).find(k => error?.message?.includes(k));
    if (chave) return resposta(MENSAGENS_ERRO[chave][0], { ok: false, erro: MENSAGENS_ERRO[chave][1] });
    console.error('[cliente-codigo] Erro ao criar código:', error?.message);
    return resposta(500, { ok: false, erro: 'Não foi possível gerar o código agora. Tente de novo.' });
  }

  const texto =
    `*Mais Açaí* 💜\n\n` +
    `Seu código para ver seus pedidos é: *${codigo}*\n\n` +
    `Ele vale por 10 minutos. Se não foi você que pediu, é só ignorar esta mensagem.`;

  try {
    const envio = await fetch(`${evolutionUrl.replace(/\/$/, '')}/message/sendText/${instancia}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
      body: JSON.stringify({ number: `55${telefone}`, text: texto }),
    });
    if (!envio.ok) {
      console.error('[cliente-codigo] Evolution respondeu', envio.status, (await envio.text()).slice(0, 200));
      return resposta(502, { ok: false, erro: 'Não conseguimos enviar o código no WhatsApp agora. Tente de novo.' });
    }
  } catch (e) {
    console.error('[cliente-codigo] Falha ao chamar a Evolution:', e);
    return resposta(502, { ok: false, erro: 'Não conseguimos enviar o código no WhatsApp agora. Tente de novo.' });
  }

  return resposta(200, { ok: true });
};

export const config = {
  path: '/.netlify/functions/cliente-codigo',
};
