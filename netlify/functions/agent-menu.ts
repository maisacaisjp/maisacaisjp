import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// Cardápio em texto para a IA (Bia). A montagem fica na função SQL
// cardapio_agente() (AGENTE_BIA_CARDAPIO.sql), a mesma que o n8n consulta,
// para que os dois caminhos nunca mostrem preços diferentes.
export const handler: Handler = async () => {
  try {
    const { data, error } = await supabase.rpc('cardapio_agente');

    if (error) {
      console.error('Erro ao buscar cardápio do Supabase:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Erro ao buscar cardápio' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      body: (data as { cardapio?: string } | null)?.cardapio || ''
    };
  } catch (error) {
    console.error('Erro na função agent-menu:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno no servidor' })
    };
  }
};
