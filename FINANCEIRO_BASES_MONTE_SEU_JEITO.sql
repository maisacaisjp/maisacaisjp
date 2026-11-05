-- MAIS AÇAÍ SJP — BASES DOS 6 TAMANHOS, FICHAS "MONTE DO SEU JEITO" E CUSTO DE ENTREGA
-- Rode depois dos 65 insumos. Pode rodar de novo: refaz as 6 bases e não duplica fichas.
WITH r AS (
  SELECT dados FROM public.financeiro_maisacai WHERE id = 'principal'
),
ins AS (
  SELECT i->>'nome' AS nome, i->>'id' AS id
  FROM r, jsonb_array_elements(r.dados->'insumos') i
),
linhas(base_id, insumo, qtd) AS (
  VALUES
    ('base-p', 'Açaí natural', 300), ('base-p', 'Copo 330ml', 1), ('base-p', 'Tampa Bolha', 1), ('base-p', 'Colher', 1), ('base-p', 'Guardanapo', 2),
    ('base-m', 'Açaí natural', 400), ('base-m', 'Copo 440ml', 1), ('base-m', 'Tampa Bolha', 1), ('base-m', 'Colher', 1), ('base-m', 'Guardanapo', 2),
    ('base-g', 'Açaí natural', 500), ('base-g', 'Copo 550ml', 1), ('base-g', 'Tampa Bolha', 1), ('base-g', 'Colher', 1), ('base-g', 'Guardanapo', 2),
    ('base-770', 'Açaí natural', 750), ('base-770', 'Copo 770ml', 1), ('base-770', 'Tampa Bolha', 1), ('base-770', 'Colher', 1), ('base-770', 'Guardanapo', 2),
    -- O preço do pote já inclui a tampa
    ('base-1l', 'Açaí natural', 1050), ('base-1l', 'Pote 1 litro', 1), ('base-1l', 'Colher', 1), ('base-1l', 'Guardanapo', 2),
    ('base-2l', 'Açaí natural', 2100), ('base-2l', 'Pote 1 litro', 2), ('base-2l', 'Colher', 1), ('base-2l', 'Guardanapo', 2)
),
produtos(base_id, nome_base, produto_id, nome, preco) AS (
  VALUES
    ('base-p', 'Base copo 330ml', 'acai-54319', '330ML - COPO PEQUENO', 16.0),
    ('base-m', 'Base copo 440ml', 'acai-54400', '440ML - COPO MÉDIO', 20.0),
    ('base-g', 'Base copo 550ml', 'acai-54401', '550ML - COPO GRANDE', 24.0),
    ('base-770', 'Base copo 770ml', 'acai-54402', '770ML - COPO GIGANTE', 32.0),
    ('base-1l', 'Base pote 1 litro', 'acai-54403', '1 LITRO', 39.9),
    ('base-2l', 'Base 2 litros (2 potes)', 'acai-54404', '2 LITROS', 76.0)
),
itens AS (
  SELECT l.base_id, jsonb_agg(jsonb_build_object(
    'id', gen_random_uuid()::text, 'tipo', 'insumo', 'refId', ins.id, 'qtd', l.qtd
  )) AS lista
  FROM linhas l JOIN ins ON ins.nome = l.insumo
  GROUP BY l.base_id
),
novas_bases AS (
  SELECT jsonb_agg(jsonb_build_object('id', p.base_id, 'nome', p.nome_base, 'itens', it.lista)) AS lista
  FROM produtos p JOIN itens it ON it.base_id = p.base_id
),
outras_bases AS (
  SELECT COALESCE(jsonb_agg(b), '[]'::jsonb) AS lista
  FROM r, jsonb_array_elements(COALESCE(r.dados->'bases', '[]'::jsonb)) b
  WHERE b->>'id' NOT IN ('base-p', 'base-m', 'base-g', 'base-770', 'base-1l', 'base-2l')
),
novas_fichas AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', gen_random_uuid()::text,
    'nome', p.nome,
    'produtoId', p.produto_id,
    'categoria', 'monte-do-seu-jeito',
    'tipo', 'unico',
    'baseIds', jsonb_build_object('U', p.base_id),
    'recheio', '[]'::jsonb,
    'precos', jsonb_build_object('U', p.preco)
  )), '[]'::jsonb) AS lista
  FROM produtos p
  WHERE NOT EXISTS (
    SELECT 1 FROM r, jsonb_array_elements(COALESCE(r.dados->'fichas', '[]'::jsonb)) x
    WHERE x->>'produtoId' = p.produto_id
  )
)
UPDATE public.financeiro_maisacai f
SET dados = f.dados || jsonb_build_object(
      'bases', outras_bases.lista || novas_bases.lista,
      'fichas', COALESCE(f.dados->'fichas', '[]'::jsonb) || novas_fichas.lista,
      'config', COALESCE(f.dados->'config', '{}'::jsonb) || '{"custoPorEntrega": 0.66}'::jsonb
    ),
    updated_at = now()
FROM novas_bases, outras_bases, novas_fichas
WHERE f.id = 'principal';

-- Conferência: deve mostrar 6 bases (copos com 5 itens, potes com 4) e 6 fichas do monte do seu jeito.
SELECT b->>'nome' AS base,
       jsonb_array_length(b->'itens') AS itens,
       (SELECT count(*) FROM jsonb_array_elements(f.dados->'fichas') x WHERE x->>'categoria' = 'monte-do-seu-jeito') AS fichas
FROM public.financeiro_maisacai f, jsonb_array_elements(f.dados->'bases') b
WHERE f.id = 'principal' AND b->>'id' IN ('base-p', 'base-m', 'base-g', 'base-770', 'base-1l', 'base-2l');
