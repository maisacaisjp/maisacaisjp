-- ==============================================================================
-- SEGURANÇA — ETAPA 1 (Mais Açaí SJP)
-- Rodar uma vez no Supabase: SQL Editor > New query > colar tudo > Run.
--
-- O que muda:
--   * Cardápio (produtos, categorias, adicionais, horários, bairros, pausas, assinatura):
--     todos continuam VENDO; só quem está logado no gestor ALTERA.
--   * Movimentos de caixa, despesas, motoboys: só o gestor.
--   * Perfis de acesso: o gestor lê; só o dono (ou quem tem "gerenciar usuários") altera.
--   * Avaliações: todos leem e enviam; só o gestor edita ou apaga.
--   * Cria o perfil de DONO para reservaconsultorias@gmail.com.
--   * Funções da Maya que mexem no cardápio/horário continuam funcionando.
--   * Fecha a função pública que apagava avaliações por nome.
--
-- NÃO mexe ainda (Etapa 2): orders, customers, settings, financeiro_agente.
-- Para desfazer: SEGURANCA_ETAPA1_DESFAZER.sql
-- ==============================================================================

begin;

-- 1. Quem pode administrar usuários (dono, conta sem perfil = dono, ou permissão gerenciar_usuarios)
--    SECURITY DEFINER para não entrar em laço com a regra da própria tabela profiles.
create or replace function public.pode_gerenciar_usuarios()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    not exists (select 1 from public.profiles p where p.id = auth.uid())
    or exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and (p.role = 'owner' or coalesce((p.permissions ->> 'gerenciar_usuarios')::boolean, false))
    )
  );
$$;
revoke all on function public.pode_gerenciar_usuarios() from public;
grant execute on function public.pode_gerenciar_usuarios() to authenticated;

-- 2. Perfil de DONO para a conta nova
insert into public.profiles (id, role, full_name)
select u.id, 'owner', 'Dono — Mais Açaí'
  from auth.users u
 where lower(u.email) = 'reservaconsultorias@gmail.com'
on conflict (id) do update set role = 'owner';

-- 3. Remove TODAS as regras atuais das tabelas desta etapa (para recriar limpas)
do $$
declare
  r record;
begin
  for r in
    select tablename, policyname from pg_policies
     where schemaname = 'public'
       and tablename in ('menu_items','categories','extras','paused_items','business_hours','delivery_zones',
                         'category_extra_groups','extra_groups','system_subscription','cash_sessions',
                         'cash_movements','expenses','motoboys','profiles','order_reviews')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 4. Cardápio e configurações: todos leem, só o gestor (logado) altera
do $$
declare
  t text;
begin
  foreach t in array array['menu_items','categories','extras','paused_items','business_hours','delivery_zones',
                           'category_extra_groups','extra_groups','system_subscription','cash_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Leitura publica" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "Gestor altera" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- 5. Só o gestor: movimentos de caixa, despesas, motoboys
do $$
declare
  t text;
begin
  foreach t in array array['cash_movements','expenses','motoboys'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Somente gestor" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- 6. Perfis: gestor lê; só dono / gerenciar_usuarios altera
alter table public.profiles enable row level security;
create policy "Gestor le perfis" on public.profiles for select to authenticated using (true);
create policy "Dono altera perfis" on public.profiles for insert to authenticated with check (public.pode_gerenciar_usuarios());
create policy "Dono edita perfis" on public.profiles for update to authenticated using (public.pode_gerenciar_usuarios()) with check (public.pode_gerenciar_usuarios());
create policy "Dono apaga perfis" on public.profiles for delete to authenticated using (public.pode_gerenciar_usuarios());

-- 7. Avaliações: todos leem e enviam; só o gestor edita/apaga (resposta da loja)
alter table public.order_reviews enable row level security;
create policy "Leitura publica" on public.order_reviews for select to anon, authenticated using (true);
create policy "Cliente envia avaliacao" on public.order_reviews for insert to anon, authenticated with check (true);
create policy "Gestor edita avaliacao" on public.order_reviews for update to authenticated using (true) with check (true);
create policy "Gestor apaga avaliacao" on public.order_reviews for delete to authenticated using (true);

-- 8. Funções que a Maya usa no cardápio/horário: rodam com permissão própria
--    (continuam funcionando agora que o público não altera mais as tabelas)
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('alterar_horario_loja','consultar_horarios_loja','cardapio_agente')
       and not p.prosecdef
  loop
    execute format('alter function %s security definer set search_path = public', f.assinatura);
  end loop;
end $$;

-- 9. Fecha a função pública que apagava avaliações por nome (o gestor continua podendo usar)
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'excluir_review_por_nome'
  loop
    execute format('revoke execute on function %s from public, anon', f.assinatura);
    execute format('grant execute on function %s to authenticated', f.assinatura);
  end loop;
end $$;

commit;

-- 10. CONFERÊNCIA (aparece no resultado)
select json_build_object(
  'perfil_dono', (select json_agg(json_build_object('email', u.email, 'papel', p.role))
                    from public.profiles p join auth.users u on u.id = p.id where p.role = 'owner'),
  'regras_novas', (select json_agg(json_build_object('tabela', tablename, 'regra', policyname, 'quem', roles, 'acao', cmd) order by tablename, cmd)
                     from pg_policies where schemaname = 'public'
                      and tablename in ('menu_items','categories','extras','paused_items','business_hours','delivery_zones',
                                        'category_extra_groups','extra_groups','system_subscription','cash_sessions',
                                        'cash_movements','expenses','motoboys','profiles','order_reviews'))
) as conferencia;
