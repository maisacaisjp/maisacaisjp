-- =============================================================================
-- MAIS AÇAÍ SJP — FICHA TÉCNICA & CMV + FIDELIDADE (CASHBACK)
-- Rode no SQL Editor do Supabase do Mais Açaí. Pode rodar mais de uma vez.
-- =============================================================================

-- 1. Insumos (polpas, frutas, cremes, embalagens...)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  purchase_unit TEXT NOT NULL DEFAULT 'kg',
  purchase_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  purchase_quantity NUMERIC(10, 3) NOT NULL DEFAULT 1.000,
  usage_unit TEXT NOT NULL DEFAULT 'g',
  cost_per_usage_unit NUMERIC(10, 5) NOT NULL DEFAULT 0.00000,
  supplier TEXT,
  current_stock NUMERIC(10, 3),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Fichas técnicas (receita por produto e tamanho)
CREATE TABLE IF NOT EXISTS public.product_recipes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'G',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  packaging_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  fixed_overhead NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT product_recipes_unique_product_size UNIQUE (product_id, size)
);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full access recipe_ingredients" ON public.recipe_ingredients;
CREATE POLICY "Full access recipe_ingredients" ON public.recipe_ingredients FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Full access product_recipes" ON public.product_recipes;
CREATE POLICY "Full access product_recipes" ON public.product_recipes FOR ALL USING (true) WITH CHECK (true);

-- 3. Cashback: configuração padrão (5%, ativado). Os saldos dos clientes ficam
--    em settings com a chave cashback_balance_<telefone>.
INSERT INTO public.settings (key, value)
VALUES ('cashback_enabled', '"true"'::jsonb), ('cashback_percent', '"5"'::jsonb)
ON CONFLICT (key) DO NOTHING;
