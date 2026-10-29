-- ==============================================================================
-- Migração Versão 2.0: Tabela cash_movements para Sangria e Suprimento
-- Execute este script no SQL Editor do Supabase da Produção
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sangria', 'suprimento')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (permissivas para permitir leitura e gravação no painel administrativo)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cash_movements' AND policyname = 'Permitir leitura cash_movements'
    ) THEN
        CREATE POLICY "Permitir leitura cash_movements"
        ON public.cash_movements
        FOR SELECT
        TO authenticated, anon
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cash_movements' AND policyname = 'Permitir insercao cash_movements'
    ) THEN
        CREATE POLICY "Permitir insercao cash_movements"
        ON public.cash_movements
        FOR INSERT
        TO authenticated, anon
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cash_movements' AND policyname = 'Permitir atualizacao cash_movements'
    ) THEN
        CREATE POLICY "Permitir atualizacao cash_movements"
        ON public.cash_movements
        FOR UPDATE
        TO authenticated, anon
        USING (true)
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cash_movements' AND policyname = 'Permitir exclusao cash_movements'
    ) THEN
        CREATE POLICY "Permitir exclusao cash_movements"
        ON public.cash_movements
        FOR DELETE
        TO authenticated, anon
        USING (true);
    END IF;
END $$;

-- Habilitar Realtime para cash_movements
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_movements;
