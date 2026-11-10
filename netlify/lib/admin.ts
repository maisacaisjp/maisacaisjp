// Acesso ao banco pelo servidor (Netlify), com a chave secreta do Supabase.
// A chave fica SÓ nas variáveis do Netlify (SUPABASE_SERVICE_ROLE_KEY) — nunca no código nem no navegador.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cliente: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !chave) throw new Error('SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_URL ausente no Netlify');
  cliente = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  return cliente;
}

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-maya-chave',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: CORS });

/** Comparação de texto em tempo constante (para segredos). */
export function iguais(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Lê um segredo da tabela segredos_internos (só o servidor enxerga essa tabela). */
const cacheSegredo: Record<string, { valor: string; em: number }> = {};
export async function segredo(chave: string): Promise<string> {
  const c = cacheSegredo[chave];
  if (c && Date.now() - c.em < 60_000) return c.valor;
  const { data, error } = await supabaseAdmin().from('segredos_internos').select('valor').eq('chave', chave).maybeSingle();
  if (error) throw error;
  const valor = String(data?.valor || '');
  cacheSegredo[chave] = { valor, em: Date.now() };
  return valor;
}

/** Configuração de cashback salva em settings (mesmos padrões do navegador). */
export async function configCashback() {
  const { data } = await supabaseAdmin()
    .from('settings')
    .select('key, value')
    .in('key', ['cashback_enabled', 'cashback_percent', 'cashback_validade_dias']);
  let enabled = true;
  let percent = 5;
  let validadeDias = 60;
  for (const row of data || []) {
    if (row.key === 'cashback_enabled') enabled = String(row.value) !== 'false';
    if (row.key === 'cashback_percent') {
      const v = parseFloat(String(row.value));
      if (!isNaN(v) && v >= 0) percent = v;
    }
    if (row.key === 'cashback_validade_dias') {
      const v = parseInt(String(row.value), 10);
      if (!isNaN(v) && v > 0) validadeDias = v;
    }
  }
  return { enabled, percent, validadeDias };
}
