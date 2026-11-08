-- ============================================================================
-- HORÁRIOS DE FUNCIONAMENTO & STATUS DA LOJA VIA ASSISTENTE MAYA (WHATSAPP)
-- Permite que Michele ou Junior alterem o horário da loja ou o status de
-- funcionamento diretamente pelo WhatsApp com comandos em linguagem natural.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.alterar_horario_loja(
  p_telefone text,
  p_dia int DEFAULT NULL,
  p_abre text DEFAULT NULL,
  p_fecha text DEFAULT NULL,
  p_fechado boolean DEFAULT NULL,
  p_status_loja text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_is_dono boolean;
  v_target_day int;
  v_nome_dia text;
  v_opens time;
  v_closes time;
  v_dias text[] := ARRAY['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  v_res jsonb;
  v_dono_nome text;
BEGIN
  -- Normaliza telefone retirando qualquer caractere não numérico
  v_phone := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  
  -- Valida se o número é de Junior ou Michele
  IF v_phone LIKE '%996560080' OR v_phone LIKE '%96560080' THEN
    v_is_dono := true;
    v_dono_nome := 'Junior';
  ELSIF v_phone LIKE '%997349076' OR v_phone LIKE '%97349076' THEN
    v_is_dono := true;
    v_dono_nome := 'Michele';
  ELSE
    v_is_dono := false;
  END IF;

  IF NOT v_is_dono THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'erro', 'Apenas os proprietários (Michele ou Junior) têm autorização para alterar o horário ou o status da loja.'
    );
  END IF;

  -- Determina o dia da semana alvo (0 = Domingo .. 6 = Sábado). Default: hoje no fuso de SP
  IF p_dia IS NOT NULL THEN
    v_target_day := p_dia % 7;
  ELSE
    v_target_day := (EXTRACT(DOW FROM (now() AT TIME ZONE 'America/Sao_Paulo')))::int;
  END IF;
  
  v_nome_dia := v_dias[v_target_day + 1];

  -- Se foi passado status geral da loja ('open', 'closed', 'auto')
  IF p_status_loja IS NOT NULL AND trim(p_status_loja) <> '' THEN
    INSERT INTO public.settings (key, value, updated_at)
    VALUES ('store_status', lower(trim(p_status_loja)), now())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = now();
  END IF;

  -- Se foram passados dados de horário para o dia
  IF p_abre IS NOT NULL OR p_fecha IS NOT NULL OR p_fechado IS NOT NULL THEN
    IF p_abre IS NOT NULL AND trim(p_abre) <> '' THEN
      v_opens := (trim(p_abre) || CASE WHEN length(trim(p_abre)) <= 2 THEN ':00:00' WHEN length(trim(p_abre)) = 5 THEN ':00' ELSE '' END)::time;
    END IF;
    
    IF p_fecha IS NOT NULL AND trim(p_fecha) <> '' THEN
      v_closes := (trim(p_fecha) || CASE WHEN length(trim(p_fecha)) <= 2 THEN ':00:00' WHEN length(trim(p_fecha)) = 5 THEN ':00' ELSE '' END)::time;
    END IF;

    UPDATE public.business_hours
    SET 
      opens_at = coalesce(v_opens, opens_at),
      closes_at = coalesce(v_closes, closes_at),
      is_closed = coalesce(p_fechado, is_closed)
    WHERE day_of_week = v_target_day;

    IF NOT FOUND THEN
      INSERT INTO public.business_hours (day_of_week, opens_at, closes_at, is_closed)
      VALUES (v_target_day, coalesce(v_opens, '13:00:00'::time), coalesce(v_closes, '22:00:00'::time), coalesce(p_fechado, false));
    END IF;
  END IF;

  -- Busca estado atualizado do dia
  SELECT jsonb_build_object(
    'dia_semana', v_nome_dia,
    'day_of_week', bh.day_of_week,
    'opens_at', to_char(bh.opens_at, 'HH24:MI'),
    'closes_at', to_char(bh.closes_at, 'HH24:MI'),
    'is_closed', bh.is_closed,
    'store_status', (SELECT value FROM public.settings WHERE key = 'store_status')
  )
  INTO v_res
  FROM public.business_hours bh
  WHERE bh.day_of_week = v_target_day;

  RETURN jsonb_build_object(
    'sucesso', true,
    'mensagem', 'Horário atualizado com sucesso por ' || v_dono_nome || '!',
    'dados', v_res
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consultar_horarios_loja()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'store_status', (SELECT value FROM public.settings WHERE key = 'store_status'),
    'horarios', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'dia_semana', CASE bh.day_of_week
            WHEN 0 THEN 'Domingo'
            WHEN 1 THEN 'Segunda-feira'
            WHEN 2 THEN 'Terça-feira'
            WHEN 3 THEN 'Quarta-feira'
            WHEN 4 THEN 'Quinta-feira'
            WHEN 5 THEN 'Sexta-feira'
            WHEN 6 THEN 'Sábado'
          END,
          'day_of_week', bh.day_of_week,
          'opens_at', to_char(bh.opens_at, 'HH24:MI'),
          'closes_at', to_char(bh.closes_at, 'HH24:MI'),
          'is_closed', bh.is_closed
        ) ORDER BY bh.day_of_week
      )
      FROM public.business_hours bh
    )
  );
$$;
