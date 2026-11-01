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

-- Migração 20261031_operacao_offline.sql
-- Operação comercial e de campo. Aplicar antes de publicar. Reaplicável.
begin;
alter table public.itens add column if not exists versao_sync integer not null default 1;
create or replace function privado.versionar_item() returns trigger language plpgsql set search_path='' as $$
begin
 if (to_jsonb(new) - array['versao_sync','updated_at','google_event_id']) is distinct from (to_jsonb(old) - array['versao_sync','updated_at','google_event_id']) then new.versao_sync := old.versao_sync + 1;
 else new.versao_sync := old.versao_sync; end if;
 return new;
end $$;
revoke all on function privado.versionar_item() from public;
drop trigger if exists z_versionar_item on public.itens;
create trigger z_versionar_item before update on public.itens for each row execute function privado.versionar_item();

create table if not exists public.operacao_registros (
 id uuid primary key, empresa_id uuid not null references public.empresas(id),
 tipo text not null check(tipo in ('orcamento','servico','financeiro')),
 dados jsonb not null, versao integer not null default 1,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Referências geradas impedem exclusão de cadastros ainda usados pela operação.
alter table public.operacao_registros add column if not exists cliente_id uuid generated always as (nullif(dados->>'cliente_id','')::uuid) stored references public.clientes(id) on delete restrict;
alter table public.operacao_registros add column if not exists responsavel_id uuid generated always as (nullif(dados->>'responsavel_id','')::uuid) stored references public.perfis(user_id) on delete restrict;
alter table public.operacao_registros add column if not exists orcamento_id uuid generated always as (nullif(dados->>'orcamento_id','')::uuid) stored references public.operacao_registros(id) on delete restrict;
create index if not exists operacao_cliente_idx on public.operacao_registros(cliente_id);
create index if not exists operacao_empresa_tipo on public.operacao_registros(empresa_id,tipo,updated_at desc);
create unique index if not exists operacao_os_orcamento on public.operacao_registros(empresa_id,(dados->>'orcamento_id')) where tipo='servico' and dados->>'orcamento_id' is not null;
create unique index if not exists operacao_receita_orcamento on public.operacao_registros(empresa_id,(dados->>'orcamento_id')) where tipo='financeiro' and dados->>'orcamento_id' is not null;
alter table public.operacao_registros enable row level security;
drop policy if exists operacao_ler on public.operacao_registros;
create policy operacao_ler on public.operacao_registros for select to authenticated using (
 empresa_id=(select privado.minha_empresa()) and exists(select 1 from public.empresas e where e.id=empresa_id and e.ativo)
 and (tipo<>'financeiro' or exists(select 1 from public.perfis p where p.user_id=auth.uid() and p.empresa_id=operacao_registros.empresa_id and p.papel='admin'))
);
grant select on public.operacao_registros to authenticated;
revoke insert,update,delete on public.operacao_registros from authenticated,anon;
create table if not exists public.operacao_recibos (
 empresa_id uuid not null references public.empresas(id), operacao uuid not null, autor uuid not null,
 pedido jsonb not null, resposta jsonb not null, created_at timestamptz not null default now(), primary key(empresa_id,operacao)
);
alter table public.operacao_recibos enable row level security;
revoke all on public.operacao_recibos from authenticated,anon;
create table if not exists public.operacao_eventos (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
 registro_id uuid not null, autor uuid not null, tipo text not null, versao integer not null, dados jsonb not null, created_at timestamptz not null default now()
);
alter table public.operacao_eventos enable row level security;
revoke all on public.operacao_eventos from authenticated,anon;

create or replace function public.aplicar_operacao(p_operacao uuid,p_tipo text,p_id uuid,p_versao integer,p_dados jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare empresa uuid; administrador boolean; pedido jsonb; recibo public.operacao_recibos; anterior public.operacao_registros;
 atual public.operacao_registros; demanda public.itens; resultado jsonb; d jsonb:=p_dados; item jsonb; subtotal bigint:=0; desconto bigint; valor bigint; pago bigint; id_demanda uuid; referencia public.operacao_registros; data_item date;
begin
 select p.empresa_id,p.papel='admin' into empresa,administrador from public.perfis p join public.empresas e on e.id=p.empresa_id where p.user_id=auth.uid() and e.ativo;
 if empresa is null then raise exception 'Entre em uma empresa ativa.' using errcode='42501'; end if;
 if p_tipo not in ('orcamento','servico','demanda','financeiro','baixa') or p_tipo is null then raise exception 'Tipo de operação inválido.'; end if;
 if p_tipo in ('financeiro','baixa') and not administrador then raise exception 'Somente administradores acessam o financeiro.' using errcode='42501'; end if;
 if p_operacao is null or p_id is null or p_versao is null or p_versao<0 or jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>100000 then raise exception 'Revise os dados enviados.'; end if;
 pedido:=jsonb_build_object('tipo',p_tipo,'id',p_id,'versao',p_versao,'dados',d);
 perform pg_advisory_xact_lock(hashtextextended(empresa::text||p_operacao::text,0));
 select * into recibo from public.operacao_recibos where empresa_id=empresa and operacao=p_operacao;
 if found then
  if recibo.autor<>auth.uid() or recibo.pedido<>pedido then raise exception 'Identificador de envio já utilizado.'; end if;
  return recibo.resposta;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,1));
 if p_tipo='demanda' then
  select * into demanda from public.itens where id=p_id for update;
  if found and (demanda.empresa_id<>empresa or demanda.tipo<>'acompanhamento') then raise exception 'Demanda indisponível.' using errcode='42501'; end if;
  if coalesce(demanda.versao_sync,0)<>p_versao then raise exception 'Este registro mudou em outro dispositivo. Revise as alterações antes de salvar.' using errcode='40001'; end if;
  id_demanda:=public.salvar_demanda(case when demanda.id is null then null else p_id end,jsonb_build_object('titulo',d->>'titulo','cliente_id',d->>'cliente_id','responsavel_id',d->>'responsavel_id','vencimento',d->>'data','etapa_demanda',d->>'estado','proxima_acao',d->>'proxima_acao','descricao',d->>'observacoes'));
  select * into demanda from public.itens where id=id_demanda;
  resultado:=jsonb_build_object('id',demanda.id,'tipo','demanda','versao',demanda.versao_sync,'dados',jsonb_build_object('titulo',demanda.titulo,'cliente_id',demanda.cliente_id,'responsavel_id',demanda.responsavel_id,'data',demanda.vencimento,'estado',demanda.etapa_demanda,'proxima_acao',demanda.proxima_acao,'observacoes',coalesce(demanda.descricao,'')));
 else
  select * into anterior from public.operacao_registros where id=p_id for update;
  if found and (anterior.empresa_id<>empresa or anterior.tipo<>case when p_tipo='baixa' then 'financeiro' else p_tipo end) then raise exception 'Registro indisponível.' using errcode='42501'; end if;
  if coalesce(anterior.versao,0)<>p_versao then raise exception 'Este registro mudou em outro dispositivo. Revise as alterações antes de salvar.' using errcode='40001'; end if;
  if p_tipo='baixa' then
   if anterior.id is null or anterior.dados->>'estado'='cancelado' then raise exception 'Título indisponível para baixa.'; end if;
   valor:=(d->>'valor_centavos')::bigint;
   select coalesce(sum((x->>'valor_centavos')::bigint),0) into pago from jsonb_array_elements(anterior.dados->'baixas') x;
   if valor is null or valor<=0 or valor+pago>(anterior.dados->>'valor_centavos')::bigint then raise exception 'Informe uma baixa maior que zero e até o saldo restante.'; end if;
   data_item:=(d->>'data')::date;
   if data_item is null or data_item>(now() at time zone 'America/Cuiaba')::date then raise exception 'A baixa precisa de uma data até hoje.'; end if;
   d:=jsonb_set(anterior.dados,'{baixas}',(anterior.dados->'baixas')||jsonb_build_array(jsonb_build_object('id',p_operacao,'valor_centavos',valor,'data',data_item)));
  else
   if length(trim(d->>'titulo')) not between 1 and 180 or nullif(trim(d->>'titulo'),'') is null or length(d->>'observacoes')>8000 then raise exception 'Informe um título de até 180 caracteres e observações de até 8000.'; end if;
   data_item:=(d->>'data')::date;
   if data_item is null or data_item not between date '2000-01-01' and date '2100-12-31' then raise exception 'Informe uma data entre 2000 e 2100.'; end if;
   if nullif(d->>'cliente_id','') is not null and not exists(select 1 from public.clientes c where c.id=(d->>'cliente_id')::uuid and c.empresa_id=empresa) then raise exception 'Escolha um cliente da sua empresa.'; end if;
   if nullif(d->>'responsavel_id','') is not null and not exists(select 1 from public.perfis p where p.user_id=(d->>'responsavel_id')::uuid and p.empresa_id=empresa) then raise exception 'Escolha um responsável da sua empresa.'; end if;
   if p_tipo in ('orcamento','servico') and nullif(d->>'cliente_id','') is null then raise exception 'Escolha o cliente.'; end if;
   if p_tipo='orcamento' then
    if d->>'estado' is null or d->>'estado' not in ('rascunho','enviado','aprovado','recusado','cancelado') then raise exception 'Estado do orçamento inválido.'; end if;
    if jsonb_typeof(d->'itens') is distinct from 'array' then raise exception 'Informe os itens do orçamento.'; end if;
    if jsonb_array_length(d->'itens') not between 1 and 50 then raise exception 'Inclua de 1 a 50 itens.'; end if;
    for item in select * from jsonb_array_elements(d->'itens') loop
     if nullif(trim(item->>'descricao'),'') is null or length(item->>'descricao')>240 or coalesce(item->>'tipo','') not in ('servico','material') or coalesce(item->>'quantidade_mil','') !~ '^\d+$' or coalesce(item->>'preco_centavos','') !~ '^\d+$' then raise exception 'Revise descrição, tipo, quantidade e preço dos itens.'; end if;
     if (item->>'quantidade_mil')::bigint not between 1 and 1000000 or (item->>'preco_centavos')::bigint not between 0 and 100000000 then raise exception 'Quantidade ou preço acima do limite.'; end if;
     subtotal:=subtotal+((item->>'quantidade_mil')::bigint*(item->>'preco_centavos')::bigint+500)/1000;
    end loop;
    desconto:=coalesce((d->>'desconto_centavos')::bigint,0);
    if desconto<0 or desconto>subtotal or subtotal>10000000000 or length(d->>'condicoes')>4000 then raise exception 'Revise desconto, total e condições de pagamento.'; end if;
    d:=jsonb_set(d,'{total_centavos}',to_jsonb(subtotal-desconto));
    if anterior.dados->>'estado'='aprovado' and ((d-array['observacoes','estado']) is distinct from (anterior.dados-array['observacoes','estado']) or d->>'estado'<>'aprovado') then raise exception 'Orçamento aprovado tem valores e situação preservados. Crie outro orçamento para negociar mudanças.'; end if;
   elsif p_tipo='servico' then
    if coalesce(d->>'estado','') not in ('agendada','em_andamento','concluida','cancelada') or nullif(d->>'responsavel_id','') is null then raise exception 'Informe situação e responsável pelo serviço.'; end if;
    if jsonb_typeof(d->'checklist') is distinct from 'array' then raise exception 'Informe as etapas do serviço.'; end if;
    if jsonb_array_length(d->'checklist') not between 1 and 30 then raise exception 'Inclua de 1 a 30 etapas.'; end if;
    for item in select * from jsonb_array_elements(d->'checklist') loop
     if nullif(trim(item->>'descricao'),'') is null or length(item->>'descricao')>240 or jsonb_typeof(item->'feito') is distinct from 'boolean' then raise exception 'Revise as etapas do serviço.'; end if;
    end loop;
    if length(d->>'resultado')>8000 or (d->>'estado'='concluida' and (nullif(trim(d->>'resultado'),'') is null or exists(select 1 from jsonb_array_elements(d->'checklist') x where x->>'feito'<>'true'))) then raise exception 'Marque as etapas e descreva o resultado antes de concluir.'; end if;
   else
    if coalesce(d->>'estado','') not in ('aberto','cancelado') or coalesce(d->>'natureza','') not in ('receita','despesa') or coalesce(d->>'valor_centavos','') !~ '^\d+$' or (d->>'valor_centavos')::bigint not between 1 and 10000000000 then raise exception 'Revise natureza, situação e valor do lançamento.'; end if;
    if anterior.id is not null and anterior.dados->'baixas'<>'[]'::jsonb and (d-array['observacoes']) is distinct from (anterior.dados-array['observacoes']) then raise exception 'Um lançamento com baixas tem os dados preservados.'; end if;
    d:=jsonb_set(d,'{baixas}',coalesce(anterior.dados->'baixas','[]'::jsonb));
   end if;
   if p_tipo in ('servico','financeiro') and nullif(d->>'orcamento_id','') is not null then
    select * into referencia from public.operacao_registros where id=(d->>'orcamento_id')::uuid and empresa_id=empresa and tipo='orcamento' for update;
    if not found or referencia.dados->>'estado'<>'aprovado' or referencia.dados->>'cliente_id' is distinct from d->>'cliente_id' then raise exception 'Escolha um orçamento aprovado do mesmo cliente.'; end if;
    if p_tipo='financeiro' and (d->>'natureza'<>'receita' or d->>'valor_centavos' is distinct from referencia.dados->>'total_centavos') then raise exception 'O recebível deve corresponder ao valor aprovado.'; end if;
   end if;
   if anterior.id is not null and d->>'orcamento_id' is distinct from anterior.dados->>'orcamento_id' then raise exception 'O vínculo com orçamento é preservado.'; end if;
  end if;
  if anterior.id is null then
   insert into public.operacao_registros(id,empresa_id,tipo,dados,created_by) values(p_id,empresa,p_tipo,d,auth.uid()) returning * into atual;
  else
   update public.operacao_registros set dados=d,versao=versao+1,updated_at=now() where id=p_id and empresa_id=empresa returning * into atual;
  end if;
  resultado:=jsonb_build_object('id',atual.id,'tipo',atual.tipo,'dados',atual.dados,'versao',atual.versao,'updated_at',atual.updated_at);
  insert into public.operacao_eventos(empresa_id,registro_id,autor,tipo,versao,dados) values(empresa,atual.id,auth.uid(),p_tipo,atual.versao,d);
 end if;
 insert into public.operacao_recibos(empresa_id,operacao,autor,pedido,resposta) values(empresa,p_operacao,auth.uid(),pedido,resultado);
 return resultado;
