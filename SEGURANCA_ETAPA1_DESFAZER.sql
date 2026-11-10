-- ==============================================================================
-- DESFAZER A SEGURANÇA — ETAPA 1 (só usar se algo parar de funcionar)
-- Volta as tabelas da Etapa 1 para "acesso total", como estavam antes.
-- O perfil de dono criado e a função pode_gerenciar_usuarios continuam (não atrapalham).
-- ==============================================================================

begin;

do $$
declare
  r record;
  t text;
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

  foreach t in array array['menu_items','categories','extras','paused_items','business_hours','delivery_zones',
                           'category_extra_groups','extra_groups','system_subscription','cash_sessions',
                           'cash_movements','expenses','motoboys','profiles','order_reviews'] loop
    execute format('create policy "Full access %s" on public.%I for all to public using (true) with check (true)', t, t);
  end loop;
end $$;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'excluir_review_por_nome'
  loop
    execute format('grant execute on function %s to public, anon', f.assinatura);
  end loop;
end $$;

commit;
