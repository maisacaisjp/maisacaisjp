-- Adiciona a coluna cash_session_id na tabela orders
ALTER TABLE public.orders
ADD COLUMN cash_session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL;

-- Cria um índice para otimizar as buscas por caixa
CREATE INDEX idx_orders_cash_session_id ON public.orders(cash_session_id);
