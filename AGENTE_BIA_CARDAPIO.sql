-- ============================================================================
-- AGENTE BIA (WhatsApp / n8n) - CARDÁPIO REAL EM TEMPO REAL
-- Rode no SQL Editor do Supabase do Mais Açaí SJP.
--
-- Cria a função cardapio_agente(), que devolve o cardápio que está no sistema
-- agora (produtos ativos e não pausados, tamanhos, adicionais, bairros, prazos
-- e horários) em texto compacto para a IA ler.
-- O fluxo do n8n chama: GET /rest/v1/rpc/cardapio_agente
-- Mudou um preço no painel → a Bia já responde com o preço novo.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cardapio_agente()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH
  produtos AS (
    SELECT
      c.order_index,
      c.name AS categoria,
      m.sort_order,
      '- ' || m.name ||
      CASE
        WHEN m.price_p IS NOT NULL OR m.price_m IS NOT NULL OR m.price_g IS NOT NULL THEN
          ': ' || concat_ws(' | ',
            CASE WHEN m.price_p IS NOT NULL THEN '330ml R$ ' || replace(to_char(m.price_p, 'FM9990.00'), '.', ',') END,
            CASE WHEN m.price_m IS NOT NULL THEN '440ml R$ ' || replace(to_char(m.price_m, 'FM9990.00'), '.', ',') END,
            CASE WHEN m.price_g IS NOT NULL THEN '550ml R$ ' || replace(to_char(m.price_g, 'FM9990.00'), '.', ',') END)
        ELSE ': R$ ' || replace(to_char(m.price_single, 'FM9990.00'), '.', ',')
      END ||
      CASE WHEN coalesce(m.ingredients, '') <> '' THEN ' — ' || regexp_replace(m.ingredients, '\s+', ' ', 'g') ELSE '' END
      AS linha
    FROM menu_items m
    JOIN categories c ON c.id = m.category
    WHERE m.is_active
      AND c.is_active
      AND m.id NOT LIKE 'system_config%'
      AND NOT EXISTS (SELECT 1 FROM paused_items p WHERE p.id = m.id)
  ),
  secoes AS (
    SELECT order_index, '## ' || upper(categoria) || E'\n' || string_agg(linha, E'\n' ORDER BY sort_order, linha) AS bloco
    FROM produtos
    GROUP BY order_index, categoria
  ),
  adicionais AS (
    SELECT string_agg('- ' || name || ': + R$ ' || replace(to_char(price, 'FM9990.00'), '.', ','), E'\n' ORDER BY sort_order, name) AS bloco
    FROM extras
    WHERE is_active
  ),
  bairros AS (
    SELECT string_agg('- ' || name || ': ' ||
             CASE WHEN fee = 0 THEN 'grátis' ELSE 'R$ ' || replace(to_char(fee, 'FM9990.00'), '.', ',') END,
             E'\n' ORDER BY sort_order, name) AS bloco
    FROM delivery_zones
    WHERE is_active
  ),
  horarios AS (
    SELECT string_agg(
             (ARRAY['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'])[day_of_week + 1] || ': ' ||
             CASE WHEN is_closed OR opens_at IS NULL THEN 'fechado'
                  ELSE to_char(opens_at, 'HH24"h"MI') || ' às ' || to_char(closes_at, 'HH24"h"MI') END,
             E'\n' ORDER BY day_of_week) AS bloco
    FROM business_hours
  ),
  cfg AS (
    SELECT
      max(CASE WHEN key = 'delivery_time_estimate' THEN value #>> '{}' END) AS prazo_entrega,
      max(CASE WHEN key = 'pickup_time_estimate'   THEN value #>> '{}' END) AS prazo_retirada,
      max(CASE WHEN key = 'delivery_min_order'     THEN value #>> '{}' END) AS pedido_minimo
    FROM settings
    WHERE key IN ('delivery_time_estimate', 'pickup_time_estimate', 'delivery_min_order')
  )
  SELECT jsonb_build_object(
    'cardapio',
      '# PRODUTOS (combos: copo 330ml, 440ml ou 550ml)' || E'\n\n' ||
      coalesce((SELECT string_agg(bloco, E'\n\n' ORDER BY order_index) FROM secoes), '(nenhum produto ativo)') ||
      E'\n\n# ADICIONAIS (todos cobrados à parte, valem para qualquer açaí)\n' ||
      coalesce((SELECT bloco FROM adicionais), '(nenhum)') ||
      E'\n\n# TAXA DE ENTREGA POR BAIRRO (São José dos Pinhais)\n' ||
      coalesce((SELECT bloco FROM bairros), '(não cadastrado)') ||
      E'\n\n# PRAZOS E PEDIDO MÍNIMO\n' ||
      '- Entrega: ' || coalesce((SELECT nullif(prazo_entrega, '') FROM cfg), '45 a 75 min') || E'\n' ||
      '- Retirada: ' || coalesce((SELECT nullif(prazo_retirada, '') FROM cfg), '20 a 30 min') || E'\n' ||
      '- Pedido mínimo para entrega: ' || coalesce('R$ ' || (SELECT nullif(pedido_minimo, '') FROM cfg), 'sem mínimo cadastrado') ||
      E'\n\n# HORÁRIO DE FUNCIONAMENTO\n' ||
      coalesce((SELECT bloco FROM horarios), '(não cadastrado)')
  );
$$;

GRANT EXECUTE ON FUNCTION public.cardapio_agente() TO anon, authenticated;

-- Teste: SELECT public.cardapio_agente() ->> 'cardapio';

-- ============================================================================
-- TABELAS PRÓPRIAS DA BIA (exclusivas do Mais Açaí, não compartilhar)
-- Usadas pelo n8n via credencial Postgres do Mais Açaí (conexão direta).
-- RLS ligado e sem política: a chave pública do site não lê as conversas.
-- ============================================================================

-- Junta mensagens que o cliente manda em sequência antes da Bia responder
CREATE TABLE IF NOT EXISTS public.maisacai_buffer_mensagens (
  id BIGSERIAL PRIMARY KEY,
  content TEXT,
  account_id INT NOT NULL DEFAULT 1,
  inbox_id INT NOT NULL DEFAULT 1,
  conversation_id INT NOT NULL DEFAULT 1,
  message_type INT NOT NULL DEFAULT 0,
  status INT NOT NULL DEFAULT 0,
  content_type INT NOT NULL DEFAULT 0,
  sender_id INT NOT NULL DEFAULT 0,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS maisacai_buffer_mensagens_source_idx ON public.maisacai_buffer_mensagens (source_id);
ALTER TABLE public.maisacai_buffer_mensagens ENABLE ROW LEVEL SECURITY;

-- Memória da conversa (formato do nó Postgres Chat Memory do n8n)
CREATE TABLE IF NOT EXISTS public.maisacai_chat_historico (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  message JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS maisacai_chat_historico_session_idx ON public.maisacai_chat_historico (session_id);
ALTER TABLE public.maisacai_chat_historico ENABLE ROW LEVEL SECURITY;
