-- ==============================================================================
-- DESFAZER A SEGURANÇA ETAPA 2 (só em emergência, se algo parar de funcionar)
-- Volta pedidos, clientes, caixa e configurações a ficarem abertos como antes da Etapa 2.
-- A Etapa 1 continua valendo. Depois de rodar, avise o Claude para achar a causa.
-- ==============================================================================

begin;

do $$
declare
  t text;
  r record;
begin
  foreach t in array array['orders','customers','cash_sessions','settings'] loop
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', r.policyname, t);
    end loop;
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
    execute format('create policy "Acesso total (desfazer etapa 2)" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Tabelas da Etapa 1 voltam a aceitar qualquer conta logada
do $$
declare
  t text;
begin
  foreach t in array array['menu_items','categories','extras','paused_items','business_hours','delivery_zones',
                           'category_extra_groups','extra_groups','system_subscription'] loop
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'Gestor altera') then
      execute format('alter policy "Gestor altera" on public.%I using (true) with check (true)', t);
    end if;
  end loop;
  foreach t in array array['cash_movements','expenses','motoboys'] loop
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'Somente gestor') then
      execute format('alter policy "Somente gestor" on public.%I using (true) with check (true)', t);
    end if;
  end loop;
end $$;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('financeiro_agente', 'alterar_horario_loja')
  loop
    execute format('grant execute on function %s to anon, authenticated', f.assinatura);
  end loop;
end $$;

commit;

select 'Etapa 2 desfeita' as resultado;
