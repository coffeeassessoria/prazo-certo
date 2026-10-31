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


-- Demandas de climatização (2026-10-30)
-- Aplicar antes de publicar o código. Transação única; seguro reaplicar.
begin;

alter table public.itens add column if not exists categoria_demanda text not null default 'outro'
  check (categoria_demanda in ('orcamento','agendamento','peca','documento','pos_venda','outro'));
alter table public.itens add column if not exists etapa_demanda text not null default 'a_fazer'
  check (etapa_demanda in ('a_fazer','em_andamento','aguardando_cliente','aguardando_fornecedor','concluida','cancelada'));
alter table public.itens add column if not exists responsavel_id uuid references public.perfis(user_id) on delete restrict;
alter table public.itens add column if not exists proxima_acao text;
alter table public.itens add column if not exists vinculo_item_id uuid references public.itens(id) on delete set null;

-- A data de itens.vencimento continua sendo o retorno do acompanhamento.
-- O prazo do documento/manutenção fica no item vinculado, sem ser alterado.
update public.itens i set
  proxima_acao = coalesce(nullif(i.proxima_acao, ''), i.titulo),
  responsavel_id = coalesce(i.responsavel_id,
    (select p.user_id from public.perfis p where p.empresa_id = i.empresa_id
      order by (p.user_id = i.created_by) desc, p.created_at, p.user_id limit 1)),
  etapa_demanda = case when i.status <> 'ativo' then 'concluida' else i.etapa_demanda end
where i.tipo = 'acompanhamento' and i.proxima_acao is null;

create index if not exists itens_responsavel_retorno_idx on public.itens(empresa_id, responsavel_id, vencimento)
  where tipo = 'acompanhamento' and status = 'ativo';
create index if not exists itens_vinculo_idx on public.itens(vinculo_item_id);

create table if not exists public.demanda_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  item_id uuid not null references public.itens(id) on delete cascade,
  autor_id uuid references auth.users(id) on delete set null,
  autor_nome text not null,
  tipo text not null check (tipo in ('criacao','alteracao','contato')),
  descricao text not null,
  dados jsonb not null default '{}',
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists demanda_eventos_item_idx on public.demanda_eventos(empresa_id, item_id, created_at desc);
alter table public.demanda_eventos enable row level security;
drop policy if exists demanda_eventos_select on public.demanda_eventos;
create policy demanda_eventos_select on public.demanda_eventos for select to authenticated
  using (empresa_id = (select privado.minha_empresa()));
grant select on public.demanda_eventos to authenticated;
-- Histórico imutável para o cliente; escrita só pelas funções verificadas.
revoke insert, update, delete on public.demanda_eventos from authenticated, anon;

create or replace function privado.validar_demanda() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.tipo = 'acompanhamento' and new.tipo <> 'acompanhamento' then
    raise exception 'Uma demanda não pode ser convertida em vencimento.';
  end if;
  if new.tipo <> 'acompanhamento' then return new; end if;
  if auth.uid() is not null and not exists (
    select 1 from public.perfis p join public.empresas e on e.id = p.empresa_id
    where p.user_id = auth.uid() and p.empresa_id = new.empresa_id and e.ativo
  ) then raise exception 'Entre em uma empresa ativa para alterar a demanda.'; end if;
  if tg_op = 'UPDATE' and new.empresa_id <> old.empresa_id then
    raise exception 'Não é possível transferir uma demanda para outra empresa.';
  end if;
  if length(trim(new.titulo)) not between 1 and 180 then
    raise exception 'Escreva um título com até 180 caracteres.';
  end if;
  if new.responsavel_id is not null and not exists (
    select 1 from public.perfis p where p.user_id = new.responsavel_id and p.empresa_id = new.empresa_id
  ) then raise exception 'Escolha um responsável da sua empresa.'; end if;
  if new.cliente_id is not null and not exists (
    select 1 from public.clientes c where c.id = new.cliente_id and c.empresa_id = new.empresa_id
  ) then raise exception 'Escolha um cliente da sua empresa.'; end if;
  if new.vinculo_item_id is not null and not exists (
    select 1 from public.itens i where i.id = new.vinculo_item_id and i.empresa_id = new.empresa_id
      and i.tipo <> 'acompanhamento' and i.id <> new.id
      and i.cliente_id is not distinct from new.cliente_id
  ) then raise exception 'Escolha um vencimento do mesmo cliente e da sua empresa.'; end if;
  -- Compatibilidade com ações antigas de concluir/reabrir.
  if tg_op = 'UPDATE' and new.status is distinct from old.status and new.etapa_demanda = old.etapa_demanda then
    new.etapa_demanda := case when new.status = 'ativo' then 'a_fazer' else 'concluida' end;
  end if;
  new.status := case when new.etapa_demanda in ('concluida','cancelada') then 'concluido' else 'ativo' end;
  new.finalizado_em := case when new.status = 'ativo' then null else coalesce(new.finalizado_em, now()) end;
  if new.status = 'ativo' and (new.responsavel_id is null or nullif(trim(new.proxima_acao), '') is null) then
    raise exception 'Informe o responsável e a próxima ação para manter a demanda aberta.';
  end if;
  if length(new.proxima_acao) > 240 or length(new.descricao) > 8000 then
    raise exception 'Use até 240 caracteres na próxima ação e 8000 na observação.';
  end if;
  return new;
