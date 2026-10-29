# Como aplicar esta migration

## 1. Rodar o SQL
No painel do Supabase → **SQL Editor** → cole o conteúdo de
`migrations/20260721000000_plataforma_gestao.sql` → **Run**.

É seguro rodar mesmo que algumas tabelas já existam — o script usa
`if not exists` / `add column if not exists` em tudo, então só completa o
que falta, nunca apaga dados.

## 2. Criar o primeiro usuário "owner"
1. Supabase → **Authentication → Users → Add user** (crie com um e-mail, ex:
   `dono@maisacai.com`, e uma senha forte).
2. Copie o **UUID** desse usuário (aparece na lista de usuários).
3. No **SQL Editor**, rode:
   ```sql
   insert into public.profiles (id, role, full_name)
   values ('COLE_O_UUID_AQUI', 'owner', 'Nome do Dono');
   ```
4. No login do painel (`/admin`), use o e-mail acima (ou só a parte antes do
   `@`, o código completa automaticamente com `@maisacai.com`).

## 3. Criar usuários de atendente/cozinha (quando precisar)
Repita o passo 2, mas com `role` = `'atendente'` ou `'cozinha'`.

## 4. Variáveis de ambiente no Netlify
Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configuradas
em **Netlify → Site settings → Environment variables** (não só no seu
`.env.local`). Sem isso, o site cai no modo "mock" local e nada é salvo de
verdade — foi o que encontrei no código hoje.

## 5. Antes de rodar em produção
Se você já tem pedidos reais na tabela `orders`, rode primeiro esta consulta
para conferir quantos existem, e faça um backup (Supabase → Database →
Backups, ou `pg_dump`) antes de aplicar qualquer migration:
```sql
select count(*) from public.orders;
```