end $$;
revoke all on function public.aplicar_operacao(uuid,text,uuid,integer,jsonb) from public,anon;
grant execute on function public.aplicar_operacao(uuid,text,uuid,integer,jsonb) to authenticated;
create or replace function privado.chave_cliente_nome(v text) returns text language sql immutable set search_path='' as $$
 select translate(lower(regexp_replace(trim(v),'\s+',' ','g')),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')
$$;
revoke all on function privado.chave_cliente_nome(text) from public;
create or replace function public.importar_clientes(p_operacao uuid,p_clientes jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare empresa uuid; c jsonb; inseridos int:=0; ignorados int:=0; chave text; recibo public.operacao_recibos; resultado jsonb; pedido jsonb:=jsonb_build_object('importacao',p_clientes);
begin
 select p.empresa_id into empresa from public.perfis p join public.empresas e on e.id=p.empresa_id where p.user_id=auth.uid() and e.ativo;
 if empresa is null then raise exception 'Entre em uma empresa ativa.' using errcode='42501'; end if;
 if p_operacao is null or jsonb_typeof(p_clientes) is distinct from 'array' or octet_length(p_clientes::text)>2000000 then raise exception 'Arquivo inválido.'; end if;
 if jsonb_array_length(p_clientes) not between 1 and 500 then raise exception 'Importe de 1 a 500 clientes.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(empresa::text,2));
 select * into recibo from public.operacao_recibos where empresa_id=empresa and operacao=p_operacao;
 if found then
  if recibo.autor<>auth.uid() or recibo.pedido<>pedido then raise exception 'Identificador já utilizado.'; end if;
  return recibo.resposta;
 end if;
 for c in select * from jsonb_array_elements(p_clientes) loop
  if coalesce(c->>'email','')<>'' and (c->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Revise o e-mail dos clientes.'; end if;
  if nullif(trim(c->>'nome'),'') is null or length(c->>'nome')>180 or length(c->>'documento')>30 or length(c->>'contato')>180 or length(c->>'telefone')>40 or length(c->>'email')>254 or length(c->>'endereco')>500 or length(c->>'observacoes')>2000 then raise exception 'Revise os campos dos clientes antes de importar.'; end if;
  chave:=regexp_replace(lower(coalesce(c->>'documento','')),'[^a-z0-9]','','g');
  if exists(select 1 from public.clientes x where x.empresa_id=empresa and
   ((chave<>'' and regexp_replace(lower(coalesce(x.documento,'')),'[^a-z0-9]','','g')=chave)
    or (chave='' and privado.chave_cliente_nome(x.nome)=privado.chave_cliente_nome(c->>'nome')))) then ignorados:=ignorados+1;
  else
   insert into public.clientes(empresa_id,nome,documento,contato,telefone,email,endereco,observacoes)
   values(empresa,trim(c->>'nome'),nullif(c->>'documento',''),nullif(c->>'contato',''),nullif(c->>'telefone',''),nullif(c->>'email',''),nullif(c->>'endereco',''),nullif(c->>'observacoes',''));
   inseridos:=inseridos+1;
  end if;
 end loop;
 resultado:=jsonb_build_object('inseridos',inseridos,'ignorados',ignorados);
 insert into public.operacao_recibos(empresa_id,operacao,autor,pedido,resposta) values(empresa,p_operacao,auth.uid(),pedido,resultado);
 return resultado;
end $$;
revoke all on function public.importar_clientes(uuid,jsonb) from public,anon;
grant execute on function public.importar_clientes(uuid,jsonb) to authenticated;
commit;


-- Relatório de campo, evidências privadas e controle de espaço. Aplicar antes do deploy.
begin;
create table if not exists public.evidencias_limites (
 empresa_id uuid primary key references public.empresas(id), limite_bytes bigint not null default 524288000 check(limite_bytes between 1048576 and 107374182400)
);
alter table public.evidencias_limites enable row level security;
revoke all on public.evidencias_limites from authenticated,anon;
create table if not exists public.servico_fotos (
 id uuid primary key, empresa_id uuid not null references public.empresas(id), servico_id uuid not null,
 autor uuid not null references auth.users(id), sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 bytes bigint not null check(bytes between 1 and 700000), largura int not null check(largura between 1 and 1600), altura int not null check(altura between 1 and 1600),
 estado text not null default 'reservada' check(estado in ('reservada','pronta','excluindo')),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 unique(empresa_id,servico_id,sha256)
);
create index if not exists servico_fotos_empresa on public.servico_fotos(empresa_id,servico_id);
alter table public.servico_fotos enable row level security;
drop policy if exists fotos_empresa on public.servico_fotos;
create policy fotos_empresa on public.servico_fotos for select to authenticated using(empresa_id=(select privado.empresa_ativa()));
grant select on public.servico_fotos to authenticated;
grant select,delete on public.servico_fotos to service_role;
revoke insert,update,delete on public.servico_fotos from authenticated,anon;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('evidencias','evidencias',false,600000,array['image/jpeg'])
on conflict(id) do nothing;
-- Sem políticas de escrita/leitura direta no bucket: somente a API autenticada, após otimização.

create or replace function public.reservar_foto_servico(p_empresa uuid,p_autor uuid,p_servico uuid,p_id uuid,p_sha text,p_bytes bigint,p_largura int,p_altura int)
returns public.servico_fotos language plpgsql security definer set search_path='' as $$
declare f public.servico_fotos; os public.operacao_registros; usado bigint; limite bigint;
begin
 if not exists(select 1 from public.perfis p join public.empresas e on e.id=p.empresa_id where p.user_id=p_autor and p.empresa_id=p_empresa and e.ativo) then raise exception 'Empresa indisponível.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_empresa::text,31));
 -- Mesma ordem de bloqueio do envio da OS: empresa, serviço, fotos.
 perform pg_advisory_xact_lock(hashtextextended(p_servico::text,1));
 select * into os from public.operacao_registros where id=p_servico;
 if found and (os.empresa_id<>p_empresa or os.tipo<>'servico' or os.dados->'relatorio'->'snapshot' is not null) then raise exception 'Este serviço não permite novas fotos.'; end if;
 select * into f from public.servico_fotos where id=p_id;
 if found then
  if f.empresa_id<>p_empresa or f.servico_id<>p_servico or f.sha256<>p_sha or f.bytes<>p_bytes or f.largura<>p_largura or f.altura<>p_altura or f.estado='excluindo' then raise exception 'Identificador de foto já utilizado. Escolha a foto novamente.'; end if;
  update public.servico_fotos set updated_at=clock_timestamp() where id=f.id returning * into f;
  return f;
 end if;
 if exists(select 1 from public.servico_fotos where empresa_id=p_empresa and servico_id=p_servico and sha256=p_sha) then raise exception 'Esta foto já foi enviada para este serviço.'; end if;
 if (select count(*) from public.servico_fotos where empresa_id=p_empresa and servico_id=p_servico)>=40 then raise exception 'Há muitos envios de fotos em preparação neste serviço. Salve o rascunho e remova fotos sem uso.'; end if;
 select coalesce(sum(bytes),0) into usado from public.servico_fotos where empresa_id=p_empresa;
 select limite_bytes into limite from public.evidencias_limites where empresa_id=p_empresa;
 if usado+p_bytes>coalesce(limite,524288000) then raise exception 'O espaço de fotos da empresa está cheio. Solicite ampliação ou remova fotos de rascunhos.'; end if;
 insert into public.servico_fotos(id,empresa_id,servico_id,autor,sha256,bytes,largura,altura)
 values(p_id,p_empresa,p_servico,p_autor,p_sha,p_bytes,p_largura,p_altura) returning * into f;
 return f;
end $$;
create or replace function public.finalizar_foto_servico(p_empresa uuid,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare f public.servico_fotos; prefixo text;
begin
 select * into f from public.servico_fotos where id=p_id and empresa_id=p_empresa for update;
 if not found or f.estado='excluindo' then raise exception 'Foto indisponível.'; end if;
 prefixo:=p_empresa::text||'/'||f.servico_id::text||'/'||f.id::text;
 if not exists(select 1 from storage.objects where bucket_id='evidencias' and name=prefixo||'.jpg') or not exists(select 1 from storage.objects where bucket_id='evidencias' and name=prefixo||'-mini.jpg') then raise exception 'O envio da foto está incompleto.'; end if;
 update public.servico_fotos set estado='pronta',updated_at=clock_timestamp() where id=p_id and empresa_id=p_empresa;
end $$;
create or replace function public.uso_fotos_servico() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('usado',coalesce((select sum(bytes) from public.servico_fotos where empresa_id=privado.empresa_ativa()),0),'limite',coalesce((select limite_bytes from public.evidencias_limites where empresa_id=privado.empresa_ativa()),524288000))
$$;
create or replace function public.fotos_abandonadas() returns table(id uuid,empresa_id uuid)
language sql security definer set search_path='' as $$
 select f.id,f.empresa_id from public.servico_fotos f where f.updated_at<clock_timestamp()-interval '24 hours'
 and not exists(select 1 from public.operacao_registros r where r.empresa_id=f.empresa_id and r.id=f.servico_id and r.dados->'relatorio'->'fotos' @> jsonb_build_array(jsonb_build_object('id',f.id)))
 order by f.updated_at limit 100
$$;
revoke all on function public.fotos_abandonadas() from public,anon,authenticated;
grant execute on function public.fotos_abandonadas() to service_role;
-- Reserva uma exclusão, impedindo que o mesmo arquivo seja anexado durante a coleta.
create or replace function public.descartar_foto_servico(p_empresa uuid,p_id uuid,p_expirada boolean default false) returns public.servico_fotos
language plpgsql security definer set search_path='' as $$
declare f public.servico_fotos;
begin
 select * into f from public.servico_fotos where id=p_id and empresa_id=p_empresa for update;
 if not found then return null; end if;
 if p_expirada and f.updated_at>clock_timestamp()-interval '24 hours' then return null; end if;
 if exists(select 1 from public.operacao_registros r where r.empresa_id=p_empresa and r.id=f.servico_id and r.dados->'relatorio'->'fotos' @> jsonb_build_array(jsonb_build_object('id',p_id))) then return null; end if;
 update public.servico_fotos set estado='excluindo' where id=p_id and empresa_id=p_empresa returning * into f;
 return f;
end $$;
revoke all on function public.reservar_foto_servico(uuid,uuid,uuid,uuid,text,bigint,int,int),public.finalizar_foto_servico(uuid,uuid),public.descartar_foto_servico(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.reservar_foto_servico(uuid,uuid,uuid,uuid,text,bigint,int,int),public.finalizar_foto_servico(uuid,uuid),public.descartar_foto_servico(uuid,uuid,boolean) to service_role;
revoke all on function public.uso_fotos_servico() from public,anon;
grant execute on function public.uso_fotos_servico() to authenticated;

alter table public.pmoc_execucoes add column if not exists servico_id uuid references public.operacao_registros(id) on delete restrict;
create unique index if not exists pmoc_execucao_servico on public.pmoc_execucoes(servico_id,rotina_id,equipamento_tag) where servico_id is not null;
create or replace function privado.validar_relatorio_servico() returns trigger language plpgsql security definer set search_path='' as $$
declare r jsonb:=new.dados->'relatorio'; uni public.unidades; plano public.pmoc_planos; eq jsonb; foto jsonb; f public.servico_fotos; campo text; d date; ids uuid[]:='{}'; fotos uuid[]:='{}'; x text; snap jsonb; retorno uuid; tecnico text; rotina jsonb; atividade jsonb;
begin
 if new.tipo<>'servico' then return new; end if;
 if TG_OP='UPDATE' and old.dados->'relatorio'->'snapshot' is not null then raise exception 'O relatório concluído está preservado. Cadastre outra OS para uma nova visita ou correção.'; end if;
 if r is null then return new; end if;
 if jsonb_typeof(r) is distinct from 'object' then raise exception 'Revise o relatório de manutenção.'; end if;
 if new.empresa_id is distinct from privado.empresa_ativa() then raise exception 'Empresa indisponível.'; end if;
 foreach campo in array array['tipo_manutencao','executada_em','inicio','fim','pecas','medicoes','recomendacoes','proxima_manutencao'] loop
  if jsonb_typeof(r->campo) is distinct from 'string' or length(r->>campo)>4000 then raise exception 'Revise os campos do relatório (até 4000 caracteres por campo).'; end if;
 end loop;
 if r->>'tipo_manutencao' not in ('preventiva','corretiva','inspecao') or jsonb_typeof(r->'criar_retorno') is distinct from 'boolean' then raise exception 'Revise o tipo de manutenção e o próximo retorno.'; end if;
 if jsonb_typeof(r->'equipamento_ids') is distinct from 'array' or jsonb_array_length(r->'equipamento_ids')>50 or jsonb_typeof(r->'fotos') is distinct from 'array' or jsonb_array_length(r->'fotos')>20 then raise exception 'Use até 50 equipamentos e 20 fotos por OS.'; end if;
 if nullif(r->>'unidade_id','') is not null then
  select * into uni from public.unidades where id=(r->>'unidade_id')::uuid and empresa_id=new.empresa_id and cliente_id=(new.dados->>'cliente_id')::uuid for share;
  if not found then raise exception 'Escolha uma unidade do cliente selecionado.'; end if;
 end if;
 for x in select jsonb_array_elements_text(r->'equipamento_ids') loop
  if x::uuid=any(ids) then raise exception 'Equipamento repetido.'; end if;
  if not exists(select 1 from public.equipamentos where id=x::uuid and unidade_id=uni.id and empresa_id=new.empresa_id) then raise exception 'Escolha equipamentos da unidade selecionada.'; end if;
  ids:=array_append(ids,x::uuid);
 end loop;
 if nullif(r->>'plano_id','') is not null then
  select * into plano from public.pmoc_planos where id=(r->>'plano_id')::uuid and unidade_id=uni.id and empresa_id=new.empresa_id for share;
  if not found then raise exception 'Escolha um PMOC da unidade selecionada.'; end if;
 end if;
 for atividade in select * from jsonb_array_elements(new.dados->'checklist') loop
  if nullif(atividade->>'rotina_id','') is not null and not exists(select 1 from jsonb_array_elements(plano.dados->'rotinas') a where a->>'id'=atividade->>'rotina_id') then raise exception 'A rotina não pertence ao PMOC selecionado.'; end if;
 end loop;
 for foto in select * from jsonb_array_elements(r->'fotos') loop
  if (foto->>'id')::uuid=any(fotos) then raise exception 'Foto repetida.'; end if;
  if coalesce(foto->>'etapa','') not in ('antes','depois','evidencia') or jsonb_typeof(foto->'legenda') is distinct from 'string' or length(foto->>'legenda')>240 then raise exception 'Revise a classificação e a legenda das fotos.'; end if;
  if nullif(foto->>'equipamento_id','') is not null and not ((foto->>'equipamento_id')::uuid=any(ids)) then raise exception 'Associe a foto a um equipamento atendido nesta OS.'; end if;
  select * into f from public.servico_fotos where id=(foto->>'id')::uuid and empresa_id=new.empresa_id and servico_id=new.id for update;
  if not found or f.estado<>'pronta' then raise exception 'Sincronize todas as fotos antes de enviar o relatório.'; end if;
  fotos:=array_append(fotos,f.id);
 end loop;
 if jsonb_typeof(r->'ciencia') is distinct from 'object' or coalesce(r->'ciencia'->>'situacao','') not in ('presente','ausente','recusou') or jsonb_typeof(r->'ciencia'->'confirmada') is distinct from 'boolean' or jsonb_typeof(r->'ciencia'->'nome') is distinct from 'string' or jsonb_typeof(r->'ciencia'->'cargo') is distinct from 'string' or length(r->'ciencia'->>'nome')>160 or length(r->'ciencia'->>'cargo')>160 then raise exception 'Revise a ciência do cliente.'; end if;
 if nullif(r->>'executada_em','') is not null then d:=(r->>'executada_em')::date; end if;
 if d is not null and d not between date '2000-01-01' and (now() at time zone 'America/Cuiaba')::date then raise exception 'A data da execução deve ser até hoje.'; end if;
 if (r->>'inicio'<>'' and r->>'inicio' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') or (r->>'fim'<>'' and r->>'fim' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') or (r->>'inicio'<>'' and r->>'fim'<>'' and r->>'fim'<r->>'inicio') then raise exception 'Confira os horários de início e término no mesmo dia.'; end if;
 if nullif(r->>'proxima_manutencao','') is not null and ((r->>'proxima_manutencao')::date<=coalesce(d,(now() at time zone 'America/Cuiaba')::date) or (r->>'proxima_manutencao')::date>date '2100-12-31') then raise exception 'A próxima manutenção deve ser posterior à execução.'; end if;
 r:=r-'snapshot';
 if new.dados->>'estado'='concluida' then
  if uni.id is null or cardinality(ids)=0 or d is null then raise exception 'Informe unidade, equipamentos e data da execução para concluir o relatório.'; end if;
  if r->'ciencia'->>'situacao'='presente' and (nullif(trim(r->'ciencia'->>'nome'),'') is null or r->'ciencia'->>'confirmada'<>'true') then raise exception 'Identifique o representante e confirme que ele tomou ciência do atendimento.'; end if;
  if (r->>'criar_retorno')::boolean then
   if nullif(r->>'proxima_manutencao','') is null then raise exception 'Informe a data do próximo retorno.'; end if;
   retorno:=public.salvar_demanda(null,jsonb_build_object('titulo',left('Agendar próxima manutenção: '||(new.dados->>'titulo'),180),'cliente_id',(new.dados->>'cliente_id')::uuid,'responsavel_id',(new.dados->>'responsavel_id')::uuid,'vencimento',r->>'proxima_manutencao','etapa_demanda','a_fazer','categoria_demanda','agendamento','proxima_acao','Combinar com o cliente a próxima manutenção. OS '||left(new.id::text,8),'descricao',r->>'recomendacoes'));
  end if;
  select coalesce(nome,email,'Técnico') into tecnico from public.perfis where user_id=(new.dados->>'responsavel_id')::uuid and empresa_id=new.empresa_id;
  snap:=jsonb_build_object('unidade',jsonb_build_object('nome',uni.nome,'endereco',uni.endereco),
   'cliente',(select jsonb_build_object('nome',c.nome,'documento',c.documento,'endereco',c.endereco) from public.clientes c where c.id=(new.dados->>'cliente_id')::uuid and c.empresa_id=new.empresa_id),
   'identidade',coalesce((select to_jsonb(i) from public.documento_identidades i where i.empresa_id=new.empresa_id),jsonb_build_object('nome',(select nome from public.empresas where id=new.empresa_id),'documento','','endereco','','telefone','','email','')),
   'equipamentos',(select jsonb_agg(to_jsonb(e)||jsonb_build_object('ambiente',a.nome) order by e.tag) from public.equipamentos e join public.ambientes a on a.id=e.ambiente_id and a.empresa_id=e.empresa_id where e.id=any(ids) and e.empresa_id=new.empresa_id),
   'tecnico',tecnico,'emitido_em',clock_timestamp(),'registrado_por',auth.uid(),'retorno_id',retorno);
  r:=r||jsonb_build_object('snapshot',snap);
 end if;
 new.dados:=jsonb_set(new.dados,'{relatorio}',r);
 return new;
end $$;
revoke all on function privado.validar_relatorio_servico() from public;
drop trigger if exists validar_relatorio_servico on public.operacao_registros;
create trigger validar_relatorio_servico before insert or update on public.operacao_registros for each row execute function privado.validar_relatorio_servico();
create or replace function privado.integrar_relatorio_pmoc() returns trigger language plpgsql security definer set search_path='' as $$
declare r jsonb:=new.dados->'relatorio'; etapa jsonb; eq record; plano public.pmoc_planos;
begin
 if new.tipo<>'servico' or new.dados->>'estado'<>'concluida' or r->'snapshot' is null or nullif(r->>'plano_id','') is null then return new; end if;
 select * into plano from public.pmoc_planos where id=(r->>'plano_id')::uuid and empresa_id=new.empresa_id;
 for etapa in select * from jsonb_array_elements(new.dados->'checklist') loop
  if etapa->>'feito'='true' and nullif(etapa->>'rotina_id','') is not null then
   for eq in select e.tag from public.equipamentos e where e.empresa_id=new.empresa_id and e.id in (select value::text::uuid from jsonb_array_elements_text(r->'equipamento_ids')) loop
    insert into public.pmoc_execucoes(empresa_id,plano_id,rotina_id,atividade,equipamento_tag,data_execucao,executado_por,aprovado_por,relato,registrado_por,servico_id)
    values(new.empresa_id,plano.id,etapa->>'rotina_id',(select a->>'atividade' from jsonb_array_elements(plano.dados->'rotinas') a where a->>'id'=etapa->>'rotina_id'),eq.tag,(r->>'executada_em')::date,r->'snapshot'->>'tecnico',null,left(new.dados->>'resultado',4000),auth.uid(),new.id)
    on conflict do nothing;
   end loop;
  end if;
 end loop;
 return new;
end $$;
revoke all on function privado.integrar_relatorio_pmoc() from public;
drop trigger if exists integrar_relatorio_pmoc on public.operacao_registros;
create trigger integrar_relatorio_pmoc after insert or update on public.operacao_registros for each row execute function privado.integrar_relatorio_pmoc();
commit;
-- Aceite manuscrito privado, vinculado ao conteúdo e à versão da OS concluída.
-- Não altera relatórios anteriores e não representa certificado ICP-Brasil.
begin;
create or replace function privado.validar_assinatura_servico() returns trigger
language plpgsql security definer set search_path='' as $$
declare a jsonb:=new.dados->'relatorio'->'assinatura'; c jsonb; t jsonb; ponto jsonb;
 n int:=0; x int; y int; xmin int:=1000; xmax int:=0; ymin int:=1000; ymax int:=0;
 termo text:='Li o resumo deste atendimento, incluindo as observações e recomendações, e confirmo o recebimento do relatório. Este aceite não comprova pagamento nem substitui a responsabilidade técnica.';
 campo text; recebido timestamptz:=clock_timestamp(); evidencia jsonb; foto jsonb; hashes jsonb;
begin
 if new.tipo<>'servico' then return new; end if;
 -- O trigger de relatório deve ter gerado o snapshot antes deste (ordem alfabética).
 if a is null then return new; end if;
 if jsonb_typeof(a) is distinct from 'object' or a->'formato' is distinct from '1'::jsonb
 or jsonb_typeof(a->'conteudo') is distinct from 'string' or octet_length(a->>'conteudo')>35000
 or a->>'termo' is distinct from termo or jsonb_typeof(a->'capturada_em') is distinct from 'string'
 or length(a->>'capturada_em')>40 or a->>'capturada_em' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
 then raise exception 'Revise os dados do aceite e colete a assinatura novamente.'; end if;
 -- A data do aparelho é declarada; a confirmação usa sempre o relógio do servidor.
 perform (a->>'capturada_em')::timestamptz;
 if new.dados->>'estado' is distinct from 'concluida' or new.dados->'relatorio'->'snapshot' is null
 or new.dados->'relatorio'->'ciencia'->>'situacao' is distinct from 'presente'
 or new.dados->'relatorio'->'ciencia'->>'confirmada' is distinct from 'true'
 or coalesce(length(trim(new.dados->'relatorio'->'ciencia'->>'nome')),0)<2 then raise exception 'Identifique o representante presente e conclua o atendimento para registrar a assinatura.'; end if;
 c:=(a->>'conteudo')::jsonb;
 if jsonb_typeof(c) is distinct from 'object' or c->>'os' is distinct from new.id::text
 or c->>'empresa' is distinct from new.empresa_id::text or c->'versao' is distinct from to_jsonb(new.versao-1)
 or c->>'coletor' is distinct from auth.uid()::text
 or c->'dados' is distinct from (new.dados #- '{relatorio,assinatura}' #- '{relatorio,snapshot}')
 or jsonb_typeof(c->'apresentado') is distinct from 'object'
 then raise exception 'O atendimento mudou depois do aceite. Peça ao cliente para conferir e assinar novamente.'; end if;
 foreach campo in array array['empresa','cliente','unidade','unidade_endereco','tecnico'] loop
  if jsonb_typeof(c->'apresentado'->campo) is distinct from 'string' or length(c->'apresentado'->>campo)>400 then raise exception 'Revise a identificação apresentada ao cliente.'; end if;
 end loop;
 if jsonb_typeof(c->'apresentado'->'equipamentos') is distinct from 'array' or jsonb_array_length(c->'apresentado'->'equipamentos')>50 then raise exception 'Revise os equipamentos apresentados ao cliente.'; end if;
 for t in select * from jsonb_array_elements(c->'apresentado'->'equipamentos') loop
  if jsonb_typeof(t) is distinct from 'string' or length(t#>>'{}')>600 then raise exception 'Revise a identificação dos equipamentos.'; end if;
 end loop;
 if jsonb_typeof(a->'tracos') is distinct from 'array' or jsonb_array_length(a->'tracos') not between 1 and 32 then raise exception 'Desenhe a assinatura no espaço indicado.'; end if;
 for t in select * from jsonb_array_elements(a->'tracos') loop
  if jsonb_typeof(t) is distinct from 'array' or jsonb_array_length(t) not between 2 and 800 then raise exception 'Revise o desenho da assinatura.'; end if;
  for ponto in select * from jsonb_array_elements(t) loop
   if jsonb_typeof(ponto) is distinct from 'array' or jsonb_array_length(ponto)<>2
   or jsonb_typeof(ponto->0) is distinct from 'number' or jsonb_typeof(ponto->1) is distinct from 'number'
   or ponto->>0 !~ '^\d{1,4}$' or ponto->>1 !~ '^\d{1,4}$' then raise exception 'Revise os traços da assinatura.'; end if;
   x:=(ponto->>0)::int; y:=(ponto->>1)::int; n:=n+1;
   if x not between 0 and 1000 or y not between 0 and 1000 or n>800 then raise exception 'O desenho está fora dos limites. Colete a assinatura novamente.'; end if;
   xmin:=least(xmin,x); xmax:=greatest(xmax,x); ymin:=least(ymin,y); ymax:=greatest(ymax,y);
  end loop;
 end loop;
 if n<6 or xmax-xmin+ymax-ymin<80 then raise exception 'Um toque isolado não é suficiente. Desenhe a assinatura.'; end if;
 -- Inclui os hashes dos arquivos privados e o snapshot efetivamente preservado.
 select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'sha256',f.sha256) order by f.id),'[]'::jsonb)
 into hashes from public.servico_fotos f where f.empresa_id=new.empresa_id and f.servico_id=new.id
 and new.dados->'relatorio'->'fotos' @> jsonb_build_array(jsonb_build_object('id',f.id));
 evidencia:=jsonb_build_object('assinatura',a,'snapshot',new.dados->'relatorio'->'snapshot','fotos',hashes,
 'empresa',new.empresa_id,'os',new.id,'versao',new.versao,'registrado_por',auth.uid(),'recebido_em',recebido);
 new.dados:=jsonb_set(new.dados,'{relatorio,snapshot,aceite}',jsonb_build_object(
 'sha256',encode(sha256(convert_to(evidencia::text,'UTF8')),'hex'),
 'recebido_em',recebido,'registrado_por',auth.uid(),'versao',new.versao));
 return new;
end $$;
revoke all on function privado.validar_assinatura_servico() from public;
drop trigger if exists z_validar_assinatura_servico on public.operacao_registros;
create trigger z_validar_assinatura_servico before insert or update on public.operacao_registros
 for each row execute function privado.validar_assinatura_servico();
commit;
