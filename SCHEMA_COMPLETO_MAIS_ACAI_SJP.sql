-- ==============================================================================
-- SCHEMA COMPLETO & DADOS INICIAIS - MAIS AÇAÍ SJP
-- Execute este script completo no SQL Editor do seu projeto Supabase
-- ==============================================================================

-- 1. Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  display_group TEXT,
  display_label TEXT,
  display_sub TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela MENU_ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ingredients TEXT,
  category TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  price_single NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  price_p NUMERIC(10,2),
  price_m NUMERIC(10,2),
  price_g NUMERIC(10,2),
  price_big NUMERIC(10,2),
  price_super_big NUMERIC(10,2),
  image_url TEXT,
  day_of_week INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  is_bestseller BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela PAUSED_ITEMS (Pausar item temporariamente no PDV)
CREATE TABLE IF NOT EXISTS public.paused_items (
  id TEXT PRIMARY KEY REFERENCES public.menu_items(id) ON DELETE CASCADE,
  paused_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabelas de EXTRAS & GRUPOS DE ADICIONAIS
CREATE TABLE IF NOT EXISTS public.extra_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  selection_type TEXT NOT NULL DEFAULT 'multiple',
  min_select INT NOT NULL DEFAULT 0,
  max_select INT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.extras (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  group_id UUID REFERENCES public.extra_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.category_extra_groups (
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.extra_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, group_id)
);

-- 6. Tabela SETTINGS
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Tabela DELIVERY_ZONES (Bairros de São José dos Pinhais)
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0
);

-- 8. Tabela BUSINESS_HOURS (Horários de funcionamento)
CREATE TABLE IF NOT EXISTS public.business_hours (
  day_of_week INT PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at TIME,
  closes_at TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false
);

