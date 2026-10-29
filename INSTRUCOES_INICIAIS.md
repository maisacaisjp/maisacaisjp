# 🍇 GUIA DE ATIVAÇÃO RÁPIDA - MAIS AÇAÍ SJP

Parabéns! Toda a estrutura base do ecossistema já foi copiada e organizada para a sua nova pasta:
`C:\Users\herek\OneDrive\Área de Trabalho\cardapiomaisacaisjp`

---

## ⚡ Passo 1: No Supabase (Novo Projeto)
1. Crie o novo projeto no [Supabase](https://supabase.com) com o nome: `mais-acai-db`.
2. Abra o menu **SQL Editor**.
3. Abra o arquivo [SCHEMA_SUPABASE_MAIS_ACAI.sql](file:///C:/Users/herek/OneDrive/Área%20de%20Trabalho/cardapiomaisacaisjp/SCHEMA_SUPABASE_MAIS_ACAI.sql), copie todo o conteúdo e execute (clique em **Run**).
   - *Isso criará automaticamente todas as tabelas (`produtos`, `categorias`, `pedidos`, `clientes`, `conversas_whatsapp`), permissões de segurança e os buckets de armazenamento de fotos!*
4. Em **Project Settings > API**, copie:
   - `Project URL`
   - `anon public key`
   - `service_role secret key`

---

## 🔑 Passo 2: No seu Projeto Local (.env)
1. Na pasta `cardapiomaisacaisjp`, crie o arquivo `.env` (baseado no `.env.example`).
2. Cole as chaves que você copiou do Supabase:
   ```env
   VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
   ```

---

## 🚀 Passo 3: No GitHub (Novo Repositório)
1. Crie um novo repositório privado no seu GitHub (ex: `cardapio-mais-acai-sjp`).
2. Abra o terminal na pasta `cardapiomaisacaisjp` e execute:
   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "feat: setup inicial ecossistema mais acai sjp"
   git remote add origin https://github.com/SEU_USUARIO/cardapio-mais-acai-sjp.git
   git push -u origin main
   git checkout -b dev
   git push -u origin dev
   ```

---

## ☁️ Passo 4: No Netlify (Hospedagem & Webhook)
1. Acesse o [Netlify](https://netlify.com) e clique em **Add new site > Import an existing project**.
2. Conecte ao seu novo repositório `cardapio-mais-acai-sjp`.
3. Configure as variáveis em **Site configuration > Environment variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Publique! O site e o webhook `/api/whatsapp` já nascerão funcionando.

---

## 🤖 Passo 5: No n8n (Agente IA do WhatsApp)
1. No seu n8n, crie um novo workflow e selecione **Import from File**.
2. Escolha o arquivo [FLUXO_N8N_MAIS_ACAI.json](file:///C:/Users/herek/OneDrive/Área%20de%20Trabalho/cardapiomaisacaisjp/FLUXO_N8N_MAIS_ACAI.json).
3. Apenas atualize as credenciais do Supabase e o nome da instância do WhatsApp!
