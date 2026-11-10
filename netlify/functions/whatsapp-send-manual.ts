import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

/**
 * Só envia para quem está logado no gestor e pode usar o Agente IA
 * (dono, ou funcionário com a permissão "gerenciar_configuracoes").
 * Mesma regra do gestor: conta sem perfil cadastrado não tem acesso.
 */
async function podeEnviar(req: Request): Promise<boolean> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return false;

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: usuario, error } = await sb.auth.getUser(token);
  if (error || !usuario?.user) return false;

  const { data: perfil, error: erroPerfil } = await sb
    .from('profiles')
    .select('role, permissions')
    .eq('id', usuario.user.id)
    .maybeSingle();
  if (erroPerfil) return false;
  if (!perfil || !perfil.role) return false; // sem perfil = sem acesso
  if (perfil.role === 'owner') return true;
  return perfil.permissions?.gerenciar_configuracoes === true;
}

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), { status: 405, headers });
  }

  if (!(await podeEnviar(req))) {
    return new Response(JSON.stringify({ success: false, message: 'Não autorizado. Entre no gestor para enviar mensagens.' }), { status: 401, headers });
  }

  try {
    const payload = await req.json();
    const phone = String(payload.phone || '').replace(/\D/g, '');
    const message = String(payload.message || '').trim();

    if (!phone || !message) {
      return new Response(JSON.stringify({ success: false, message: 'phone e message são obrigatórios' }), { status: 400, headers });
    }

    // Dispara para webhook ou Evolution API
    // Se a Evolution API URL estiver configurada:
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE;

    if (!evolutionUrl || !evolutionApiKey || !instanceName) {
      return new Response(JSON.stringify({ success: false, message: 'Evolution API não configurada (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME).' }), { status: 500, headers });
    }

    let evolutionResult = null;
    try {
      const evoRes = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey
        },
        body: JSON.stringify({
          number: phone,
          text: message
        })
      });
      if (evoRes.ok) {
        evolutionResult = await evoRes.json();
      }
    } catch (e) {
      console.warn('Aviso ao enviar direto na Evolution API:', e);
    }

    return new Response(JSON.stringify({
      success: true,
      phone,
      message,
      evolution: evolutionResult
    }), { status: 200, headers });

  } catch (error: any) {
    console.error('Manual Send API Error:', error);
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
};

export const config = {
  path: '/.netlify/functions/whatsapp-send-manual'
};
