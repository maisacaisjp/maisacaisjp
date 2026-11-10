-- ==============================================================================
-- ZERAR OS PEDIDOS DE TESTE (antes de começar a atender "valendo")
-- Rodar no Supabase: SQL Editor > New query > colar tudo > Run.
-- Rodar à noite, depois do último teste. O próximo pedido real será o #1.
--
-- APAGA (tudo foi gerado pelos testes, antes de a loja usar o sistema):
--   * todos os pedidos (hoje: #2 a #11, de 05/11 a 10/11/2026)
--   * os caixas e as sangrias/suprimentos de teste
--   * os cadastros de clientes criados por esses pedidos
--   * os saldos de cashback gerados por esses pedidos
--   * os códigos de acesso de teste da área "Meus pedidos"
--
-- NÃO MEXE em: histórico de faturamento do Multipedidos (Financeiro), avaliações
-- importadas, saldos de cashback importados do Multipedidos, bairros, cardápio,
-- fichas técnicas, despesas, configurações e usuários do gestor.
-- ==============================================================================

begin;

-- 0. O que vai ser apagado (aparece no resultado se algo der errado antes do fim)
create temporary table _antes on commit drop as
select
  (select count(*) from public.orders) as pedidos,
  (select count(*) from public.cash_sessions) as caixas,
  (select count(*) from public.customers c where c.phone in (select customer_phone from public.orders)) as clientes_de_teste,
  (select count(*) from public.settings s where s.key like 'cashback\_balance\_%' and s.value ? 'last_order_id') as saldos_de_teste;

-- 1. Cadastros de clientes criados pelos pedidos de teste
delete from public.customers c
 where c.phone in (select customer_phone from public.orders where customer_phone is not null);

-- 2. Saldos de cashback gerados por pedido do sistema (os importados do Multipedidos não têm last_order_id)
delete from public.settings
 where key like 'cashback\_balance\_%'
   and value ? 'last_order_id';

-- 3. Pedidos
delete from public.orders;

-- 4. Caixas de teste (sangrias e suprimentos saem junto)
delete from public.cash_movements;
delete from public.cash_sessions;

-- 5. Códigos e sessões de teste da área "Meus pedidos"
do $$
begin
  if to_regclass('public.cliente_codigos') is not null then execute 'delete from public.cliente_codigos'; end if;
  if to_regclass('public.cliente_sessoes') is not null then execute 'delete from public.cliente_sessoes'; end if;
end $$;

-- 6. Numeração: o próximo pedido real será o #1
select setval(pg_get_serial_sequence('public.orders', 'id'), 1, false);

-- 7. Conferência
select json_build_object(
  'apagado', (select row_to_json(a) from _antes a),
  'agora', json_build_object(
    'pedidos', (select count(*) from public.orders),
    'caixas', (select count(*) from public.cash_sessions),
    'clientes', (select count(*) from public.customers),
    'saldos_cashback_mantidos', (select count(*) from public.settings where key like 'cashback\_balance\_%'),
    'avaliacoes_mantidas', (select count(*) from public.order_reviews),
    'bairros_ativos', (select count(*) from public.delivery_zones where is_active)
  ),
  'proximo_pedido', '#1'
) as conferencia;

commit;