end $$;
revoke all on function privado.validar_demanda() from public;
drop trigger if exists validar_demanda on public.itens;
create trigger validar_demanda before insert or update on public.itens
  for each row execute function privado.validar_demanda();

create or replace function privado.auditar_demanda() returns trigger
language plpgsql security definer set search_path = '' as $$
declare anterior jsonb; atual jsonb; nome_autor text;
begin
  if new.tipo <> 'acompanhamento' then return new; end if;
  atual := jsonb_build_object('titulo',new.titulo,'descricao',new.descricao,'cliente_id',new.cliente_id,
    'etapa',new.etapa_demanda,'categoria',new.categoria_demanda,'responsavel_id',new.responsavel_id,
    'proxima_acao',new.proxima_acao,'retorno',new.vencimento,'vinculo_item_id',new.vinculo_item_id);
  if tg_op = 'UPDATE' then
    anterior := jsonb_build_object('titulo',old.titulo,'descricao',old.descricao,'cliente_id',old.cliente_id,
      'etapa',old.etapa_demanda,'categoria',old.categoria_demanda,'responsavel_id',old.responsavel_id,
      'proxima_acao',old.proxima_acao,'retorno',old.vencimento,'vinculo_item_id',old.vinculo_item_id);
    if anterior = atual then return new; end if;
  end if;
  select coalesce(p.nome,p.email) into nome_autor from public.perfis p where p.user_id = auth.uid();
  insert into public.demanda_eventos(empresa_id,item_id,autor_id,autor_nome,tipo,descricao,dados)
  values(new.empresa_id,new.id,auth.uid(),coalesce(nome_autor,'Sistema'),
    case when tg_op = 'INSERT' then 'criacao' else 'alteracao' end,
    case when tg_op = 'INSERT' then 'Demanda criada' else 'Demanda atualizada' end,
    jsonb_build_object('anterior',anterior,'atual',atual));
  return new;
end $$;
revoke all on function privado.auditar_demanda() from public;
drop trigger if exists auditar_demanda on public.itens;
create trigger auditar_demanda after insert or update on public.itens
  for each row execute function privado.auditar_demanda();