-- 9. Tabela CUSTOMERS (CRM de clientes)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  notes TEXT,
  total_orders INT NOT NULL DEFAULT 0,
  total_spent NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Tabela CASH_SESSIONS (Sessões de Caixa)
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  opening_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  closing_counted_amount NUMERIC(10,2),
  expected_amount NUMERIC(10,2),
  difference NUMERIC(10,2),
  opened_by UUID,
  closed_by UUID,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- 11. Tabela CASH_MOVEMENTS (Sangria e Suprimento)
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id TEXT PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sangria', 'suprimento')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Tabela EXPENSES (Despesas do Estabelecimento)
CREATE TABLE IF NOT EXISTS public.expenses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Tabela ORDERS (Pedidos)
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cash_session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_id UUID REFERENCES public.customers(id),
  order_type TEXT NOT NULL DEFAULT 'Delivery',
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  status TEXT NOT NULL DEFAULT 'Pendente',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  delivery_address TEXT,
  delivery_zone TEXT,
  change_for TEXT,
  nif TEXT,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  tracking_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Tabela PROFILES (Perfis de Usuários do Painel)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'atendente', 'cozinha')),
  full_name TEXT,
  permissions JSONB NOT NULL DEFAULT '{"ver_pedidos": true, "gerenciar_caixa": true, "gerenciar_produtos": true, "gerenciar_categorias": true, "ver_relatorios": true, "ver_clientes": true, "gerenciar_configuracoes": true, "gerenciar_usuarios": true}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Tabela ANALYTICS_EVENTS
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_name TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- FUNÇÕES RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_order_by_tracking_code(p_code TEXT)
RETURNS TABLE (
  id BIGINT,
  status TEXT,
  order_type TEXT,
  payment_method TEXT,
  total_amount NUMERIC,
  items JSONB,
  created_at TIMESTAMPTZ,
  customer_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT o.id, o.status, o.order_type, o.payment_method,
         o.total_amount, o.items, o.created_at, o.customer_name
  FROM public.orders o
  WHERE o.tracking_code = p_code;
$$;

REVOKE ALL ON FUNCTION public.get_order_by_tracking_code(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.get_order_by_tracking_code(TEXT) TO anon, authenticated;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paused_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_extra_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de leitura
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public read menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Public read paused_items" ON public.paused_items FOR SELECT USING (true);
CREATE POLICY "Public read extra_groups" ON public.extra_groups FOR SELECT USING (true);
CREATE POLICY "Public read extras" ON public.extras FOR SELECT USING (true);
CREATE POLICY "Public read category_extra_groups" ON public.category_extra_groups FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public read delivery_zones" ON public.delivery_zones FOR SELECT USING (true);
CREATE POLICY "Public read business_hours" ON public.business_hours FOR SELECT USING (true);

-- Permissões de escrita para Clientes e Checkout Público
CREATE POLICY "Public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert analytics" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Public upsert customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- Permissões gerais autenticadas e anônimas para o painel / operacao local
CREATE POLICY "Full access categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access menu_items" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access paused_items" ON public.paused_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access extras" ON public.extras FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access extra_groups" ON public.extra_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access category_extra_groups" ON public.category_extra_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access delivery_zones" ON public.delivery_zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access business_hours" ON public.business_hours FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access cash_sessions" ON public.cash_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access cash_movements" ON public.cash_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- DADOS INICIAIS (SEED) - MAIS AÇAÍ SJP
-- ==============================================================================

-- 1. Inserir Categorias
INSERT INTO public.categories (id, name, order_index, icon, is_active)
VALUES ('novidades', 'Novidades', 2, 'Sparkles', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, order_index = EXCLUDED.order_index;
INSERT INTO public.categories (id, name, order_index, icon, is_active)
VALUES ('mais-vendidos', 'Mais Vendidos', 1, 'Flame', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, order_index = EXCLUDED.order_index;
INSERT INTO public.categories (id, name, order_index, icon, is_active)
VALUES ('monte-do-seu-jeito', 'Monte do seu jeito', 3, 'Layers', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, order_index = EXCLUDED.order_index;
INSERT INTO public.categories (id, name, order_index, icon, is_active)
VALUES ('combos-especiais', 'Combos especiais', 4, 'Heart', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, order_index = EXCLUDED.order_index;
INSERT INTO public.categories (id, name, order_index, icon, is_active)
VALUES ('kits-promocionais', 'Kits Promocionais', 5, 'Tag', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, order_index = EXCLUDED.order_index;
INSERT INTO public.categories (id, name, order_index, icon, is_active)
VALUES ('milkshakes', 'Milkshakes', 6, 'Coffee', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, order_index = EXCLUDED.order_index;
INSERT INTO public.categories (id, name, order_index, icon, is_active)
VALUES ('bebidas', 'Bebidas Diversas', 7, 'Wine', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, order_index = EXCLUDED.order_index;

-- 2. Inserir Bairros de São José dos Pinhais
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Parque da Fonte', 0, 1, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Afonso Pena', 5, 2, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Águas Belas', 5, 3, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Boneca do Iguaçu', 6, 4, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Centro (SJP)', 6, 5, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Aristocrata', 7, 6, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Bom Jesus', 7, 7, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Cruzeiro', 7, 8, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('São Pedro', 7, 9, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Guatupê', 8, 10, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Iná', 8, 11, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Rio Pequeno', 8, 12, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('São Cristóvão', 8, 13, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Academia', 9, 14, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Costeira', 9, 15, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;
INSERT INTO public.delivery_zones (name, fee, sort_order, is_active)
VALUES ('Quississana', 10, 16, true)
ON CONFLICT (name) DO UPDATE SET fee = EXCLUDED.fee;

-- 3. Inserir Horários de Funcionamento (Seg-Dom: 13:00 às 22:00)
INSERT INTO public.business_hours (day_of_week, opens_at, closes_at, is_closed)
VALUES (0, '13:00', '22:00', false)
ON CONFLICT (day_of_week) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at;
INSERT INTO public.business_hours (day_of_week, opens_at, closes_at, is_closed)
VALUES (1, '13:00', '22:00', false)
ON CONFLICT (day_of_week) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at;
INSERT INTO public.business_hours (day_of_week, opens_at, closes_at, is_closed)
VALUES (2, '13:00', '22:00', false)
ON CONFLICT (day_of_week) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at;
INSERT INTO public.business_hours (day_of_week, opens_at, closes_at, is_closed)
VALUES (3, '13:00', '22:00', false)
ON CONFLICT (day_of_week) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at;
INSERT INTO public.business_hours (day_of_week, opens_at, closes_at, is_closed)
VALUES (4, '13:00', '22:00', false)
ON CONFLICT (day_of_week) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at;
INSERT INTO public.business_hours (day_of_week, opens_at, closes_at, is_closed)
VALUES (5, '13:00', '22:00', false)
ON CONFLICT (day_of_week) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at;
INSERT INTO public.business_hours (day_of_week, opens_at, closes_at, is_closed)
VALUES (6, '13:00', '22:00', false)
ON CONFLICT (day_of_week) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at;

-- 4. Inserir Configurações do Estabelecimento
INSERT INTO public.settings (key, value)
VALUES ('company_name', '"Mais Açaí - Desde 2016"'::JSONB)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key, value)
VALUES ('company_address', '"Rua Almirante Alexandrino, 909 sala 02 - Parque da Fonte, São José dos Pinhais - PR"'::JSONB)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key, value)
VALUES ('whatsapp_number', '"5541997349076"'::JSONB)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key, value)
VALUES ('delivery_time_estimate', '"35 a 50 min"'::JSONB)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key, value)
VALUES ('pickup_time_estimate', '"15 a 25 min"'::JSONB)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key, value)
VALUES ('delivery_min_order', '15'::JSONB)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key, value)
VALUES ('free_delivery_threshold', '50'::JSONB)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key, value)
VALUES ('store_status', '"open"'::JSONB)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key, value)
VALUES ('manual_store_closed', 'false'::JSONB)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.settings (key, value)
VALUES ('paused_until', '""'::JSONB)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 5. Inserir Adicionais (38 Toppings de Açaí)
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-3637089', 'CARIBE BUENO', 10, 1, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-4143417', 'CUBINHOS DE BROWNIE', 6, 2, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-3118515', 'CREME RAFFAELLO', 10, 3, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069310', 'BANANA', 4, 4, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069312', 'MORANGO', 6, 5, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069311', 'KIWI IMPORTADO', 4, 6, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069313', 'UVA VERDE S/ SEMENTE', 4, 7, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069309', 'ABACAXI', 4, 8, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069323', 'CALDA DE MORANGO COM PEDAÇOS', 6, 9, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069330', 'LEITE CONDENSADO', 4, 10, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069320', 'LEITE EM PÓ', 4, 11, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069328', 'NUTELLA', 10, 12, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069314', 'DANONINHO CASEIRO', 6, 13, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069315', 'MOUSSE DE NINHO', 6, 14, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069322', 'PAÇOCA', 4, 15, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069319', 'GRANOLA', 4, 16, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069316', 'AMENDOIM', 4, 17, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069317', 'CHOCOBALL', 4, 18, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069318', 'FARINHA LÁCTEA', 4, 19, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069325', 'COBERTURA DE CARAMELO', 3, 20, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069326', 'COBERTURA DE CHOCOLATE', 3, 21, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069327', 'COBERTURA DE MORANGO', 3, 22, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069329', 'DOCE DE LEITE', 4, 23, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069331', 'LEITE CONDENSADO ZERO LACTOSE', 4, 24, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069321', 'LEITE EM PÓ ZERO LACTOSE', 4, 25, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069332', 'MEL', 4, 26, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069333', 'OVOMALTINE', 6, 27, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069334', 'BIS EXTRA AO LEITE', 6, 28, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069335', 'BIS EXTRA OREO', 6, 29, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069336', 'CONFETE', 4, 30, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069337', 'GOTAS DE CHOCOLATE', 4, 31, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069338', 'KINDER BARRINHA', 6, 32, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069339', 'KINDER BUENO AO LEITE', 10, 33, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069340', 'KINDER BUENO WHITE', 10, 34, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069341', 'KIT KAT AO LEITE', 6, 35, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069342', 'KIT KAT WHITE', 6, 36, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069343', 'OURO BRANCO', 4, 37, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
INSERT INTO public.extras (id, name, price, sort_order, is_active)
VALUES ('ex-2069344', 'SONHO DE VALSA', 4, 38, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;

-- 6. Inserir Produtos Reais do Mais Açaí (82 itens)
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-1371881',
  'COMBO MAGNÍFICO BROWNIE',
  'Açaí com nutella, mousse de ninho e pedacinhos de brownie.',
  'novidades',
  30,
  30,
  34,
  38,
  '/produtos/acai-1371881.webp',
  1,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54163',
  'COMBO NEVADO',
  'Açaí com leite condensado e leite em pó.',
  'mais-vendidos',
  22,
  22,
  26,
  30,
  '/produtos/acai-54163.webp',
  2,
  true,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54181',
  'COMBO FAVORITO',
  'Açaí com banana, morango, leite condensado e leite em pó.',
  'mais-vendidos',
  24,
  24,
  28,
  32,
  '/produtos/acai-54181.webp',
  3,
  true,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54176',
  'COMBO TROPICAL',
  'Açaí com banana, kiwi e morango.',
  'mais-vendidos',
  24,
  24,
  28,
  32,
  '/produtos/acai-54176.webp',
  4,
  true,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54151',
  'COMBO BRANCA DE NEVE',
  'Açaí com mousse de ninho, leite condensado e leite em pó.',
  'mais-vendidos',
  26,
  26,
  30,
  34,
  '/produtos/acai-54151.webp',
  5,
  true,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-439358',
  'COMBO SENSAÇÃO AVELÃ',
  'Açaí com nutella, leite condensado e leite em pó.',
  'mais-vendidos',
  30,
  30,
  34,
  38,
  '/produtos/acai-439358.webp',
  6,
  true,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-56853',
  'KIT 1 LITRO',
  'Descrição do kit: 1 litro de açaí natural, 1 adicional de leite condensado, 1 adicional de leite em pó, 1 adicional de morangos selecionados.',
  'kits-promocionais',
  49.9,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-56853.webp',
  7,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-92071',
  'KIT 2 LITROS',
  'Descrição do kit: 2 litros de açaí natural, 1 adicional de leite condensado, 1 adicional de leite em pó, 1 adicional de granola, 1 adicional de banana, 1 adicional de morangos selecionados.',
  'kits-promocionais',
  79.9,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-92071.webp',
  8,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-1413950',
  'KIT FESTA',
  'Descrição do kit: 3 litros de açaí natural, 1 adicional de morangos selecionados (copo 330ml), 1 adicional de banana (copo 330ml), 1 adicional de leite condensado, 1 adicional de leite em pó, 1 adicional de danoninho caseiro, 1 adicional de mousse de ninho, 1 adicional de granola, 1 adicional de confete.',
  'kits-promocionais',
  129.9,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-1413950.webp',
  9,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54319',
  '330ML - COPO PEQUENO',
  'Copo de 330ml de açaí para montar do seu jeito: escolha os adicionais que quiser.',
  'monte-do-seu-jeito',
  16,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-54319.webp',
  10,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54400',
  '440ML - COPO MÉDIO',
  'Copo de 440ml de açaí para montar do seu jeito: escolha os adicionais que quiser.',
  'monte-do-seu-jeito',
  20,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-54400.webp',
  11,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54401',
  '550ML - COPO GRANDE',
  'Copo de 550ml de açaí para montar do seu jeito: escolha os adicionais que quiser.',
  'monte-do-seu-jeito',
  24,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-54401.webp',
  12,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54402',
  '770ML - COPO GIGANTE',
  'Copo de 770ml de açaí para montar do seu jeito: escolha os adicionais que quiser.',
  'monte-do-seu-jeito',
  32,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-54402.webp',
  13,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54403',
  '1 LITRO',
  'Pote de 1 litro de açaí para montar do seu jeito: escolha os adicionais que quiser.',
  'monte-do-seu-jeito',
  39.9,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-54403.webp',
  14,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54404',
  '2 LITROS',
  'Pote de 2 litros de açaí para montar do seu jeito, ideal para dividir.',
  'monte-do-seu-jeito',
  76,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-54404.webp',
  15,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-352382',
  'COMBO SENSAÇÃO ABACAXI',
  'Açaí com abacaxi, leite condensado e leite em pó.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-352382.webp',
  16,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-352381',
  'COMBO SENSAÇÃO BANANA',
  'Açaí com banana, leite condensado e leite em pó.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-352381.webp',
  17,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-352385',
  'COMBO SENSAÇÃO KIWI',
  'Açaí com leite condensado, leite em pó e kiwi importado.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-352385.webp',
  18,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54167',
  'COMBO SENSAÇÃO MORANGO',
  'Açaí com morango, leite condensado e leite em pó.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-54167.webp',
  19,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-352386',
  'COMBO SENSAÇÃO UVA',
  'Açaí com leite condensado, leite em pó e uva verde sem semente.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-352386.webp',
  20,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-478904',
  'COMBO DANONINHO ABACAXI',
  'Açaí com danoninho caseiro, leite em pó e abacaxi.',
  'combos-especiais',
  26,
  26,
  30,
  34,
  '/produtos/acai-478904.webp',
  21,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-478901',
  'COMBO DANONINHO BANANA',
  'Açaí com danoninho caseiro, leite em pó e banana.',
  'combos-especiais',
  26,
  26,
  30,
  34,
  '/produtos/acai-478901.webp',
  22,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-478942',
  'COMBO DANONINHO KIWI',
  'Açaí com danoninho caseiro, leite em pó e kiwi importado.',
  'combos-especiais',
  26,
  26,
  30,
  34,
  '/produtos/acai-478942.webp',
  23,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54153',
  'COMBO DANONINHO MORANGO',
  'Açaí com danoninho caseiro, leite em pó e morango.',
  'combos-especiais',
  26,
  26,
  30,
  34,
  '/produtos/acai-54153.webp',
  24,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-478966',
  'COMBO DANONINHO UVA',
  'Açaí com danoninho caseiro, leite em pó e uva verde sem semente.',
  'combos-especiais',
  26,
  26,
  30,
  34,
  '/produtos/acai-478966.webp',
  25,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54164',
  'COMBO NINHO',
  'Açaí com leite em pó e mousse de ninho.',
  'combos-especiais',
  26,
  26,
  30,
  34,
  '/produtos/acai-54164.webp',
  26,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-478973',
  'COMBO NINHO ABACAXI',
  'Açaí com mousse de ninho, leite em pó e abacaxi.',
  'combos-especiais',
  26,
  26,
  30,
  34,
  '/produtos/acai-478973.webp',
  27,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-479052',
  'COMBO NINHO BANANA',
  'Açaí com mousse de ninho, leite em pó e banana.',
  'combos-especiais',
  26,
  26,
  30,
  34,
  '/produtos/acai-479052.webp',
  28,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-485900',
  'COMBO NINHO KIWI',
  'Açaí com mousse de ninho, leite em pó e kiwi importado.',
  'combos-especiais',
  26,
  26,
  30,
  34,
  '/produtos/acai-485900.webp',
  29,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-485909',
  'COMBO NINHO MORANGO',
  'Açaí com mousse de ninho, leite em pó e morango.',
  'combos-especiais',
  26,
  26,
  30,
  34,
  '/produtos/acai-485909.webp',
  30,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-485911',
  'COMBO NINHO UVA',
  'Açaí com mousse de ninho, leite em pó e uva verde sem semente.',
  'combos-especiais',
  26,
  26,
  30,
  34,
  '/produtos/acai-485911.webp',
  31,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-352460',
  'COMBO MAGNÍFICO ABACAXI',
  'Açaí com nutella, mousse de ninho e abacaxi.',
  'combos-especiais',
  30,
  30,
  34,
  38,
  '/produtos/acai-352460.webp',
  32,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54175',
  'COMBO MAGNÍFICO BANANA',
  'Açaí com nutella, mousse de ninho e banana.',
  'combos-especiais',
  30,
  30,
  34,
  38,
  '/produtos/acai-54175.webp',
  33,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-352462',
  'COMBO MAGNÍFICO KIWI',
  'Açaí com nutella, mousse de ninho e kiwi importado.',
  'combos-especiais',
  30,
  30,
  34,
  38,
  '/produtos/acai-352462.webp',
  34,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-352463',
  'COMBO MAGNÍFICO MORANGO',
  'Açaí com nutella, mousse de ninho e morango.',
  'combos-especiais',
  30,
  30,
  34,
  38,
  '/produtos/acai-352463.webp',
  35,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-352466',
  'COMBO MAGNÍFICO UVA',
  'Açaí com nutella, mousse de ninho e uva verde sem semente.',
  'combos-especiais',
  30,
  30,
  34,
  38,
  '/produtos/acai-352466.webp',
  36,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-352489',
  'COMBO TRADICIONAL ABACAXI',
  'Açaí com abacaxi, granola e mel.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-352489.webp',
  37,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-352498',
  'COMBO TRADICIONAL BANANA',
  'Açaí com banana, granola e mel.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-352498.webp',
  38,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-352502',
  'COMBO TRADICIONAL KIWI',
  'Açaí com kiwi importado, granola e mel.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-352502.webp',
  39,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54162',
  'COMBO TRADICIONAL MORANGO',
  'Açaí com morango, granola e mel.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-54162.webp',
  40,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-352504',
  'COMBO TRADICIONAL UVA',
  'Açaí com uva verde sem semente, granola e mel.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-352504.webp',
  41,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54168',
  'COMBO SENSAÇÃO AMENDOIM',
  'Açaí com amendoim, leite condensado e leite em pó.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-54168.webp',
  42,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54170',
  'COMBO SENSAÇÃO GRANOLA',
  'Açaí com granola, leite condensado e leite em pó.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-54170.webp',
  43,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54172',
  'COMBO SENSAÇÃO PAÇOCA',
  'Açaí com paçoca, leite condensado e leite em pó.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-54172.webp',
  44,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54171',
  'COMBO SENSAÇÃO OVOMALTINE',
  'Açaí com ovomaltine, leite condensado e leite em pó.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-54171.webp',
  45,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54148',
  'COMBO BANOFFEE',
  'Açaí com bolacha maizena triturada, banana, doce de leite e mousse de ninho.',
  'combos-especiais',
  26,
  26,
  30,
  34,
  '/produtos/acai-54148.webp',
  46,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54149',
  'COMBO BIS AO LEITE',
  'Açaí com bis xtra ao leite e nutella.',
  'combos-especiais',
  28,
  28,
  32,
  36,
  '/produtos/acai-54149.webp',
  47,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54150',
  'COMBO BIS OREO',
  'Açaí com bis xtra oreo e mousse de ninho.',
  'combos-especiais',
  28,
  28,
  32,
  36,
  '/produtos/acai-54150.webp',
  48,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54158',
  'COMBO BUENO AO LEITE',
  'Açaí com kinder bueno ao leite e nutella.',
  'combos-especiais',
  32,
  32,
  36,
  40,
  '/produtos/acai-54158.webp',
  49,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54159',
  'COMBO BUENO BRANCO',
  'Açaí com kinder bueno white e mousse de ninho.',
  'combos-especiais',
  32,
  32,
  36,
  40,
  '/produtos/acai-54159.webp',
  50,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54152',
  'COMBO CHOCOBALL',
  'Açaí com chocoball, nutella e mousse de ninho.',
  'combos-especiais',
  30,
  30,
  34,
  38,
  '/produtos/acai-54152.webp',
  51,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54156',
  'COMBO KIDS',
  'Açaí com confete e danoninho caseiro.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-54156.webp',
  52,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54157',
  'COMBO KINDER',
  'Açaí com kinder barrinha, leite condensado e leite em pó.',
  'combos-especiais',
  28,
  28,
  32,
  36,
  '/produtos/acai-54157.webp',
  53,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54160',
  'COMBO KIT KAT AO LEITE',
  'Açaí com kit kat ao leite e nutella.',
  'combos-especiais',
  28,
  28,
  32,
  36,
  '/produtos/acai-54160.webp',
  54,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54161',
  'COMBO KIT KAT BRANCO',
  'Açaí com kit kat white e mouse de ninho.',
  'combos-especiais',
  28,
  28,
  32,
  36,
  '/produtos/acai-54161.webp',
  55,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54174',
  'COMBO TENTAÇÃO',
  'Açaí com calda de morango e mousse de ninho.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-54174.webp',
  56,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-808184',
  'COMBO TENTAÇÃO 2',
  'Açaí com calda de morango e danoninho caseiro.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-808184.webp',
  57,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54165',
  'COMBO OVOMALTINE',
  'Açaí com cobertura de chocolate e ovomaltine.',
  'combos-especiais',
  24,
  24,
  28,
  32,
  '/produtos/acai-54165.webp',
  58,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-54177',
  'COMBO TROPICAL ESPECIAL',
  'Açaí com abacaxi, banana, kiwi, morango e uva.',
  'combos-especiais',
  28,
  28,
  32,
  36,
  '/produtos/acai-54177.webp',
  59,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-410262',
  'MILKSHAKE DE AÇAÍ 550ML',
  'Refrescância + cremosidade + energia = essa delícia aqui! Nosso milkshake de açaí é a combinação perfeita do sabor marcante do açaí com a cremosidade gelada que você ama.',
  'milkshakes',
  20,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-410262.webp',
  60,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-491982',
  'MILKSHAKE DE CUPUAÇU 550ML',
  'Cremoso, gelado e com o azedinho tropical na medida. Refrescante, exótico e perfeito pra quem quer sair do óbvio.',
  'milkshakes',
  20,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-491982.webp',
  61,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-763012',
  'MILKSHAKE DE CHOCOLATE 550ML',
  'O clássico que nunca falha pra matar a vontade de doce.',
  'milkshakes',
  20,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-763012.webp',
  62,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-410263',
  'MILKSHAKE DE MORANGO 550ML',
  'Cremoso, gelado e com aquele sabor doce e levemente ácido que conquista fácil. Clássico, refrescante e impossível de errar.',
  'milkshakes',
  20,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-410263.webp',
  63,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-410267',
  'MILKSHAKE DE PAÇOCA 550ML',
  'Cremoso, gelado e cheio de personalidade. Sabor intenso de amendoim com doce na medida certa pra quem ama um clássico brasileiro irresistível.',
  'milkshakes',
  20,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-410267.webp',
  64,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-453594',
  'MILKSHAKE DE LEITE NINHO 550ML',
  'Cremoso, gelado e com aquele sabor suave e viciante que derrete na boca. Doce na medida certa pra quem ama um clássico irresistível.',
  'milkshakes',
  22,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-453594.webp',
  65,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-410264',
  'MILKSHAKE DE OVOMALTINE 550ML',
  'Cremoso, gelado e com a crocância marcante que faz toda a diferença. Intenso, indulgente e simplesmente viciante.',
  'milkshakes',
  22,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-410264.webp',
  66,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-453595',
  'MILKSHAKE DE NUTELLA 550ML',
  'Cremoso, gelado e absurdamente indulgente. Sabor intenso de chocolate com avelã pra quem não abre mão de um doce marcante e irresistível.',
  'milkshakes',
  24,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-453595.webp',
  67,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-1120900',
  'MILKSHAKE DE NINHO COM NUTELLA 550ML',
  'Cremoso, gelado e simplesmente perfeito. A suavidade do Ninho com o toque intenso da Nutella em uma combinação irresistível.',
  'milkshakes',
  24,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-1120900.webp',
  68,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-1263308',
  'MILKSHAKE DE NINHO COM MORANGO 550ML',
  'Cremoso, gelado e equilibrado na medida. A suavidade do Ninho com o frescor do morango em uma combinação leve e irresistível.',
  'milkshakes',
  24,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-1263308.webp',
  69,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-953067',
  'MILKSHAKE DE DOCE DE LEITE COM PAÇOCA 550ML',
  'Cremoso, gelado e bem brasileiro. A doçura do doce de leite com o sabor intenso da paçoca em uma combinação rica e irresistível.',
  'milkshakes',
  24,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-953067.webp',
  70,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-1422806',
  'Leve 2 MilkShakes com Super Desconto',
  'Preço especial para o pedido em dupla!',
  'milkshakes',
  39.9,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-1422806.webp',
  71,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-453604',
  'SUCO DE AÇAÍ 550ML',
  'Suco de açaí bem geladinho, copo de 550ml.',
  'bebidas',
  10,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-453604.webp',
  72,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-1263223',
  'SUCO DE AÇAÍ COM ABACAXI 550ML',
  'Suco de açaí com abacaxi bem geladinho, copo de 550ml.',
  'bebidas',
  10,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-1263223.webp',
  73,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-453609',
  'SUCO DE AÇAÍ COM MORANGO 550ML',
  'Suco de açaí com morango bem geladinho, copo de 550ml.',
  'bebidas',
  10,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-453609.webp',
  74,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-500046',
  'SUCO DE CUPUAÇU 550ML',
  'Suco de cupuaçu bem geladinho, copo de 550ml.',
  'bebidas',
  10,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-500046.webp',
  75,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-453637',
  'SUCO DE MORANGO 550ML',
  'Suco de morango bem geladinho, copo de 550ml.',
  'bebidas',
  10,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-453637.webp',
  76,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-1263230',
  'VITAMINA 550ML',
  'Açaí, banana, morango, leite condensado, leite em pó e leite integral.',
  'bebidas',
  20,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-1263230.webp',
  77,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-154813',
  'ÁGUA MINERAL SEM GÁS',
  'Água mineral sem gás, geladinha.',
  'bebidas',
  4,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-154813.webp',
  78,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-154814',
  'ÁGUA MINERAL COM GÁS',
  'Água mineral com gás, geladinha.',
  'bebidas',
  4,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-154814.webp',
  79,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-436274',
  'COCA-COLA LATA',
  'Coca-Cola tradicional em lata, geladinha.',
  'bebidas',
  6,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-436274.webp',
  80,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-436275',
  'GUARANÁ LATA',
  'Guaraná em lata, geladinho.',
  'bebidas',
  6,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-436275.webp',
  81,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;
INSERT INTO public.menu_items (
  id, name, ingredients, category, price_single, price_p, price_m, price_g, image_url, sort_order, is_bestseller, is_active
) VALUES (
  'acai-436276',
  'SPRITE LATA',
  'Sprite em lata, geladinha.',
  'bebidas',
  6,
  NULL,
  NULL,
  NULL,
  '/produtos/acai-436276.webp',
  82,
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ingredients = EXCLUDED.ingredients,
  price_single = EXCLUDED.price_single,
  image_url = EXCLUDED.image_url;

-- =============================================================================
-- STORAGE: bucket público de imagens (produtos, banners e logo do painel)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('cardapio-maisacai', 'cardapio-maisacai', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "cardapio_maisacai_leitura_publica" ON storage.objects;
CREATE POLICY "cardapio_maisacai_leitura_publica" ON storage.objects
  FOR SELECT USING (bucket_id = 'cardapio-maisacai');

DROP POLICY IF EXISTS "cardapio_maisacai_upload_autenticado" ON storage.objects;
CREATE POLICY "cardapio_maisacai_upload_autenticado" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cardapio-maisacai');

DROP POLICY IF EXISTS "cardapio_maisacai_edicao_autenticado" ON storage.objects;
CREATE POLICY "cardapio_maisacai_edicao_autenticado" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'cardapio-maisacai');

DROP POLICY IF EXISTS "cardapio_maisacai_exclusao_autenticado" ON storage.objects;
CREATE POLICY "cardapio_maisacai_exclusao_autenticado" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'cardapio-maisacai');

-- =============================================================================
-- FICHA TÉCNICA & CMV + FIDELIDADE (CASHBACK)
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
