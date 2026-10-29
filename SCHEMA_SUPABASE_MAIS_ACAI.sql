-- ==============================================================================
-- SCHEMA COMPLETO SUPABASE - MAIS AÇAÍ SJP
-- Execute este script no SQL Editor do seu novo projeto no Supabase
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    ativa BOOLEAN DEFAULT true,
    icone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    preco_promocional NUMERIC(10, 2),
    imagem_url TEXT,
    disponivel BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Complementos e Adicionais
CREATE TABLE IF NOT EXISTS public.complementos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    preco NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    disponivel BOOLEAN DEFAULT true,
    tipo TEXT DEFAULT 'adicional', -- 'incluso' ou 'pago'
    limite_maximo INTEGER DEFAULT 1,
    obrigatorio BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Banners Promocionais
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT,
    subtitulo TEXT,
    imagem_url TEXT NOT NULL,
    link TEXT,
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT,
    telefone TEXT UNIQUE NOT NULL,
    email TEXT,
    total_pedidos INTEGER DEFAULT 0,
    total_gasto NUMERIC(10, 2) DEFAULT 0.00,
    endereco_principal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_pedido SERIAL,
    cliente_nome TEXT NOT NULL,
    cliente_telefone TEXT NOT NULL,
    tipo_entrega TEXT NOT NULL DEFAULT 'entrega', -- 'entrega' ou 'retirada'
    endereco TEXT,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    valor_produtos NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    taxa_entrega NUMERIC(10, 2) DEFAULT 0.00,
    valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    forma_pagamento TEXT NOT NULL DEFAULT 'dinheiro',
    troco_para NUMERIC(10, 2),
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'preparando', 'saiu_entrega', 'entregue', 'cancelado'
    observacoes TEXT,
    origem TEXT DEFAULT 'web', -- 'web', 'whatsapp', 'pdv'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela de Configurações da Loja
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chave TEXT UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabelas do Módulo Financeiro / Caixa
CREATE TABLE IF NOT EXISTS public.sessoes_caixa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_abertura TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_fechamento TIMESTAMP WITH TIME ZONE,
    saldo_inicial NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    saldo_final NUMERIC(10, 2),
    status TEXT NOT NULL DEFAULT 'aberto', -- 'aberto', 'fechado'
    operador_nome TEXT DEFAULT 'Administrador',
    total_entradas NUMERIC(10, 2) DEFAULT 0.00,
    total_saidas NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transacoes_caixa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sessao_id UUID REFERENCES public.sessoes_caixa(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL, -- 'entrada', 'saida', 'sangria', 'suprimento'
    categoria TEXT DEFAULT 'vendas',
    descricao TEXT NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    forma_pagamento TEXT DEFAULT 'dinheiro',
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
    data_transacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Tabelas do Espelho WhatsApp & Agente IA
CREATE TABLE IF NOT EXISTS public.conversas_whatsapp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    last_message TEXT,
    last_sender TEXT DEFAULT 'client', -- 'client', 'bot', 'human'
    unread_count INTEGER DEFAULT 0,
    paused BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mensagens_whatsapp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL,
    sender TEXT NOT NULL, -- 'client', 'bot', 'human'
    text TEXT,
    media_url TEXT,
    media_type TEXT DEFAULT 'text', -- 'text', 'image', 'audio', 'document', 'sticker'
    caption TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mensagens_phone ON public.mensagens_whatsapp(phone);
CREATE INDEX IF NOT EXISTS idx_pedidos_telefone ON public.pedidos(cliente_telefone);

-- 11. Habilitar RLS e Políticas Permissivas para a Operação Delivery
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complementos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversas_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Público para leitura do Cardápio e Criação de Pedidos
CREATE POLICY "Public Read Categorias" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "Public All Categorias" ON public.categorias FOR ALL USING (true);

CREATE POLICY "Public Read Produtos" ON public.produtos FOR SELECT USING (true);
CREATE POLICY "Public All Produtos" ON public.produtos FOR ALL USING (true);

CREATE POLICY "Public Read Complementos" ON public.complementos FOR SELECT USING (true);
CREATE POLICY "Public All Complementos" ON public.complementos FOR ALL USING (true);

CREATE POLICY "Public Read Banners" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Public All Banners" ON public.banners FOR ALL USING (true);

CREATE POLICY "Public All Clientes" ON public.clientes FOR ALL USING (true);
CREATE POLICY "Public All Pedidos" ON public.pedidos FOR ALL USING (true);
CREATE POLICY "Public All Configuracoes" ON public.configuracoes FOR ALL USING (true);
CREATE POLICY "Public All Sessoes" ON public.sessoes_caixa FOR ALL USING (true);
CREATE POLICY "Public All Transacoes" ON public.transacoes_caixa FOR ALL USING (true);
CREATE POLICY "Public All Conversas" ON public.conversas_whatsapp FOR ALL USING (true);
CREATE POLICY "Public All Mensagens" ON public.mensagens_whatsapp FOR ALL USING (true);

-- 12. Buckets de Armazenamento (Storage)
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('produtos', 'produtos', true),
    ('banners', 'banners', true),
    ('comprovantes', 'comprovantes', true),
    ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Storage produtos" ON storage.objects FOR SELECT USING (bucket_id = 'produtos');
CREATE POLICY "Public Insert Storage produtos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'produtos');

CREATE POLICY "Public Read Storage banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Public Insert Storage banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners');

CREATE POLICY "Public Read Storage comprovantes" ON storage.objects FOR SELECT USING (bucket_id = 'comprovantes');
CREATE POLICY "Public Insert Storage comprovantes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'comprovantes');

CREATE POLICY "Public Read Storage audio" ON storage.objects FOR SELECT USING (bucket_id = 'audio');
CREATE POLICY "Public Insert Storage audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio');

-- 13. Inserção Inicial de Configurações Básicas
INSERT INTO public.configuracoes (chave, valor)
VALUES 
    ('dados_loja', '{
        "nome": "Mais Açaí SJP",
        "telefone": "+55 41 99999-9999",
        "taxa_entrega": 5.00,
        "tempo_estimado": "35-50 min",
        "aberto": true
    }'::jsonb),
    ('pagamento', '{
        "pix_chave": "contato@maisacai.com.br",
        "aceita_dinheiro": true,
        "aceita_cartao": true
    }'::jsonb)
ON CONFLICT (chave) DO NOTHING;
