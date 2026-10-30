-- =====================================================================
-- PRAZO CERTO — schema multiempresa (rodar no SQL Editor do Supabase)
-- Cada empresa só enxerga os próprios dados (Row Level Security).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Empresas (os seus clientes pagantes) ----------
create table if not exists public.empresas (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  documento        text,                         -- CNPJ (opcional)
  ativo            boolean not null default true, -- false = acesso bloqueado (ex.: mensalidade atrasada)
  plano            text not null default 'mensal',
  valor_mensal     numeric(10,2),
  whatsapp_numeros text[] not null default '{}', -- números autorizados a consultar pelo WhatsApp (só dígitos, com 55)
  observacoes      text,
  created_at       timestamptz not null default now()
);

-- ---------- Perfis (usuário do login -> empresa) ----------
create table if not exists public.perfis (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  empresa_id    uuid references public.empresas(id) on delete cascade,
  nome          text,
  email         text,
  papel         text not null default 'admin' check (papel in ('admin','membro')),
  is_superadmin boolean not null default false,  -- você (dono da plataforma)
  created_at    timestamptz not null default now()
);
create index if not exists perfis_empresa_idx on public.perfis(empresa_id);

-- ---------- Clientes da empresa (indústrias, comércios atendidos) ----------
create table if not exists public.clientes (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  nome        text not null,
  documento   text,
  contato     text,
  telefone    text,
  email       text,
  endereco    text,
  observacoes text,
  created_at  timestamptz not null default now()
);
create index if not exists clientes_empresa_idx on public.clientes(empresa_id);

-- ---------- Itens com vencimento (documentos, manutenções, contratos) ----------
create table if not exists public.itens (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references public.empresas(id) on delete cascade,
  cliente_id        uuid references public.clientes(id) on delete set null,
  tipo              text not null default 'documento'
                    check (tipo in ('documento','manutencao','contrato','outro','acompanhamento')),
  titulo            text not null,
  descricao         text,
  vencimento        date not null,
  recorrencia_meses int check (recorrencia_meses is null or recorrencia_meses > 0),
  antecedencia_dias int not null default 15 check (antecedencia_dias between 0 and 365),
  status            text not null default 'ativo'
                    check (status in ('ativo','renovado','concluido')),
  finalizado_em     timestamptz,
  item_anterior_id  uuid references public.itens(id) on delete set null,
  anexo_path        text,
  anexo_nome        text,
  google_event_id   text,
  adiamentos        int not null default 0,  -- acompanhamentos: quantas vezes foi adiado
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists itens_empresa_venc_idx on public.itens(empresa_id, status, vencimento);
create index if not exists itens_cliente_idx on public.itens(cliente_id);
create index if not exists itens_anterior_idx on public.itens(item_anterior_id);
create index if not exists itens_created_by_idx on public.itens(created_by);

-- ---------- Conexão Google Calendar (1 agenda por empresa) ----------
-- Guarda o refresh token: NUNCA exposta ao navegador (sem policies = só service role).
create table if not exists public.google_conexoes (
  empresa_id    uuid primary key references public.empresas(id) on delete cascade,
  refresh_token text not null,
  google_email  text,
  calendar_id   text not null default 'primary',
  conectado_por uuid references auth.users(id) on delete set null,
  updated_at    timestamptz not null default now()
);
create index if not exists google_conexoes_por_idx on public.google_conexoes(conectado_por);

-- ---------- Funções auxiliares ----------
-- Fica num schema privado (fora da API pública); usada pelas policies.
create schema if not exists privado;
grant usage on schema privado to authenticated;

create or replace function privado.minha_empresa()
returns uuid language sql stable security definer set search_path = public as $$
  select empresa_id from public.perfis where user_id = auth.uid()
$$;
revoke all on function privado.minha_empresa() from public, anon;
grant execute on function privado.minha_empresa() to authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists itens_updated_at on public.itens;
create trigger itens_updated_at before update on public.itens
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
alter table public.empresas        enable row level security;
alter table public.perfis          enable row level security;
alter table public.clientes        enable row level security;
alter table public.itens           enable row level security;
alter table public.google_conexoes enable row level security;

drop policy if exists empresas_select on public.empresas;
create policy empresas_select on public.empresas
  for select to authenticated using (id = (select privado.minha_empresa()));

drop policy if exists perfis_select on public.perfis;
create policy perfis_select on public.perfis
  for select to authenticated using (user_id = (select auth.uid()) or empresa_id = (select privado.minha_empresa()));

drop policy if exists clientes_all on public.clientes;
create policy clientes_all on public.clientes
  for all to authenticated using (empresa_id = (select privado.minha_empresa()))
  with check (empresa_id = (select privado.minha_empresa()));

drop policy if exists itens_all on public.itens;
create policy itens_all on public.itens
  for all to authenticated using (empresa_id = (select privado.minha_empresa()))
  with check (empresa_id = (select privado.minha_empresa()));

-- (google_conexoes: sem policies de propósito)

-- ---------- Storage: anexos (PDFs de laudos, PMOC, ART, contratos) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('anexos', 'anexos', false, 10485760)
on conflict (id) do nothing;

drop policy if exists anexos_rw on storage.objects;
create policy anexos_rw on storage.objects
  for all to authenticated
  using (bucket_id = 'anexos' and (storage.foldername(name))[1] = (select privado.minha_empresa())::text)
  with check (bucket_id = 'anexos' and (storage.foldername(name))[1] = (select privado.minha_empresa())::text);

-- =====================================================================
-- Migração 2: onboarding (quiz de boas-vindas) e lembretes por e-mail
-- =====================================================================
alter table public.empresas
  add column if not exists cidade text,
  add column if not exists segmento text,
  add column if not exists responsavel text,
  add column if not exists emails_lembrete text[] not null default '{}',
  add column if not exists antecedencia_padrao int not null default 30 check (antecedencia_padrao between 0 and 365),
  add column if not exists modelos jsonb not null default '[]'::jsonb,
  add column if not exists lembrete_email_ativo boolean not null default true,
  add column if not exists onboarding_concluido boolean not null default false;

create table if not exists public.lembretes_enviados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  item_id uuid not null references public.itens(id) on delete cascade,
  marco text not null,
  canal text not null default 'email',
  destinatarios text[] not null default '{}',
  enviado_em timestamptz not null default now(),
  unique (item_id, marco, canal)
);
create index if not exists lembretes_empresa_idx on public.lembretes_enviados(empresa_id, enviado_em desc);
alter table public.lembretes_enviados enable row level security;
drop policy if exists lembretes_select on public.lembretes_enviados;
create policy lembretes_select on public.lembretes_enviados
  for select to authenticated using (empresa_id = (select privado.minha_empresa()));

-- Migração 3: obriga troca da senha provisória no primeiro acesso
alter table public.perfis add column if not exists trocar_senha boolean not null default false;

-- Migração 4 (30/10/2026): acompanhamentos (lembretes curtos de retorno/cobrança)
-- alter table public.itens drop constraint if exists itens_tipo_check;
-- alter table public.itens add constraint itens_tipo_check
--   check (tipo in ('documento','manutencao','contrato','outro','acompanhamento'));
-- alter table public.itens add column if not exists adiamentos int not null default 0;
