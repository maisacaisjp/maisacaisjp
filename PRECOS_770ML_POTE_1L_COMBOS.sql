-- MAIS AÇAÍ SJP — CARDÁPIO IGUAL AO MULTIPEDIDOS (conferido em 03/11/2026)
-- 1) Preços de 770ml e Pote Recheado 1 Litro nos combos
-- 2) Pausa os 4 adicionais que estão indisponíveis no Multipedidos
-- Preços copiados do cardápio do Multipedidos (grupo de tamanho de cada combo).
-- Nada foi calculado: são os mesmos valores que o cliente já paga hoje.
-- Os 330ml, 440ml e 550ml do banco foram conferidos e batem com o Multipedidos nos 50 combos.
-- Rode no SQL Editor do Supabase do Mais Açaí. Pode rodar de novo sem problema.

-- Coluna do 2 Litros (fica vazia: nenhum combo tem 2L no Multipedidos; só o produto "2 LITROS" e o "KIT 2 LITROS")
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS price_2l NUMERIC(10,2);

UPDATE public.menu_items m
SET price_big = v.p770,
    price_super_big = v.p1l,
    updated_at = now()
FROM (VALUES
    ('acai-54148', 42.00, 52.00), -- COMBO BANOFFEE
    ('acai-54149', 44.00, 54.00), -- COMBO BIS AO LEITE
    ('acai-54150', 44.00, 54.00), -- COMBO BIS OREO
    ('acai-54151', 42.00, 52.00), -- COMBO BRANCA DE NEVE
    ('acai-54152', 46.00, 56.00), -- COMBO CHOCOBALL
    ('acai-54153', 42.00, 52.00), -- COMBO DANONINHO MORANGO
    ('acai-54156', 40.00, 50.00), -- COMBO KIDS
    ('acai-54157', 44.00, 54.00), -- COMBO KINDER
    ('acai-54158', 48.00, 58.00), -- COMBO BUENO AO LEITE
    ('acai-54159', 48.00, 58.00), -- COMBO BUENO BRANCO
    ('acai-54160', 44.00, 54.00), -- COMBO KIT KAT AO LEITE
    ('acai-352489', 40.00, 50.00), -- COMBO TRADICIONAL ABACAXI
    ('acai-54163', 38.00, 48.00), -- COMBO NEVADO
    ('acai-54164', 42.00, 52.00), -- COMBO NINHO
    ('acai-54165', 40.00, 50.00), -- COMBO OVOMALTINE
    ('acai-54167', 40.00, 50.00), -- COMBO SENSAÇÃO MORANGO
    ('acai-54168', 40.00, 50.00), -- COMBO SENSAÇÃO AMENDOIM
    ('acai-54170', 40.00, 50.00), -- COMBO SENSAÇÃO GRANOLA
    ('acai-54171', 40.00, 50.00), -- COMBO SENSAÇÃO OVOMALTINE
    ('acai-54172', 40.00, 50.00), -- COMBO SENSAÇÃO PAÇOCA
    ('acai-54174', 40.00, 50.00), -- COMBO TENTAÇÃO
    ('acai-352460', 46.00, 56.00), -- COMBO MAGNÍFICO ABACAXI
    ('acai-54176', 40.00, 50.00), -- COMBO TROPICAL
    ('acai-54177', 44.00, 54.00), -- COMBO TROPICAL ESPECIAL
    ('acai-54181', 40.00, 50.00), -- COMBO FAVORITO
    ('acai-352382', 40.00, 50.00), -- COMBO SENSAÇÃO ABACAXI
    ('acai-352381', 40.00, 50.00), -- COMBO SENSAÇÃO BANANA
    ('acai-352385', 40.00, 50.00), -- COMBO SENSAÇÃO KIWI
    ('acai-352386', 40.00, 50.00), -- COMBO SENSAÇÃO UVA
    ('acai-54175', 46.00, 56.00), -- COMBO MAGNÍFICO BANANA
    ('acai-352462', 46.00, 56.00), -- COMBO MAGNÍFICO KIWI
    ('acai-352463', 46.00, 56.00), -- COMBO MAGNÍFICO MORANGO
    ('acai-352466', 46.00, 56.00), -- COMBO MAGNÍFICO UVA
    ('acai-352498', 40.00, 50.00), -- COMBO TRADICIONAL BANANA
    ('acai-352502', 40.00, 50.00), -- COMBO TRADICIONAL KIWI
    ('acai-54162', 40.00, 50.00), -- COMBO TRADICIONAL MORANGO
    ('acai-352504', 40.00, 50.00), -- COMBO TRADICIONAL UVA
    ('acai-54161', 44.00, 54.00), -- COMBO KIT KAT BRANCO
    ('acai-439358', 46.00, 56.00), -- COMBO SENSAÇÃO AVELÃ
    ('acai-478904', 42.00, 52.00), -- COMBO DANONINHO ABACAXI
    ('acai-478901', 42.00, 52.00), -- COMBO DANONINHO BANANA
    ('acai-478942', 42.00, 52.00), -- COMBO DANONINHO KIWI
    ('acai-478966', 42.00, 52.00), -- COMBO DANONINHO UVA
    ('acai-478973', 42.00, 52.00), -- COMBO NINHO ABACAXI
    ('acai-479052', 42.00, 52.00), -- COMBO NINHO BANANA
    ('acai-485900', 42.00, 52.00), -- COMBO NINHO KIWI
    ('acai-485909', 42.00, 52.00), -- COMBO NINHO MORANGO
    ('acai-485911', 42.00, 52.00), -- COMBO NINHO UVA
    ('acai-808184', 40.00, 50.00), -- COMBO TENTAÇÃO 2
    ('acai-1371881', 46.00, 56.00)  -- COMBO MAGNÍFICO BROWNIE
) AS v(id, p770, p1l)
WHERE m.id = v.id;

-- Adicionais que estão indisponíveis no Multipedidos: ficam pausados (dá para reativar no gestor)
INSERT INTO public.paused_items (id) VALUES
    ('ex-3637089'), -- CARIBE BUENO
    ('ex-4143417'), -- CUBINHOS DE BROWNIE
    ('ex-3118515'), -- CREME RAFFAELLO
    ('ex-2069321')  -- LEITE EM PÓ ZERO LACTOSE
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- Conferência: deve mostrar 50 combos, todos com 770ml e 1 litro preenchidos
SELECT count(*) AS combos,
       count(price_big) AS com_770ml,
       count(price_super_big) AS com_1_litro
FROM public.menu_items
WHERE price_g IS NOT NULL;
