-- ==============================================================================
-- SEGURANÇA ETAPA 2 — PARTE B: FECHA PEDIDOS, CLIENTES, CASHBACK E CAIXA
-- Rodar no Supabase: SQL Editor > New query > colar tudo > Run.
--
-- RODAR SÓ DEPOIS QUE:
--   1. O código novo estiver no ar (checkout e cashback pelo servidor), e
--   2. A Maya já estiver usando a maya-api (feito pelo Claude no n8n).
--
-- O que faz:
--   * orders, customers, cash_sessions: só quem está logado no gestor COM PERFIL vê e altera.
--     (o cliente continua acompanhando o pedido pelo código de rastreio e por "Meus pedidos")
--   * settings: o público só lê as configurações do cardápio (horário, capa, taxas...).
--     Saldos de cashback, histórico de faturamento e conversas deixam de ser públicos.
--   * Todas as tabelas do gestor passam a exigir PERFIL cadastrado (quem criar conta
--     sozinho pelo Supabase não entra em nada).
--   * Financeiro: só o dono.
--   * Funções financeiro_agente e alterar_horario_loja: só o servidor (a Maya usa a maya-api).
--   * Conta sem perfil deixa de ser tratada como dono.
--
-- Para desfazer: SEGURANCA_ETAPA2_DESFAZER.sql
-- ==============================================================================

begin;

-- 1. Quem tem perfil no gestor (base de todas as regras abaixo)
create or replace function public.tem_perfil()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (select 1 from public.profiles p where p.id = auth.uid());
$$;
revoke all on function public.tem_perfil() from public;
grant execute on function public.tem_perfil() to authenticated;

create or replace function public.e_dono()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner');
$$;
revoke all on function public.e_dono() from public;
grant execute on function public.e_dono() to authenticated;

-- 2. Administrar usuários: sem perfil NÃO é mais dono
create or replace function public.pode_gerenciar_usuarios()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and (p.role = 'owner' or coalesce((p.permissions ->> 'gerenciar_usuarios')::boolean, false))
  );
$$;

-- 3. Pedidos, clientes e caixa: só gestor com perfil
do $$
declare
  t text;
  r record;
begin
  foreach t in array array['orders','customers','cash_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', r.policyname, t);
    end loop;
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "Somente gestor" on public.%I for all to authenticated using (public.tem_perfil()) with check (public.tem_perfil())', t);
  end loop;
end $$;

-- 4. Configurações (settings)
alter table public.settings enable row level security;
do $$
declare
  r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'settings' loop
    execute format('drop policy %I on public.settings', r.policyname);
  end loop;
end $$;
revoke all on public.settings from anon;
grant select, insert, update on public.settings to anon;
grant select, insert, update, delete on public.settings to authenticated;

-- O que o cardápio público precisa ler (e o funil de vendas, que grava analytics_events_<dia>)
create policy "Leitura publica do cardapio" on public.settings
  for select to anon, authenticated
  using (
    key in (
      'store_status', 'manual_store_closed', 'paused_until', 'subscription_status',
      'store_cover_url', 'store_cover_settings', 'admin_logo_url',
      'delivery_time_estimate', 'pickup_time_estimate', 'delivery_min_order', 'free_delivery_threshold',
      'company_name', 'company_address', 'whatsapp_number', 'bot_active',
      'cashback_enabled', 'cashback_percent', 'cashback_validade_dias'
    )
    or key like 'analytics\_events\_%'
  );
create policy "Funil grava eventos" on public.settings
  for insert to anon
  with check (key like 'analytics\_events\_%');
create policy "Funil atualiza eventos" on public.settings
  for update to anon
  using (key like 'analytics\_events\_%')
  with check (key like 'analytics\_events\_%');
create policy "Gestor le tudo" on public.settings
  for select to authenticated using (public.tem_perfil());
create policy "Gestor altera" on public.settings
  for all to authenticated using (public.tem_perfil()) with check (public.tem_perfil());

-- 5. Eventos do funil (tabela própria): público só registra; gestor lê
do $$
declare
  r record;
