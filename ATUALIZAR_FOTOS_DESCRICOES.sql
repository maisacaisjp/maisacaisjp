-- Atualiza fotos e descrições dos produtos do Mais Açaí SJP
-- (fotos locais em /produtos/ e descrições sem aspas sobrando)
-- Rode no SQL Editor do Supabase. Só altera image_url e ingredients.

BEGIN;

UPDATE public.menu_items SET ingredients = 'Açaí com nutella, mousse de ninho e pedacinhos de brownie.', image_url = '/produtos/acai-1371881.webp' WHERE id = 'acai-1371881';
UPDATE public.menu_items SET ingredients = 'Açaí com leite condensado e leite em pó.', image_url = '/produtos/acai-54163.webp' WHERE id = 'acai-54163';
UPDATE public.menu_items SET ingredients = 'Açaí com banana, morango, leite condensado e leite em pó.', image_url = '/produtos/acai-54181.webp' WHERE id = 'acai-54181';
UPDATE public.menu_items SET ingredients = 'Açaí com banana, kiwi e morango.', image_url = '/produtos/acai-54176.webp' WHERE id = 'acai-54176';
UPDATE public.menu_items SET ingredients = 'Açaí com mousse de ninho, leite condensado e leite em pó.', image_url = '/produtos/acai-54151.webp' WHERE id = 'acai-54151';
UPDATE public.menu_items SET ingredients = 'Açaí com nutella, leite condensado e leite em pó.', image_url = '/produtos/acai-439358.webp' WHERE id = 'acai-439358';
UPDATE public.menu_items SET ingredients = 'Descrição do kit: 1 litro de açaí natural, 1 adicional de leite condensado, 1 adicional de leite em pó, 1 adicional de morangos selecionados.', image_url = '/produtos/acai-56853.webp' WHERE id = 'acai-56853';
UPDATE public.menu_items SET ingredients = 'Descrição do kit: 2 litros de açaí natural, 1 adicional de leite condensado, 1 adicional de leite em pó, 1 adicional de granola, 1 adicional de banana, 1 adicional de morangos selecionados.', image_url = '/produtos/acai-92071.webp' WHERE id = 'acai-92071';
UPDATE public.menu_items SET ingredients = 'Descrição do kit: 3 litros de açaí natural, 1 adicional de morangos selecionados (copo 330ml), 1 adicional de banana (copo 330ml), 1 adicional de leite condensado, 1 adicional de leite em pó, 1 adicional de danoninho caseiro, 1 adicional de mousse de ninho, 1 adicional de granola, 1 adicional de confete.', image_url = '/produtos/acai-1413950.webp' WHERE id = 'acai-1413950';
UPDATE public.menu_items SET ingredients = 'Copo de 330ml de açaí para montar do seu jeito: escolha os adicionais que quiser.', image_url = '/produtos/acai-54319.webp' WHERE id = 'acai-54319';
UPDATE public.menu_items SET ingredients = 'Copo de 440ml de açaí para montar do seu jeito: escolha os adicionais que quiser.', image_url = '/produtos/acai-54400.webp' WHERE id = 'acai-54400';
UPDATE public.menu_items SET ingredients = 'Copo de 550ml de açaí para montar do seu jeito: escolha os adicionais que quiser.', image_url = '/produtos/acai-54401.webp' WHERE id = 'acai-54401';
UPDATE public.menu_items SET ingredients = 'Copo de 770ml de açaí para montar do seu jeito: escolha os adicionais que quiser.', image_url = '/produtos/acai-54402.webp' WHERE id = 'acai-54402';
UPDATE public.menu_items SET ingredients = 'Pote de 1 litro de açaí para montar do seu jeito: escolha os adicionais que quiser.', image_url = '/produtos/acai-54403.webp' WHERE id = 'acai-54403';
UPDATE public.menu_items SET ingredients = 'Pote de 2 litros de açaí para montar do seu jeito, ideal para dividir.', image_url = '/produtos/acai-54404.webp' WHERE id = 'acai-54404';
UPDATE public.menu_items SET ingredients = 'Açaí com abacaxi, leite condensado e leite em pó.', image_url = '/produtos/acai-352382.webp' WHERE id = 'acai-352382';
UPDATE public.menu_items SET ingredients = 'Açaí com banana, leite condensado e leite em pó.', image_url = '/produtos/acai-352381.webp' WHERE id = 'acai-352381';
UPDATE public.menu_items SET ingredients = 'Açaí com leite condensado, leite em pó e kiwi importado.', image_url = '/produtos/acai-352385.webp' WHERE id = 'acai-352385';
UPDATE public.menu_items SET ingredients = 'Açaí com morango, leite condensado e leite em pó.', image_url = '/produtos/acai-54167.webp' WHERE id = 'acai-54167';
UPDATE public.menu_items SET ingredients = 'Açaí com leite condensado, leite em pó e uva verde sem semente.', image_url = '/produtos/acai-352386.webp' WHERE id = 'acai-352386';
UPDATE public.menu_items SET ingredients = 'Açaí com danoninho caseiro, leite em pó e abacaxi.', image_url = '/produtos/acai-478904.webp' WHERE id = 'acai-478904';
UPDATE public.menu_items SET ingredients = 'Açaí com danoninho caseiro, leite em pó e banana.', image_url = '/produtos/acai-478901.webp' WHERE id = 'acai-478901';
UPDATE public.menu_items SET ingredients = 'Açaí com danoninho caseiro, leite em pó e kiwi importado.', image_url = '/produtos/acai-478942.webp' WHERE id = 'acai-478942';
UPDATE public.menu_items SET ingredients = 'Açaí com danoninho caseiro, leite em pó e morango.', image_url = '/produtos/acai-54153.webp' WHERE id = 'acai-54153';
UPDATE public.menu_items SET ingredients = 'Açaí com danoninho caseiro, leite em pó e uva verde sem semente.', image_url = '/produtos/acai-478966.webp' WHERE id = 'acai-478966';
UPDATE public.menu_items SET ingredients = 'Açaí com leite em pó e mousse de ninho.', image_url = '/produtos/acai-54164.webp' WHERE id = 'acai-54164';
UPDATE public.menu_items SET ingredients = 'Açaí com mousse de ninho, leite em pó e abacaxi.', image_url = '/produtos/acai-478973.webp' WHERE id = 'acai-478973';
UPDATE public.menu_items SET ingredients = 'Açaí com mousse de ninho, leite em pó e banana.', image_url = '/produtos/acai-479052.webp' WHERE id = 'acai-479052';
UPDATE public.menu_items SET ingredients = 'Açaí com mousse de ninho, leite em pó e kiwi importado.', image_url = '/produtos/acai-485900.webp' WHERE id = 'acai-485900';
UPDATE public.menu_items SET ingredients = 'Açaí com mousse de ninho, leite em pó e morango.', image_url = '/produtos/acai-485909.webp' WHERE id = 'acai-485909';
UPDATE public.menu_items SET ingredients = 'Açaí com mousse de ninho, leite em pó e uva verde sem semente.', image_url = '/produtos/acai-485911.webp' WHERE id = 'acai-485911';
UPDATE public.menu_items SET ingredients = 'Açaí com nutella, mousse de ninho e abacaxi.', image_url = '/produtos/acai-352460.webp' WHERE id = 'acai-352460';
UPDATE public.menu_items SET ingredients = 'Açaí com nutella, mousse de ninho e banana.', image_url = '/produtos/acai-54175.webp' WHERE id = 'acai-54175';
UPDATE public.menu_items SET ingredients = 'Açaí com nutella, mousse de ninho e kiwi importado.', image_url = '/produtos/acai-352462.webp' WHERE id = 'acai-352462';
UPDATE public.menu_items SET ingredients = 'Açaí com nutella, mousse de ninho e morango.', image_url = '/produtos/acai-352463.webp' WHERE id = 'acai-352463';
UPDATE public.menu_items SET ingredients = 'Açaí com nutella, mousse de ninho e uva verde sem semente.', image_url = '/produtos/acai-352466.webp' WHERE id = 'acai-352466';
UPDATE public.menu_items SET ingredients = 'Açaí com abacaxi, granola e mel.', image_url = '/produtos/acai-352489.webp' WHERE id = 'acai-352489';
UPDATE public.menu_items SET ingredients = 'Açaí com banana, granola e mel.', image_url = '/produtos/acai-352498.webp' WHERE id = 'acai-352498';
UPDATE public.menu_items SET ingredients = 'Açaí com kiwi importado, granola e mel.', image_url = '/produtos/acai-352502.webp' WHERE id = 'acai-352502';
UPDATE public.menu_items SET ingredients = 'Açaí com morango, granola e mel.', image_url = '/produtos/acai-54162.webp' WHERE id = 'acai-54162';
UPDATE public.menu_items SET ingredients = 'Açaí com uva verde sem semente, granola e mel.', image_url = '/produtos/acai-352504.webp' WHERE id = 'acai-352504';
UPDATE public.menu_items SET ingredients = 'Açaí com amendoim, leite condensado e leite em pó.', image_url = '/produtos/acai-54168.webp' WHERE id = 'acai-54168';
UPDATE public.menu_items SET ingredients = 'Açaí com granola, leite condensado e leite em pó.', image_url = '/produtos/acai-54170.webp' WHERE id = 'acai-54170';
UPDATE public.menu_items SET ingredients = 'Açaí com paçoca, leite condensado e leite em pó.', image_url = '/produtos/acai-54172.webp' WHERE id = 'acai-54172';
UPDATE public.menu_items SET ingredients = 'Açaí com ovomaltine, leite condensado e leite em pó.', image_url = '/produtos/acai-54171.webp' WHERE id = 'acai-54171';
UPDATE public.menu_items SET ingredients = 'Açaí com bolacha maizena triturada, banana, doce de leite e mousse de ninho.', image_url = '/produtos/acai-54148.webp' WHERE id = 'acai-54148';
UPDATE public.menu_items SET ingredients = 'Açaí com bis xtra ao leite e nutella.', image_url = '/produtos/acai-54149.webp' WHERE id = 'acai-54149';
UPDATE public.menu_items SET ingredients = 'Açaí com bis xtra oreo e mousse de ninho.', image_url = '/produtos/acai-54150.webp' WHERE id = 'acai-54150';
UPDATE public.menu_items SET ingredients = 'Açaí com kinder bueno ao leite e nutella.', image_url = '/produtos/acai-54158.webp' WHERE id = 'acai-54158';
UPDATE public.menu_items SET ingredients = 'Açaí com kinder bueno white e mousse de ninho.', image_url = '/produtos/acai-54159.webp' WHERE id = 'acai-54159';
UPDATE public.menu_items SET ingredients = 'Açaí com chocoball, nutella e mousse de ninho.', image_url = '/produtos/acai-54152.webp' WHERE id = 'acai-54152';
UPDATE public.menu_items SET ingredients = 'Açaí com confete e danoninho caseiro.', image_url = '/produtos/acai-54156.webp' WHERE id = 'acai-54156';
UPDATE public.menu_items SET ingredients = 'Açaí com kinder barrinha, leite condensado e leite em pó.', image_url = '/produtos/acai-54157.webp' WHERE id = 'acai-54157';
UPDATE public.menu_items SET ingredients = 'Açaí com kit kat ao leite e nutella.', image_url = '/produtos/acai-54160.webp' WHERE id = 'acai-54160';
UPDATE public.menu_items SET ingredients = 'Açaí com kit kat white e mouse de ninho.', image_url = '/produtos/acai-54161.webp' WHERE id = 'acai-54161';
UPDATE public.menu_items SET ingredients = 'Açaí com calda de morango e mousse de ninho.', image_url = '/produtos/acai-54174.webp' WHERE id = 'acai-54174';
UPDATE public.menu_items SET ingredients = 'Açaí com calda de morango e danoninho caseiro.', image_url = '/produtos/acai-808184.webp' WHERE id = 'acai-808184';
UPDATE public.menu_items SET ingredients = 'Açaí com cobertura de chocolate e ovomaltine.', image_url = '/produtos/acai-54165.webp' WHERE id = 'acai-54165';
UPDATE public.menu_items SET ingredients = 'Açaí com abacaxi, banana, kiwi, morango e uva.', image_url = '/produtos/acai-54177.webp' WHERE id = 'acai-54177';
UPDATE public.menu_items SET ingredients = 'Refrescância + cremosidade + energia = essa delícia aqui! Nosso milkshake de açaí é a combinação perfeita do sabor marcante do açaí com a cremosidade gelada que você ama.', image_url = '/produtos/acai-410262.webp' WHERE id = 'acai-410262';
UPDATE public.menu_items SET ingredients = 'Cremoso, gelado e com o azedinho tropical na medida. Refrescante, exótico e perfeito pra quem quer sair do óbvio.', image_url = '/produtos/acai-491982.webp' WHERE id = 'acai-491982';
UPDATE public.menu_items SET ingredients = 'O clássico que nunca falha pra matar a vontade de doce.', image_url = '/produtos/acai-763012.webp' WHERE id = 'acai-763012';
UPDATE public.menu_items SET ingredients = 'Cremoso, gelado e com aquele sabor doce e levemente ácido que conquista fácil. Clássico, refrescante e impossível de errar.', image_url = '/produtos/acai-410263.webp' WHERE id = 'acai-410263';
UPDATE public.menu_items SET ingredients = 'Cremoso, gelado e cheio de personalidade. Sabor intenso de amendoim com doce na medida certa pra quem ama um clássico brasileiro irresistível.', image_url = '/produtos/acai-410267.webp' WHERE id = 'acai-410267';
UPDATE public.menu_items SET ingredients = 'Cremoso, gelado e com aquele sabor suave e viciante que derrete na boca. Doce na medida certa pra quem ama um clássico irresistível.', image_url = '/produtos/acai-453594.webp' WHERE id = 'acai-453594';
UPDATE public.menu_items SET ingredients = 'Cremoso, gelado e com a crocância marcante que faz toda a diferença. Intenso, indulgente e simplesmente viciante.', image_url = '/produtos/acai-410264.webp' WHERE id = 'acai-410264';
UPDATE public.menu_items SET ingredients = 'Cremoso, gelado e absurdamente indulgente. Sabor intenso de chocolate com avelã pra quem não abre mão de um doce marcante e irresistível.', image_url = '/produtos/acai-453595.webp' WHERE id = 'acai-453595';
UPDATE public.menu_items SET ingredients = 'Cremoso, gelado e simplesmente perfeito. A suavidade do Ninho com o toque intenso da Nutella em uma combinação irresistível.', image_url = '/produtos/acai-1120900.webp' WHERE id = 'acai-1120900';
UPDATE public.menu_items SET ingredients = 'Cremoso, gelado e equilibrado na medida. A suavidade do Ninho com o frescor do morango em uma combinação leve e irresistível.', image_url = '/produtos/acai-1263308.webp' WHERE id = 'acai-1263308';
UPDATE public.menu_items SET ingredients = 'Cremoso, gelado e bem brasileiro. A doçura do doce de leite com o sabor intenso da paçoca em uma combinação rica e irresistível.', image_url = '/produtos/acai-953067.webp' WHERE id = 'acai-953067';
UPDATE public.menu_items SET ingredients = 'Preço especial para o pedido em dupla!', image_url = '/produtos/acai-1422806.webp' WHERE id = 'acai-1422806';
UPDATE public.menu_items SET ingredients = 'Suco de açaí bem geladinho, copo de 550ml.', image_url = '/produtos/acai-453604.webp' WHERE id = 'acai-453604';
UPDATE public.menu_items SET ingredients = 'Suco de açaí com abacaxi bem geladinho, copo de 550ml.', image_url = '/produtos/acai-1263223.webp' WHERE id = 'acai-1263223';
UPDATE public.menu_items SET ingredients = 'Suco de açaí com morango bem geladinho, copo de 550ml.', image_url = '/produtos/acai-453609.webp' WHERE id = 'acai-453609';
UPDATE public.menu_items SET ingredients = 'Suco de cupuaçu bem geladinho, copo de 550ml.', image_url = '/produtos/acai-500046.webp' WHERE id = 'acai-500046';
UPDATE public.menu_items SET ingredients = 'Suco de morango bem geladinho, copo de 550ml.', image_url = '/produtos/acai-453637.webp' WHERE id = 'acai-453637';
UPDATE public.menu_items SET ingredients = 'Açaí, banana, morango, leite condensado, leite em pó e leite integral.', image_url = '/produtos/acai-1263230.webp' WHERE id = 'acai-1263230';
UPDATE public.menu_items SET ingredients = 'Água mineral sem gás, geladinha.', image_url = '/produtos/acai-154813.webp' WHERE id = 'acai-154813';
UPDATE public.menu_items SET ingredients = 'Água mineral com gás, geladinha.', image_url = '/produtos/acai-154814.webp' WHERE id = 'acai-154814';
UPDATE public.menu_items SET ingredients = 'Coca-Cola tradicional em lata, geladinha.', image_url = '/produtos/acai-436274.webp' WHERE id = 'acai-436274';
UPDATE public.menu_items SET ingredients = 'Guaraná em lata, geladinho.', image_url = '/produtos/acai-436275.webp' WHERE id = 'acai-436275';
UPDATE public.menu_items SET ingredients = 'Sprite em lata, geladinha.', image_url = '/produtos/acai-436276.webp' WHERE id = 'acai-436276';

COMMIT;

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
-- CATEGORIAS: "Mais Vendidos" em primeiro lugar
-- =============================================================================
UPDATE public.categories SET order_index = 1 WHERE id = 'mais-vendidos';
UPDATE public.categories SET order_index = 2 WHERE id = 'novidades';
