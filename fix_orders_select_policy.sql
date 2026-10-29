-- Este script corrige o erro de RLS ao retornar o pedido recém-criado (devido ao .select() no frontend).
-- Ele permite que usuários não autenticados (clientes) leiam pedidos criados nos últimos 10 minutos.

DROP POLICY IF EXISTS "public can select recent orders" ON public.orders;

CREATE POLICY "public can select recent orders" ON public.orders 
  FOR SELECT TO anon USING (created_at > now() - interval '10 minutes');