-- Atualização e registro do contato na mesma transação, com bloqueio da linha.
create or replace function public.salvar_demanda(p_id uuid, p_dados jsonb, p_nota text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare empresa uuid; autor uuid := auth.uid(); nome_autor text; atual public.itens; item_id uuid;
  retorno date; etapa text;
begin
  select p.empresa_id, coalesce(p.nome,p.email,'Usuário') into empresa,nome_autor
    from public.perfis p join public.empresas e on e.id = p.empresa_id
    where p.user_id = autor and e.ativo;
  if empresa is null then raise exception 'Entre em uma empresa ativa para salvar a demanda.'; end if;
  if p_id is not null then
    select * into atual from public.itens i where i.id = p_id and i.empresa_id = empresa
      and i.tipo = 'acompanhamento' for update;
    if not found then raise exception 'Demanda não encontrada na sua empresa.'; end if;
  end if;
  if p_dados ? 'nota_obrigatoria' and nullif(trim(p_nota),'') is null then
    raise exception 'Conte o que aconteceu no contato.';
  end if;
  if length(p_nota) > 4000 then raise exception 'Use até 4000 caracteres no contato.'; end if;
  etapa := coalesce(p_dados->>'etapa_demanda',atual.etapa_demanda,'a_fazer');
  retorno := coalesce((p_dados->>'vencimento')::date,atual.vencimento);
  if retorno is null then raise exception 'Escolha a data da próxima ação.'; end if;
  if etapa not in ('concluida','cancelada') and retorno < (now() at time zone 'America/Cuiaba')::date
    and (p_id is null or retorno is distinct from atual.vencimento or atual.status <> 'ativo' or p_dados ? 'nota_obrigatoria') then
    raise exception 'Escolha hoje ou uma data futura para o próximo retorno.';
  end if;
  if p_id is null then
    insert into public.itens(empresa_id,created_by,tipo,titulo,descricao,cliente_id,vencimento,
      antecedencia_dias,categoria_demanda,etapa_demanda,responsavel_id,proxima_acao,vinculo_item_id)
    values(empresa,autor,'acompanhamento',trim(p_dados->>'titulo'),nullif(trim(p_dados->>'descricao'),''),
      (p_dados->>'cliente_id')::uuid,retorno,0,coalesce(p_dados->>'categoria_demanda','outro'),etapa,
      (p_dados->>'responsavel_id')::uuid,trim(p_dados->>'proxima_acao'),(p_dados->>'vinculo_item_id')::uuid)
    returning id into item_id;
  else
    update public.itens set
      titulo = case when p_dados ? 'titulo' then trim(p_dados->>'titulo') else atual.titulo end,
      descricao = case when p_dados ? 'descricao' then nullif(trim(p_dados->>'descricao'),'') else atual.descricao end,
      cliente_id = case when p_dados ? 'cliente_id' then (p_dados->>'cliente_id')::uuid else atual.cliente_id end,
      vencimento = retorno, etapa_demanda = etapa,
      categoria_demanda = coalesce(p_dados->>'categoria_demanda',atual.categoria_demanda),
      responsavel_id = case when p_dados ? 'responsavel_id' then (p_dados->>'responsavel_id')::uuid else atual.responsavel_id end,
      proxima_acao = case when p_dados ? 'proxima_acao' then trim(p_dados->>'proxima_acao') else atual.proxima_acao end,
      vinculo_item_id = case when p_dados ? 'vinculo_item_id' then (p_dados->>'vinculo_item_id')::uuid else atual.vinculo_item_id end
    where id = p_id and empresa_id = empresa returning id into item_id;
  end if;
  if nullif(trim(p_nota),'') is not null then
    insert into public.demanda_eventos(empresa_id,item_id,autor_id,autor_nome,tipo,descricao)
    values(empresa,item_id,autor,nome_autor,'contato',trim(p_nota));
  end if;
  return item_id;
end $$;
revoke all on function public.salvar_demanda(uuid,jsonb,text) from public, anon;
grant execute on function public.salvar_demanda(uuid,jsonb,text) to authenticated;

commit;

-- PMOC e documentos timbrados (2026-10-30)
-- PMOC, unidades, equipamentos, identidade e PDFs privados. Aplicar após a migração de demandas.
begin;
create or replace function privado.empresa_ativa() returns uuid language sql stable security definer set search_path='' as $$
  select p.empresa_id from public.perfis p join public.empresas e on e.id=p.empresa_id where p.user_id=auth.uid() and e.ativo
$$;
create or replace function privado.admin_empresa() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.perfis p where p.user_id=auth.uid() and p.empresa_id=privado.empresa_ativa() and (p.papel='admin' or p.is_superadmin))
$$;
revoke all on function privado.empresa_ativa(), privado.admin_empresa() from public;
grant execute on function privado.empresa_ativa(), privado.admin_empresa() to authenticated;