begin
  if to_regclass('public.analytics_events') is not null then
    execute 'alter table public.analytics_events enable row level security';
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'analytics_events' loop
      execute format('drop policy %I on public.analytics_events', r.policyname);
    end loop;
    execute 'revoke all on public.analytics_events from anon';
    execute 'grant insert on public.analytics_events to anon';
    execute 'grant select, insert, update, delete on public.analytics_events to authenticated';
    execute 'create policy "Cardapio registra evento" on public.analytics_events for insert to anon, authenticated with check (true)';
    execute 'create policy "Gestor le eventos" on public.analytics_events for select to authenticated using (public.tem_perfil())';
    execute 'create policy "Gestor apaga eventos" on public.analytics_events for delete to authenticated using (public.tem_perfil())';
  end if;
end $$;

-- 6. Conversas do WhatsApp (se existirem): só gestor (o servidor grava com a chave secreta)
do $$
declare
  t text;
  r record;
begin
  foreach t in array array['chat_conversations','chat_messages'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on public.%I', r.policyname, t);
      end loop;
      execute format('revoke all on public.%I from anon', t);
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('create policy "Somente gestor" on public.%I for all to authenticated using (public.tem_perfil()) with check (public.tem_perfil())', t);
    end if;
  end loop;
end $$;

-- 7. Tabelas da Etapa 1: a parte do gestor passa a exigir perfil
do $$
declare
  t text;
begin
  foreach t in array array['menu_items','categories','extras','paused_items','business_hours','delivery_zones',
                           'category_extra_groups','extra_groups','system_subscription'] loop
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'Gestor altera') then
      execute format('alter policy "Gestor altera" on public.%I using (public.tem_perfil()) with check (public.tem_perfil())', t);
    end if;
  end loop;
  foreach t in array array['cash_movements','expenses','motoboys'] loop
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'Somente gestor') then
      execute format('alter policy "Somente gestor" on public.%I using (public.tem_perfil()) with check (public.tem_perfil())', t);
    end if;
  end loop;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Gestor le perfis') then
    execute 'alter policy "Gestor le perfis" on public.profiles using (id = auth.uid() or public.tem_perfil())';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_reviews' and policyname = 'Gestor edita avaliacao') then
    execute 'alter policy "Gestor edita avaliacao" on public.order_reviews using (public.tem_perfil()) with check (public.tem_perfil())';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_reviews' and policyname = 'Gestor apaga avaliacao') then
    execute 'alter policy "Gestor apaga avaliacao" on public.order_reviews using (public.tem_perfil())';
  end if;
end $$;

-- 8. Financeiro: só o dono (antes, conta sem perfil também entrava)
drop policy if exists "Financeiro: somente dono" on public.financeiro_maisacai;
create policy "Financeiro: somente dono" on public.financeiro_maisacai
  for all to authenticated
  using (public.e_dono())
  with check (public.e_dono());

-- 9. Funções que só o servidor usa (a Maya passa pela maya-api, com a chave secreta)
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('financeiro_agente', 'alterar_horario_loja')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.assinatura);
    execute format('grant execute on function %s to service_role', f.assinatura);
  end loop;
end $$;

-- 10. Rastreio do pedido continua público, mas só pelo código (função que mostra um pedido só)
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'get_order_by_tracking_code' and not p.prosecdef
  loop
    execute format('alter function %s security definer set search_path = public', f.assinatura);
  end loop;
end $$;

commit;

-- 11. CONFERÊNCIA (aparece no resultado)
select json_build_object(
  'regras_abertas_ao_publico', (
    select coalesce(json_agg(json_build_object('tabela', tablename, 'regra', policyname, 'acao', cmd) order by tablename), '[]'::json)
      from pg_policies
     where schemaname = 'public' and ('anon' = any(roles) or 'public' = any(roles))
  ),
  'funcoes_que_o_publico_executa', (
    select coalesce(json_agg(p.proname order by p.proname), '[]'::json)
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
       and p.prokind = 'f' and p.proname not like 'pg\_%'
  ),
  'storage_buckets', (select coalesce(json_agg(json_build_object('bucket', id, 'publico', public)), '[]'::json) from storage.buckets),
  'storage_regras', (
    select coalesce(json_agg(json_build_object('regra', policyname, 'acao', cmd, 'quem', roles::text, 'condicao', coalesce(qual, with_check))), '[]'::json)
      from pg_policies where schemaname = 'storage' and tablename = 'objects'
  ),
  'perfis', (select json_agg(json_build_object('papel', p.role, 'email', u.email)) from public.profiles p join auth.users u on u.id = p.id),
  'contas_sem_perfil', (select coalesce(json_agg(u.email), '[]'::json) from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id))
) as conferencia;
