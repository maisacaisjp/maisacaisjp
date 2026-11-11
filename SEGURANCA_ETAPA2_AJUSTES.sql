-- ==============================================================================
-- SEGURANÇA ETAPA 2 — AJUSTES FINAIS
-- Rodar no Supabase: SQL Editor > New query > colar tudo > Run.
-- RODAR SÓ DEPOIS que a versão nova do site estiver no ar (avaliação sem telefone no retorno).
--
-- 1. Fotos do cardápio (storage): qualquer pessoa conseguia APAGAR, TROCAR e ENVIAR fotos.
--    Agora: o público só VÊ as fotos; enviar, trocar e apagar só quem está logado no gestor com perfil.
-- 2. Avaliações: o público continua vendo nome, nota, comentário e resposta da loja,
--    mas não vê mais o TELEFONE nem o número do pedido de quem avaliou.
-- ==============================================================================

begin;

-- 1. STORAGE (bucket cardapio-maisacai)
drop policy if exists "Public Delete" on storage.objects;
drop policy if exists "Public Update" on storage.objects;
drop policy if exists "Public Upload" on storage.objects;

drop policy if exists "Gestor envia fotos" on storage.objects;
create policy "Gestor envia fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cardapio-maisacai' and public.tem_perfil());

drop policy if exists "Gestor troca fotos" on storage.objects;
create policy "Gestor troca fotos" on storage.objects
  for update to authenticated
  using (bucket_id = 'cardapio-maisacai' and public.tem_perfil())
  with check (bucket_id = 'cardapio-maisacai' and public.tem_perfil());

drop policy if exists "Gestor apaga fotos" on storage.objects;
create policy "Gestor apaga fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cardapio-maisacai' and public.tem_perfil());

-- 2. AVALIAÇÕES: público lê só as colunas públicas
revoke select on public.order_reviews from anon;
grant select (id, customer_name, rating, tags, comment, store_reply, replied_at, created_at, is_public)
  on public.order_reviews to anon;

commit;

-- CONFERÊNCIA
select json_build_object(
  'storage_regras', (
    select coalesce(json_agg(json_build_object('regra', policyname, 'acao', cmd, 'quem', roles::text)), '[]'::json)
      from pg_policies where schemaname = 'storage' and tablename = 'objects'
  ),
  'colunas_publicas_avaliacoes', (
    select coalesce(json_agg(column_name order by column_name), '[]'::json)
      from information_schema.column_privileges
     where table_schema = 'public' and table_name = 'order_reviews' and grantee = 'anon' and privilege_type = 'SELECT'
  )
) as conferencia;