create unique index if not exists clientes_id_empresa_uidx on public.clientes(id,empresa_id);
create table if not exists public.documento_identidades (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  nome text not null check(length(trim(nome)) between 1 and 160),
  documento text not null default '' check(length(documento)<=40),
  endereco text not null default '' check(length(endereco)<=500),
  telefone text not null default '' check(length(telefone)<=80),
  email text not null default '' check(length(email)<=160),
  logo_path text check(logo_path is null or logo_path ~ ('^'||empresa_id::text||'/logos/[a-f0-9-]{36}\.png$')),
  updated_at timestamptz not null default now()
);
create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
  cliente_id uuid not null, nome text not null check(length(trim(nome)) between 1 and 160),
  endereco text not null default '' check(length(endereco)<=500),
  representante_nome text not null default '' check(length(representante_nome)<=160),
  representante_documento text not null default '' check(length(representante_documento)<=40),
  representante_papel text not null default 'preposto' check(representante_papel in ('proprietario','locatario','preposto')),
  representante_endereco text not null default '' check(length(representante_endereco)<=500),
  representante_contato text not null default '' check(length(representante_contato)<=200),
  created_at timestamptz not null default now(), unique(id,empresa_id),
  foreign key(cliente_id,empresa_id) references public.clientes(id,empresa_id) on delete restrict
);
create table if not exists public.ambientes (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id), unidade_id uuid not null,
  nome text not null check(length(trim(nome)) between 1 and 160), atividade text not null default '' check(length(atividade)<=300),
  area_m2 numeric(12,2) check(area_m2>0), ocupantes_fixos int check(ocupantes_fixos>=0), ocupantes_flutuantes int check(ocupantes_flutuantes>=0),
  unique(id,unidade_id,empresa_id), foreign key(unidade_id,empresa_id) references public.unidades(id,empresa_id) on delete restrict
);
create table if not exists public.equipamentos (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id), unidade_id uuid not null, ambiente_id uuid not null,
  tag text not null check(length(trim(tag)) between 1 and 100), tipo text not null default 'split' check(tipo in ('split','janela','cassete','piso_teto','central','outro')),
  marca text not null default '' check(length(marca)<=100), modelo text not null default '' check(length(modelo)<=160),
  serie text not null default '' check(length(serie)<=160), capacidade_btu numeric(12,2) check(capacidade_btu>0), observacoes text not null default '' check(length(observacoes)<=2000),
  unique(id,empresa_id), unique(empresa_id,unidade_id,tag),
  foreign key(ambiente_id,unidade_id,empresa_id) references public.ambientes(id,unidade_id,empresa_id) on delete restrict
);
create table if not exists public.pmoc_planos (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id), unidade_id uuid not null,
  dados jsonb not null check(jsonb_typeof(dados)='object' and octet_length(dados::text)<=150000),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,empresa_id), foreign key(unidade_id,empresa_id) references public.unidades(id,empresa_id) on delete restrict
);
create table if not exists public.pmoc_execucoes (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id), plano_id uuid not null,
  rotina_id text not null, atividade text not null, equipamento_tag text, data_execucao date not null,
  executado_por text not null check(length(trim(executado_por)) between 1 and 160), aprovado_por text check(length(aprovado_por)<=160),
  relato text not null check(length(trim(relato)) between 1 and 4000), registrado_por uuid references auth.users(id), created_at timestamptz not null default clock_timestamp(),
  foreign key(plano_id,empresa_id) references public.pmoc_planos(id,empresa_id) on delete restrict
);
create table if not exists public.pmoc_versoes (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id), plano_id uuid not null,
  numero int not null, estado text not null check(estado in ('rascunho','para_assinatura')),
  snapshot jsonb not null, arquivo_path text not null unique,
  arquivo_status text not null default 'aguardando' check(arquivo_status in ('aguardando','pronto','falha')),
  sha256 text check(sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default clock_timestamp(), unique(plano_id,numero),
  foreign key(plano_id,empresa_id) references public.pmoc_planos(id,empresa_id) on delete restrict
);
create index if not exists unidades_empresa_cliente_idx on public.unidades(empresa_id,cliente_id);
create index if not exists ambientes_empresa_unidade_idx on public.ambientes(empresa_id,unidade_id);
create index if not exists equipamentos_empresa_unidade_idx on public.equipamentos(empresa_id,unidade_id);
create index if not exists pmoc_empresa_unidade_idx on public.pmoc_planos(empresa_id,unidade_id);
create index if not exists pmoc_execucoes_plano_idx on public.pmoc_execucoes(empresa_id,plano_id,data_execucao desc);
create index if not exists pmoc_versoes_plano_idx on public.pmoc_versoes(empresa_id,plano_id,numero desc);

