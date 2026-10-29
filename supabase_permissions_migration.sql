-- Migration: Permissões Granulares Individuais por Usuário / Perfil
-- Execute este script no SQL Editor do seu Dashboard Supabase.

-- 1. Adiciona a coluna de permissões individuais na tabela de perfis
alter table public.profiles add column if not exists permissions jsonb not null default '{}'::jsonb;

-- 2. Dá todas as permissões ativas para quem já é "owner" hoje (Dono do Sistema)
update public.profiles
set permissions = jsonb_build_object(
  'ver_pedidos', true,
  'gerenciar_caixa', true,
  'gerenciar_produtos', true,
  'gerenciar_categorias', true,
  'ver_relatorios', true,
  'ver_clientes', true,
  'gerenciar_configuracoes', true,
  'gerenciar_usuarios', true
)
where role = 'owner';

-- 3. Função PostgreSQL que confere se o usuário logado tem uma permissão específica
-- (donos/owners sempre têm acesso total a tudo)
create or replace function public.has_permission(perm text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'owner',
    false
  )
  or coalesce(
    (select (permissions->>perm)::boolean from public.profiles where id = auth.uid()),
    false
  );
$$;

-- 4. Atualiza as políticas RLS de segurança para usarem permissões granulares

drop policy if exists "owner manage categories" on public.categories;
create policy "owner manage categories" on public.categories for all
  using (public.has_permission('gerenciar_categorias')) with check (public.has_permission('gerenciar_categorias'));

drop policy if exists "owner manage menu_items" on public.menu_items;
create policy "owner manage menu_items" on public.menu_items for all
  using (public.has_permission('gerenciar_produtos')) with check (public.has_permission('gerenciar_produtos'));

drop policy if exists "owner manage extra_groups" on public.extra_groups;
create policy "owner manage extra_groups" on public.extra_groups for all
  using (public.has_permission('gerenciar_produtos')) with check (public.has_permission('gerenciar_produtos'));

drop policy if exists "owner manage extras" on public.extras;
create policy "owner manage extras" on public.extras for all
  using (public.has_permission('gerenciar_produtos')) with check (public.has_permission('gerenciar_produtos'));

drop policy if exists "owner manage category_extra_groups" on public.category_extra_groups;
create policy "owner manage category_extra_groups" on public.category_extra_groups for all
  using (public.has_permission('gerenciar_produtos')) with check (public.has_permission('gerenciar_produtos'));

drop policy if exists "owner manage settings" on public.settings;
create policy "owner manage settings" on public.settings for all
  using (public.has_permission('gerenciar_configuracoes')) with check (public.has_permission('gerenciar_configuracoes'));

drop policy if exists "owner manage delivery_zones" on public.delivery_zones;
create policy "owner manage delivery_zones" on public.delivery_zones for all
  using (public.has_permission('gerenciar_configuracoes')) with check (public.has_permission('gerenciar_configuracoes'));

drop policy if exists "owner manage business_hours" on public.business_hours;
create policy "owner manage business_hours" on public.business_hours for all
  using (public.has_permission('gerenciar_configuracoes')) with check (public.has_permission('gerenciar_configuracoes'));

drop policy if exists "owner manage profiles" on public.profiles;
create policy "owner manage profiles" on public.profiles for all
  using (public.has_permission('gerenciar_usuarios')) with check (public.has_permission('gerenciar_usuarios'));

drop policy if exists "staff manage cash_sessions" on public.cash_sessions;
create policy "staff manage cash_sessions" on public.cash_sessions for all
  using (public.has_permission('gerenciar_caixa')) with check (public.has_permission('gerenciar_caixa'));

drop policy if exists "staff read all orders" on public.orders;
create policy "staff read all orders" on public.orders for select
  using (public.has_permission('ver_pedidos'));

drop policy if exists "staff update orders" on public.orders;
create policy "staff update orders" on public.orders for update
  using (public.has_permission('ver_pedidos'));

drop policy if exists "staff read customers" on public.customers;
create policy "staff read customers" on public.customers for all
  using (public.has_permission('ver_clientes')) with check (public.has_permission('ver_clientes'));
