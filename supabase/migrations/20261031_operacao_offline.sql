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
