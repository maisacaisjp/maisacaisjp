CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sangria', 'suprimento')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage cash_movements"
ON cash_movements
FOR ALL
TO public
USING (has_permission('gerenciar_caixa'::text))
WITH CHECK (has_permission('gerenciar_caixa'::text));
