-- =============================================================================
-- MAIS AÇAÍ SJP — 65 INSUMOS DO MULTIPEDIDOS (preços conferidos em 02/11/2026)
-- Rode no SQL Editor do Supabase do Mais Açaí DEPOIS de FINANCEIRO_MAIS_ACAI.sql
-- e de abrir o Financeiro uma vez no gestor (assim o que já foi digitado sobe antes).
-- Só acrescenta o que falta: insumo com o mesmo nome não muda. Pode rodar de novo.
-- Depois, recarregue a página do Financeiro.
-- =============================================================================

INSERT INTO public.financeiro_maisacai (id, dados)
VALUES ('principal', '{"versao": 1, "insumos": []}'::jsonb)
ON CONFLICT (id) DO NOTHING;

WITH novos(nome, categoria, unidade, qtd, preco) AS (
  VALUES
    ('Açaí natural', 'Açaí e polpas', 'g', 1000, 14.4),
    ('Açaí sabor banana', 'Açaí e polpas', 'g', 1000, 14.4),
    ('Açaí sabor morango', 'Açaí e polpas', 'g', 1000, 14.06),
    ('Cupuaçu Tradicional', 'Açaí e polpas', 'g', 1000, 14.06),
    ('Cupuaçu Cremoso', 'Cremes e mousses', 'g', 1000, 28.57),
    ('Café e cacau', 'Cremes e mousses', 'g', 1000, 24.57),
    ('Pitaya', 'Açaí e polpas', 'g', 1000, 24.57),
    ('Tapioca com coco', 'Cremes e mousses', 'g', 1000, 28.57),
    ('Creme de Paçoca', 'Cremes e mousses', 'g', 1000, 24.57),
    ('Base Milk Shake', 'Cremes e mousses', 'g', 1000, 16.77),
    ('Abacaxi', 'Frutas', 'g', 1000, 10),
    ('Amendoim', 'Complementos', 'g', 1000, 20.15),
    ('Banana', 'Frutas', 'g', 1000, 5.99),
    ('Bis extra ao leite', 'Complementos', 'un', 1, 2),
    ('Bis extra oreo', 'Complementos', 'un', 1, 2),
    ('Calda de morango', 'Caldas e coberturas', 'g', 1000, 23),
    ('Chocoball', 'Complementos', 'g', 1000, 35),
    ('Cobertura de caramelo', 'Caldas e coberturas', 'g', 1000, 15),
    ('Cobertura de chocolate', 'Caldas e coberturas', 'g', 1000, 20),
    ('Cobertura de morango', 'Caldas e coberturas', 'g', 1000, 15),
    ('Confete', 'Complementos', 'g', 1000, 32),
    ('Creme de avelã', 'Cremes e mousses', 'g', 1000, 60),
    ('Danoninho', 'Cremes e mousses', 'g', 1000, 16),
    ('Doce de leite', 'Laticínios', 'g', 1000, 20),
    ('Farinha láctea', 'Complementos', 'g', 1000, 30),
    ('Gotas de chocolate', 'Complementos', 'g', 1000, 34),
    ('Granola', 'Complementos', 'g', 1000, 20),
    ('Kinder barrinha', 'Complementos', 'un', 1, 1.54),
    ('Kinder bueno ao leite', 'Complementos', 'un', 1, 5.29),
    ('Kinder bueno white', 'Complementos', 'un', 1, 5.29),
    ('Kit kat ao leite', 'Complementos', 'un', 1, 2.5),
    ('Kit kat white', 'Complementos', 'un', 1, 2.5),
    ('Kiwi importado', 'Frutas', 'g', 1000, 20),
    ('Leite condensado', 'Laticínios', 'g', 1000, 12),
    ('Leite condensado zero lactose', 'Laticínios', 'g', 1000, 20),
    ('Leite em pó', 'Laticínios', 'g', 1000, 38),
    ('Leite em pó zero lactose', 'Laticínios', 'g', 1000, 32),
    ('Mel', 'Caldas e coberturas', 'g', 1000, 32),
    ('Morango', 'Frutas', 'g', 1000, 20),
    ('Mousse de ninho', 'Cremes e mousses', 'g', 1000, 16),
    ('Ouro branco', 'Complementos', 'un', 1, 1),
    ('Ovomaltine', 'Complementos', 'g', 1000, 35),
    ('Paçoca', 'Complementos', 'g', 1000, 26),
    ('Sonho de valsa', 'Complementos', 'un', 1, 1),
    ('Uva verde s/ semente', 'Frutas', 'g', 1000, 20),
    ('Bolacha maisena triturada', 'Complementos', 'g', 1000, 8),
    ('Leite Integral', 'Laticínios', 'ml', 1000, 7),
    ('Água mineral (suco)', 'Bebidas', 'ml', 1000, 1),
    ('Copo 330ml', 'Embalagens', 'un', 1, 0.2),
    ('Copo 440ml', 'Embalagens', 'un', 1, 0.2),
    ('Copo 550ml', 'Embalagens', 'un', 1, 0.3),
    ('Copo 770ml', 'Embalagens', 'un', 1, 0.35),
    ('Potinho adicionais 145ml', 'Embalagens', 'un', 1, 0.35),
    ('Pote 1 litro', 'Embalagens', 'un', 1, 1.2),
    ('Colher', 'Embalagens', 'un', 1, 0.2),
    ('Guardanapo', 'Embalagens', 'un', 1, 0.07),
    ('Suporte para copo', 'Embalagens', 'un', 1, 0.39),
    ('Saco delivery', 'Embalagens', 'un', 1, 0.36),
    ('Tampa Bolha', 'Embalagens', 'un', 1, 0.32),
    ('Canudo', 'Embalagens', 'un', 1, 0.1),
    ('Copo Milk Shake', 'Embalagens', 'un', 1, 0.3),
    ('Adesivo', 'Embalagens', 'un', 1, 0.25),
    ('Lacre de segurança', 'Embalagens', 'un', 1, 0.05),
    ('Cartãozinho @maisacaisjp', 'Embalagens', 'un', 1, 0.08),
    ('Sacola branca pequena', 'Embalagens', 'un', 1, 0.05)
),
faltando AS (
  SELECT jsonb_agg(jsonb_build_object(
    'id', gen_random_uuid()::text,
    'nome', n.nome,
    'categoria', n.categoria,
    'unidade', n.unidade,
    'qtdEmbalagem', n.qtd,
    'precoEmbalagem', n.preco,
    'perda', 0,
    'atualizadoEm', '2026-11-02'
  )) AS lista
  FROM novos n
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.financeiro_maisacai f, jsonb_array_elements(COALESCE(f.dados->'insumos', '[]'::jsonb)) i
    WHERE f.id = 'principal' AND lower(trim(i->>'nome')) = lower(trim(n.nome))
  )
)
UPDATE public.financeiro_maisacai f
SET dados = jsonb_set(f.dados, '{insumos}', COALESCE(f.dados->'insumos', '[]'::jsonb) || faltando.lista),
    updated_at = now()
FROM faltando
WHERE f.id = 'principal' AND faltando.lista IS NOT NULL;

-- Conferência: deve mostrar pelo menos 65 insumos.
SELECT jsonb_array_length(dados->'insumos') AS insumos FROM public.financeiro_maisacai WHERE id = 'principal';
