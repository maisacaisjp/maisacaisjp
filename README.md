<div align="center">
<img width="160" alt="Mais Açaí" src="public/logo.png" />
</div>

# Mais Açaí SJP — Cardápio Digital & Delivery

Cardápio digital do **Mais Açaí** (desde 2016), em São José dos Pinhais - PR. O cliente monta o pedido de açaís, combos, milkshakes e kits, paga via PIX e finaliza pelo WhatsApp. Inclui painel administrativo com PDV, caixa, clientes e relatórios.

- **Stack:** React, Vite, Tailwind CSS, Supabase, Netlify Functions
- **WhatsApp:** (41) 99734-9076
- **Instagram:** [@maisacaisjp](https://www.instagram.com/maisacaisjp/)
- **Endereço:** Rua Almirante Alexandrino, 909 sala 02 - Parque da Fonte, São José dos Pinhais - PR

## Rodando localmente

**Pré-requisito:** Node.js

1. Instale as dependências:
   `npm install`
2. Copie [.env.example](.env.example) para `.env` e preencha os dados do projeto Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) e da Evolution API.
3. Rode o schema e o seed do cardápio no Supabase: [SCHEMA_COMPLETO_MAIS_ACAI_SJP.sql](SCHEMA_COMPLETO_MAIS_ACAI_SJP.sql)
4. Inicie o app:
   `npm run dev` (porta 3001)

## Estrutura

- [src/data/menu.ts](src/data/menu.ts) — produtos, preços e taxas de entrega
- [public/produtos/](public/produtos/) — fotos dos produtos
- [src/pages/AdminDashboard.tsx](src/pages/AdminDashboard.tsx) — painel administrativo e PDV
- [netlify/functions/](netlify/functions/) — integrações de WhatsApp e agente