do $$ declare tabela text; begin
  foreach tabela in array array['documento_identidades','unidades','ambientes','equipamentos','pmoc_planos','pmoc_execucoes','pmoc_versoes'] loop
    execute format('alter table public.%I enable row level security',tabela);
    execute format('drop policy if exists empresa_select on public.%I',tabela);
    execute format('create policy empresa_select on public.%I for select to authenticated using(empresa_id=(select privado.empresa_ativa()))',tabela);
    execute format('grant select on public.%I to authenticated',tabela);
    execute format('revoke insert,update,delete on public.%I from authenticated,anon',tabela);
  end loop;
  foreach tabela in array array['unidades','ambientes','equipamentos','documento_identidades'] loop
    execute format('drop policy if exists empresa_insert on public.%I',tabela);
    execute format('drop policy if exists empresa_update on public.%I',tabela);
    execute format('create policy empresa_insert on public.%I for insert to authenticated with check(empresa_id=(select privado.empresa_ativa()) %s)',tabela,case when tabela='documento_identidades' then 'and (select privado.admin_empresa())' else '' end);
    execute format('create policy empresa_update on public.%I for update to authenticated using(empresa_id=(select privado.empresa_ativa()) %s) with check(empresa_id=(select privado.empresa_ativa()) %s)',tabela,case when tabela='documento_identidades' then 'and (select privado.admin_empresa())' else '' end,case when tabela='documento_identidades' then 'and (select privado.admin_empresa())' else '' end);
    execute format('grant insert,update on public.%I to authenticated',tabela);
  end loop;
end $$;

