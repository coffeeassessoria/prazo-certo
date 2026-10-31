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
