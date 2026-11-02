-- ============================================================================
-- FINANCEIRO MAIS AÇAÍ SJP
-- Rode no SQL Editor do Supabase do Mais Açaí.
--
-- Guarda os dados do módulo Financeiro do gestor (insumos, preparos, bases,
-- fichas técnicas, custos fixos, lançamentos, histórico de faturamento e
-- parâmetros) em um documento JSON único.
--
-- Acesso: SOMENTE usuários logados no gestor que sejam donos (role 'owner')
-- ou que não tenham perfil cadastrado (o admin principal). A chave pública do
-- site (anon) NÃO lê nem grava nada aqui.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financeiro_maisacai (
  id TEXT PRIMARY KEY DEFAULT 'principal',
  dados JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.financeiro_maisacai ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.financeiro_maisacai FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.financeiro_maisacai TO authenticated;

DROP POLICY IF EXISTS "Financeiro: somente dono" ON public.financeiro_maisacai;
CREATE POLICY "Financeiro: somente dono" ON public.financeiro_maisacai
  FOR ALL TO authenticated
  USING (
    NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role <> 'owner')
  )
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role <> 'owner')
  );

-- Teste (logado como dono, pelo gestor): a aba Financeiro passa a mostrar "Salvo no banco".
