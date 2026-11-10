-- ==============================================================================
-- ZERAR SÓ OS PEDIDOS DE TESTE
-- Rodar no Supabase: SQL Editor > New query > colar tudo > Run.
--
-- APAGA APENAS os pedidos de teste #2, #3, #4, #6, #9, #10, #11 e #12 (05/11 a 10/11/2026).
-- O pedido #13 (Isabele, 10/11) é REAL e fica, assim como qualquer pedido depois dele.
-- Também apaga o caixa de teste aberto desde 08/11 SÓ SE ele não tiver pedido real,
-- os cadastros e saldos de cashback que existem SÓ por causa dos testes, e os códigos
-- de teste da área "Meus pedidos".
--
-- NÃO MEXE em: pedidos reais, histórico do Multipedidos, avaliações, saldos de cashback
-- de clientes reais, bairros, cardápio, fichas, despesas, configurações e usuários.
-- A numeração continua de onde está (não volta para #1, porque já existe pedido real).
-- ==============================================================================

begin;

create temporary table _teste on commit drop as
select id, customer_phone, cash_session_id from public.orders where id in (2, 3, 4, 6, 9, 10, 11, 12);

create temporary table _antes on commit drop as
select
  (select count(*) from _teste) as pedidos_de_teste,
  (select count(*) from public.orders where id not in (select id from _teste)) as pedidos_reais_mantidos;

-- 1. Cadastros de cliente que só existem por causa dos testes (sem nenhum pedido real)
delete from public.customers c
 where c.phone in (select customer_phone from _teste where customer_phone is not null)
   and not exists (select 1 from public.orders o where o.customer_phone = c.phone and o.id not in (select id from _teste));

-- 2. Saldos de cashback cujo último movimento foi um pedido de teste
--    (cliente real que comprou depois mantém o saldo)
delete from public.settings
 where key like 'cashback\_balance\_%'
   and value ? 'last_order_id'
   and (value ->> 'last_order_id') in (select id::text from _teste);

-- 3. Pedidos de teste
delete from public.orders where id in (select id from _teste);

-- 4. Caixas que ficaram sem nenhum pedido (os de teste); caixa com pedido real fica
delete from public.cash_sessions s
 where not exists (select 1 from public.orders o where o.cash_session_id = s.id)
   and s.opened_at < '2026-11-10 23:59:59-03';

-- 5. Códigos de acesso já vencidos da área "Meus pedidos" (sessões de clientes reais ficam)
do $$
begin
  if to_regclass('public.cliente_codigos') is not null then
    execute 'delete from public.cliente_codigos where expira_em < now()';
  end if;
end $$;

-- 6. Conferência
select json_build_object(
  'antes', (select row_to_json(a) from _antes a),
  'pedidos_que_ficaram', (select json_agg(json_build_object('pedido', id, 'cliente', customer_name, 'total', total_amount, 'status', status) order by id) from public.orders),
  'caixas', (select json_agg(json_build_object('status', status, 'aberto_em', opened_at)) from public.cash_sessions),
  'saldos_cashback', (select count(*) from public.settings where key like 'cashback\_balance\_%'),
  'avaliacoes', (select count(*) from public.order_reviews)
) as conferencia;

commit;