create or replace function public.salvar_pmoc(p_id uuid,p_unidade uuid,p_dados jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare emp uuid:=privado.empresa_ativa(); atual public.pmoc_planos; rotina jsonb; ids text[]:='{}'; chave text;
begin
  if emp is null then raise exception 'Entre em uma empresa ativa.'; end if;
  if not exists(select 1 from public.unidades where id=p_unidade and empresa_id=emp) then raise exception 'Escolha uma unidade da sua empresa.'; end if;
  select * into atual from public.pmoc_planos where id=p_id for update;
  if found and (atual.empresa_id<>emp or atual.unidade_id<>p_unidade) then raise exception 'Plano não encontrado nesta unidade da sua empresa.'; end if;
  if jsonb_typeof(p_dados) is distinct from 'object' or jsonb_typeof(p_dados->'rotinas') is distinct from 'array'
    or jsonb_array_length(p_dados->'rotinas')>100 or octet_length(p_dados::text)>150000 then raise exception 'Use até 100 atividades e confira os dados do plano.'; end if;
  foreach chave in array array['titulo','inicio','revisao_em','tecnico_nome','tecnico_documento','tecnico_conselho','tecnico_registro','tecnico_endereco','tecnico_contato','responsabilidade','recomendacoes','projeto_referencia','observacoes'] loop
    if jsonb_typeof(p_dados->chave) is distinct from 'string' then raise exception 'Confira os campos de texto do plano.'; end if;
  end loop;
  if coalesce(length(trim(p_dados->>'titulo')),0) not between 1 and 180 then raise exception 'Informe o título do plano com até 180 caracteres.'; end if;
  if nullif(p_dados->>'inicio','') is not null then perform (p_dados->>'inicio')::date; end if;
  if nullif(p_dados->>'revisao_em','') is not null then perform (p_dados->>'revisao_em')::date; end if;
  if nullif(p_dados->>'inicio','') is not null and nullif(p_dados->>'revisao_em','') is not null and (p_dados->>'revisao_em')::date < (p_dados->>'inicio')::date then raise exception 'A próxima revisão deve ser igual ou posterior ao início do plano.'; end if;
  foreach rotina in array array(select value from jsonb_array_elements(p_dados->'rotinas')) loop
    if jsonb_typeof(rotina) is distinct from 'object' or jsonb_typeof(rotina->'id') is distinct from 'string' or jsonb_typeof(rotina->'atividade') is distinct from 'string' or jsonb_typeof(rotina->'aplicacao') is distinct from 'string' or jsonb_typeof(rotina->'periodicidade') is distinct from 'string' or coalesce(length(rotina->>'id'),0) not between 1 and 80
      or (rotina->>'id')=any(ids) or coalesce(length(trim(rotina->>'atividade')),0) not between 1 and 1500
      or coalesce(length(trim(rotina->>'aplicacao')),0) not between 1 and 300 or length(rotina->>'periodicidade')>200 then
      raise exception 'Confira a identificação, aplicação e descrição de cada atividade.';
    end if;
    ids:=array_append(ids,rotina->>'id');
  end loop;
  if nullif(p_dados->>'projeto_path','') is not null and (p_dados->>'projeto_path') !~ ('^'||emp::text||'/projetos/[a-f0-9-]{36}\.pdf$') then
    raise exception 'O anexo do projeto precisa pertencer à sua empresa.';
  end if;
  insert into public.pmoc_planos(id,empresa_id,unidade_id,dados,created_by) values(coalesce(p_id,gen_random_uuid()),emp,p_unidade,p_dados,auth.uid())
  on conflict(id) do update set dados=excluded.dados,updated_at=clock_timestamp()
    where public.pmoc_planos.empresa_id=emp and public.pmoc_planos.unidade_id=p_unidade returning id into p_id;
  if p_id is null then raise exception 'Plano não encontrado nesta unidade da sua empresa.'; end if;
  return p_id;
end $$;

create or replace function public.registrar_execucao_pmoc(p_plano uuid,p_rotina text,p_equipamento uuid,p_data date,p_executado text,p_aprovado text,p_relato text)
returns uuid language plpgsql security definer set search_path='' as $$
declare emp uuid:=privado.empresa_ativa(); plano public.pmoc_planos; rotina jsonb; tag text; novo uuid;
begin
  select * into plano from public.pmoc_planos where id=p_plano and empresa_id=emp for share;
  if not found then raise exception 'Plano não encontrado na sua empresa.'; end if;
  select value into rotina from jsonb_array_elements(plano.dados->'rotinas') where value->>'id'=p_rotina;
  if rotina is null then raise exception 'Escolha uma atividade que esteja neste plano.'; end if;
  if p_equipamento is not null then
    select e.tag into tag from public.equipamentos e where e.id=p_equipamento and e.unidade_id=plano.unidade_id and e.empresa_id=emp;
    if not found then raise exception 'Escolha um equipamento desta unidade.'; end if;
  end if;
  if p_data is null or p_data>(now() at time zone 'America/Cuiaba')::date then raise exception 'Informe uma data de execução até hoje.'; end if;
  insert into public.pmoc_execucoes(empresa_id,plano_id,rotina_id,atividade,equipamento_tag,data_execucao,executado_por,aprovado_por,relato,registrado_por)
  values(emp,p_plano,p_rotina,rotina->>'atividade',tag,p_data,trim(p_executado),nullif(trim(p_aprovado),''),trim(p_relato),auth.uid()) returning id into novo;
  return novo;
end $$;

create or replace function privado.pendencias_pmoc(s jsonb) returns text[] language plpgsql set search_path='' as $$
declare pend text[]:='{}'; registro jsonb; campo text;
begin
  foreach campo in array array['nome','documento','endereco'] loop
    if nullif(trim(s->'identidade'->>campo),'') is null then pend:=array_append(pend,'Complete '||campo||' da empresa prestadora'); end if;
  end loop;
  if nullif(trim(s->'cliente'->>'documento'),'') is null then pend:=array_append(pend,'Informe o documento do cliente'); end if;
  foreach campo in array array['endereco','representante_nome','representante_documento','representante_endereco','representante_contato'] loop
    if nullif(trim(s->'unidade'->>campo),'') is null then pend:=array_append(pend,'Complete '||campo||' da unidade ou representante'); end if;
  end loop;
  foreach campo in array array['inicio','tecnico_nome','tecnico_documento','tecnico_conselho','tecnico_registro','tecnico_endereco','tecnico_contato','responsabilidade','recomendacoes','projeto_referencia'] loop
    if nullif(trim(s->'plano'->>campo),'') is null then pend:=array_append(pend,'Complete '||campo||' no plano'); end if;
  end loop;
  if jsonb_array_length(s->'ambientes')=0 then pend:=array_append(pend,'Cadastre os ambientes climatizados'); end if;
  for registro in select value from jsonb_array_elements(s->'ambientes') loop
    if nullif(trim(registro->>'atividade'),'') is null or registro->>'area_m2' is null or registro->>'ocupantes_fixos' is null or registro->>'ocupantes_flutuantes' is null then
      pend:=array_append(pend,'Complete atividade, área e ocupação do ambiente '||(registro->>'nome'));
    end if;
  end loop;
  if jsonb_array_length(s->'equipamentos')=0 then pend:=array_append(pend,'Cadastre os equipamentos'); end if;
  for registro in select value from jsonb_array_elements(s->'equipamentos') loop
    if registro->>'capacidade_btu' is null then pend:=array_append(pend,'Informe a capacidade do equipamento '||(registro->>'tag')); end if;
  end loop;
  if jsonb_array_length(s->'plano'->'rotinas')=0 then pend:=array_append(pend,'Defina as atividades de manutenção'); end if;
  for registro in select value from jsonb_array_elements(s->'plano'->'rotinas') loop
    if nullif(trim(registro->>'periodicidade'),'') is null then pend:=array_append(pend,'Defina a periodicidade de '||(registro->>'aplicacao')); end if;
  end loop;
  return pend;
end $$;
revoke all on function privado.pendencias_pmoc(jsonb) from public;

create or replace function public.reservar_pmoc_pdf(p_plano uuid,p_estado text,p_revisado boolean default false) returns public.pmoc_versoes
language plpgsql security definer set search_path='' as $$
declare emp uuid:=privado.empresa_ativa(); plano public.pmoc_planos; unidade public.unidades;
  snap jsonb; pend text[]; numero int; novo uuid:=gen_random_uuid(); versao public.pmoc_versoes;
begin
  select * into plano from public.pmoc_planos where id=p_plano and empresa_id=emp for update;
  if not found then raise exception 'Plano não encontrado na sua empresa.'; end if;
  if p_estado not in ('rascunho','para_assinatura') or p_estado is null then raise exception 'Escolha rascunho ou versão para assinatura.'; end if;
  select * into unidade from public.unidades where id=plano.unidade_id and empresa_id=emp;
  select coalesce(max(v.numero),0)+1 into numero from public.pmoc_versoes v where v.plano_id=p_plano and v.empresa_id=emp;
  snap:=jsonb_build_object('plano',plano.dados,'unidade',to_jsonb(unidade),
    'cliente',(select to_jsonb(c) from public.clientes c where c.id=unidade.cliente_id and c.empresa_id=emp),
    'identidade',coalesce((select to_jsonb(i) from public.documento_identidades i where i.empresa_id=emp),
      jsonb_build_object('nome',(select e.nome from public.empresas e where e.id=emp),'documento','','endereco','','telefone','','email','')),
    'ambientes',coalesce((select jsonb_agg(to_jsonb(a) order by a.nome,a.id) from public.ambientes a where a.empresa_id=emp and a.unidade_id=unidade.id),'[]'::jsonb),
    'equipamentos',coalesce((select jsonb_agg(to_jsonb(e) order by e.tag,e.id) from public.equipamentos e where e.empresa_id=emp and e.unidade_id=unidade.id),'[]'::jsonb),
    'execucoes',coalesce((select jsonb_agg(to_jsonb(x) order by x.data_execucao,x.created_at,x.id) from public.pmoc_execucoes x where x.empresa_id=emp and x.plano_id=p_plano),'[]'::jsonb),
    'versao',numero,'estado',p_estado,'emitido_em',clock_timestamp(),'emitido_por',(select coalesce(p.nome,p.email,'Usuário') from public.perfis p where p.user_id=auth.uid()));
  pend:=privado.pendencias_pmoc(snap);
  if p_estado='para_assinatura' then
    if not coalesce(p_revisado,false) then raise exception 'Confirme a revisão pelo responsável técnico antes de preparar para assinatura.'; end if;
    if cardinality(pend)>0 then raise exception 'Complete os campos do plano, da unidade, dos equipamentos e do timbrado antes de preparar para assinatura.'; end if;
  end if;
  snap:=snap||jsonb_build_object('pendencias',to_jsonb(pend),'revisao_declarada',p_estado='para_assinatura' and p_revisado);
  insert into public.pmoc_versoes(id,empresa_id,plano_id,numero,estado,snapshot,arquivo_path)
  values(novo,emp,p_plano,numero,p_estado,snap,emp::text||'/pmoc/'||p_plano::text||'/'||novo::text||'.pdf') returning * into versao;
  return versao;
end $$;

create or replace function public.finalizar_pmoc_pdf(p_versao uuid,p_sha256 text) returns void
language plpgsql security definer set search_path='' as $$
declare atual public.pmoc_versoes; emp uuid:=privado.empresa_ativa();
begin
  select * into atual from public.pmoc_versoes where id=p_versao and empresa_id=emp for update;
  if not found or atual.arquivo_status<>'aguardando' then raise exception 'A versão não está aguardando geração.'; end if;
  if p_sha256 is not null and not exists(select 1 from storage.objects o where o.bucket_id='documentos' and o.name=atual.arquivo_path) then
    raise exception 'O PDF ainda não foi armazenado.';
  end if;
  update public.pmoc_versoes set arquivo_status=case when p_sha256 is null then 'falha' else 'pronto' end,sha256=p_sha256 where id=p_versao and empresa_id=emp;
end $$;
revoke all on function public.salvar_pmoc(uuid,uuid,jsonb),public.registrar_execucao_pmoc(uuid,text,uuid,date,text,text,text),public.reservar_pmoc_pdf(uuid,text,boolean),public.finalizar_pmoc_pdf(uuid,text) from public,anon;
grant execute on function public.salvar_pmoc(uuid,uuid,jsonb),public.registrar_execucao_pmoc(uuid,text,uuid,date,text,text,text),public.reservar_pmoc_pdf(uuid,text,boolean),public.finalizar_pmoc_pdf(uuid,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('identidades','identidades',false,2097152,array['image/png']),('documentos','documentos',false,10485760,array['application/pdf'])
on conflict(id) do nothing;
drop policy if exists identidade_select on storage.objects;
create policy identidade_select on storage.objects for select to authenticated using(bucket_id='identidades' and (storage.foldername(name))[1]=(select privado.empresa_ativa())::text);
drop policy if exists identidade_insert on storage.objects;
create policy identidade_insert on storage.objects for insert to authenticated with check(bucket_id='identidades' and (storage.foldername(name))[1]=(select privado.empresa_ativa())::text and (storage.foldername(name))[2]='logos' and (select privado.admin_empresa()));
drop policy if exists documentos_select on storage.objects;
create policy documentos_select on storage.objects for select to authenticated using(bucket_id='documentos' and (storage.foldername(name))[1]=(select privado.empresa_ativa())::text);
drop policy if exists documentos_insert on storage.objects;
create policy documentos_insert on storage.objects for insert to authenticated with check(bucket_id='documentos' and (storage.foldername(name))[1]=(select privado.empresa_ativa())::text and (
  (storage.foldername(name))[2]='projetos' or exists(select 1 from public.pmoc_versoes v where v.arquivo_path=name and v.empresa_id=(select privado.empresa_ativa()) and v.arquivo_status='aguardando')));
-- Sem UPDATE/DELETE: PDFs emitidos e seus anexos preservam as versões anteriores.
commit;
