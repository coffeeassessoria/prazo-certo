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
