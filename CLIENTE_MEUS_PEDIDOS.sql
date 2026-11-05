-- ==============================================================================
-- ÁREA DO CLIENTE ("Meus pedidos") — entrada por código enviado no WhatsApp
-- Rodar uma vez no Supabase: SQL Editor > New query > colar tudo > Run.
-- No fim aparece o SEGREDO: copie e cadastre no Netlify como CLIENTE_OTP_SEGREDO.
--
-- Segurança:
--   * Códigos e sessões ficam em tabelas que o site não consegue ler.
--   * Só a função do Netlify (que conhece o segredo) cria códigos.
--   * O cliente só vê os pedidos do telefone que confirmou com o código.
--   * Código de 6 dígitos, vale 10 minutos, 5 tentativas; 1 por minuto e 5 por hora por telefone.
-- ==============================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. Segredo compartilhado com a função do Netlify ---------------------------
create table if not exists public.segredos_internos (
  chave text primary key,
  valor text not null,
  criado_em timestamptz not null default now()
);
alter table public.segredos_internos enable row level security;
revoke all on public.segredos_internos from anon, authenticated;

insert into public.segredos_internos (chave, valor)
values ('cliente_otp', encode(gen_random_bytes(24), 'hex'))
on conflict (chave) do nothing;

-- 2. Códigos enviados e sessões dos clientes ---------------------------------
create table if not exists public.cliente_codigos (
  id bigint generated always as identity primary key,
  telefone text not null,
  codigo_hash text not null,
  expira_em timestamptz not null,
  tentativas int not null default 0,
  usado boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists cliente_codigos_tel_idx on public.cliente_codigos (telefone, criado_em desc);
alter table public.cliente_codigos enable row level security;
revoke all on public.cliente_codigos from anon, authenticated;

create table if not exists public.cliente_sessoes (
  token_hash text primary key,
  telefone text not null,
  expira_em timestamptz not null,
  criado_em timestamptz not null default now()
);
alter table public.cliente_sessoes enable row level security;
revoke all on public.cliente_sessoes from anon, authenticated;

-- 3. Chave do telefone: DDD + últimos 8 dígitos ------------------------------
-- Junta "(41) 99734-9076", "5541997349076", "997349076" e o formato antigo sem o 9.
create or replace function public.cliente_chave_telefone(p text)
returns text
language sql
immutable
as $$
  with d as (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as n),
       s as (select case when length(n) >= 12 and left(n, 2) = '55' then substr(n, 3) else n end as n from d),
       c as (select case when length(n) in (8, 9) then '41' || n else n end as n from s)
  select case when length(n) >= 10 then left(n, 2) || right(n, 8) else '' end from c
$$;

create index if not exists orders_cliente_chave_idx
  on public.orders (public.cliente_chave_telefone(customer_phone));

-- 4. Criar código (só a função do Netlify, com o segredo) ---------------------
create or replace function public.cliente_criar_codigo(p_telefone text, p_segredo text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_chave text := public.cliente_chave_telefone(p_telefone);
  v_codigo text;
begin
  if p_segredo is null or p_segredo <> (select valor from public.segredos_internos where chave = 'cliente_otp') then
    raise exception 'nao_autorizado';
  end if;
  if v_chave = '' then
    raise exception 'telefone_invalido';
  end if;
  if exists (select 1 from public.cliente_codigos where telefone = v_chave and criado_em > now() - interval '60 seconds') then
    raise exception 'aguarde';
  end if;
  if (select count(*) from public.cliente_codigos where telefone = v_chave and criado_em > now() - interval '1 hour') >= 5 then
    raise exception 'limite';
  end if;
  if (select count(*) from public.cliente_codigos where criado_em > now() - interval '1 hour') >= 300 then
    raise exception 'limite';
  end if;

  v_codigo := lpad(((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');

  update public.cliente_codigos set usado = true where telefone = v_chave and not usado;
  insert into public.cliente_codigos (telefone, codigo_hash, expira_em)
  values (v_chave, encode(digest(v_chave || ':' || v_codigo, 'sha256'), 'hex'), now() + interval '10 minutes');
  delete from public.cliente_codigos where criado_em < now() - interval '2 days';

  return v_codigo;
end
$$;
revoke all on function public.cliente_criar_codigo(text, text) from public;
grant execute on function public.cliente_criar_codigo(text, text) to anon, authenticated;

-- 5. Validar código e abrir a sessão (60 dias) ---------------------------------
-- Devolve JSON (sem "raise") para a contagem de tentativas não ser desfeita.
create or replace function public.cliente_validar_codigo(p_telefone text, p_codigo text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_chave text := public.cliente_chave_telefone(p_telefone);
  v_reg public.cliente_codigos%rowtype;
  v_token text;
begin
  select * into v_reg
    from public.cliente_codigos
   where telefone = v_chave and not usado and expira_em > now()
   order by criado_em desc
   limit 1;

  if not found then
    return json_build_object('ok', false, 'erro', 'expirado');
  end if;
  if v_reg.tentativas >= 5 then
    return json_build_object('ok', false, 'erro', 'tentativas');
  end if;

  if v_reg.codigo_hash <> encode(digest(v_chave || ':' || regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g'), 'sha256'), 'hex') then
    update public.cliente_codigos set tentativas = tentativas + 1 where id = v_reg.id;
    return json_build_object('ok', false, 'erro', 'incorreto', 'restantes', greatest(0, 4 - v_reg.tentativas));
  end if;

  update public.cliente_codigos set usado = true where id = v_reg.id;
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into public.cliente_sessoes (token_hash, telefone, expira_em)
  values (encode(digest(v_token, 'sha256'), 'hex'), v_chave, now() + interval '60 days');
  delete from public.cliente_sessoes where expira_em < now();

  return json_build_object('ok', true, 'token', v_token);
end
$$;
revoke all on function public.cliente_validar_codigo(text, text) from public;
grant execute on function public.cliente_validar_codigo(text, text) to anon, authenticated;

-- 6. Pedidos do cliente (últimos 30) -----------------------------------------
create or replace function public.cliente_meus_pedidos(p_token text)
returns json
language plpgsql
security definer
stable
set search_path = public, extensions
as $$
declare
  v_chave text;
begin
  select telefone into v_chave
    from public.cliente_sessoes
   where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and expira_em > now();

  if v_chave is null then
    return json_build_object('ok', false);
  end if;

  return json_build_object(
    'ok', true,
    'pedidos', coalesce((
      select json_agg(p order by p.created_at desc)
        from (
          select o.id, o.tracking_code, o.created_at, o.status, o.order_type, o.payment_method,
                 o.total_amount, o.items, o.delivery_address, o.delivery_zone, o.customer_name
            from public.orders o
           where public.cliente_chave_telefone(o.customer_phone) = v_chave
           order by o.created_at desc
           limit 30
        ) p
    ), '[]'::json)
  );
end
$$;
revoke all on function public.cliente_meus_pedidos(text) from public;
grant execute on function public.cliente_meus_pedidos(text) to anon, authenticated;

-- 7. Sair ----------------------------------------------------------------------
create or replace function public.cliente_sair(p_token text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  delete from public.cliente_sessoes where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;
revoke all on function public.cliente_sair(text) from public;
grant execute on function public.cliente_sair(text) to anon, authenticated;

-- 8. SEGREDO para o Netlify ---------------------------------------------------
-- Copie o valor abaixo e cadastre no Netlify (Site configuration > Environment variables)
-- com o nome CLIENTE_OTP_SEGREDO. Depois faça um novo deploy.
select valor as "CLIENTE_OTP_SEGREDO (copie para o Netlify)"
  from public.segredos_internos
 where chave = 'cliente_otp';
