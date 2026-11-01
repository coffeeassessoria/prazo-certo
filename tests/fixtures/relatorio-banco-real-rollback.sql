-- Verificação transacional de implantação, sem preservar dados de teste.
grant select,delete on public.servico_fotos to service_role;
begin;
do $$
declare u uuid; emp uuid; c uuid:=gen_random_uuid(); uni uuid:=gen_random_uuid(); amb uuid:=gen_random_uuid(); eq uuid:=gen_random_uuid(); plano uuid:=gen_random_uuid(); os uuid:=gen_random_uuid(); envio uuid:=gen_random_uuid(); foto uuid:=gen_random_uuid(); r jsonb; b jsonb; d jsonb; hoje date:=(now() at time zone 'America/Cuiaba')::date;
begin
 if exists(select 1 from storage.buckets where id='evidencias' and public) or not exists(select 1 from storage.buckets where id='evidencias' and file_size_limit=600000) then raise exception 'Bucket de evidências incorreto.'; end if;
 if has_table_privilege('authenticated','public.servico_fotos','INSERT') or has_function_privilege('authenticated','public.reservar_foto_servico(uuid,uuid,uuid,uuid,text,bigint,integer,integer)','EXECUTE') then raise exception 'Permissão de escrita excessiva.'; end if;
 select p.user_id,p.empresa_id into u,emp from public.perfis p join public.empresas e on e.id=p.empresa_id and e.ativo where p.papel='admin' limit 1;
 if u is null then raise exception 'É necessária uma empresa ativa para o teste.'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 execute 'set local role authenticated';
 insert into public.clientes(id,empresa_id,nome) values(c,emp,'Cliente fictício - teste revertido');
 insert into public.unidades(id,empresa_id,cliente_id,nome) values(uni,emp,c,'Unidade fictícia - teste revertido');
 insert into public.ambientes(id,empresa_id,unidade_id,nome) values(amb,emp,uni,'Recepção fictícia');
 insert into public.equipamentos(id,empresa_id,unidade_id,ambiente_id,tag,capacidade_btu) values(eq,emp,uni,amb,'QA-01',12000);
 d:=jsonb_build_object('titulo','PMOC fictício','inicio','','revisao_em','','tecnico_nome','','tecnico_documento','','tecnico_conselho','','tecnico_registro','','tecnico_endereco','','tecnico_contato','','responsabilidade','','recomendacoes','','projeto_referencia','','observacoes','','rotinas',jsonb_build_array(jsonb_build_object('id','filtros','atividade','Inspecionar filtros','aplicacao','Filtros','periodicidade','Conforme plano')));
 perform public.salvar_pmoc(plano,uni,d);
 b:=jsonb_build_object('titulo','OS fictícia - teste revertido','cliente_id',c,'responsavel_id',u,'data',hoje,'estado','concluida','observacoes','','resultado','Etapa fictícia conferida.','checklist',jsonb_build_array(jsonb_build_object('descricao','Inspecionar filtros','feito',true,'rotina_id','filtros')),'relatorio',jsonb_build_object('unidade_id',uni,'equipamento_ids',jsonb_build_array(eq),'plano_id',plano,'tipo_manutencao','preventiva','executada_em',hoje,'inicio','09:00','fim','10:00','pecas','Sem peças','medicoes','','recomendacoes','Revisar na próxima visita','proxima_manutencao',hoje+30,'criar_retorno',true,'ciencia',jsonb_build_object('situacao','ausente','nome','','cargo','','confirmada',false),'fotos','[]'::jsonb));
 r:=public.aplicar_operacao(envio,'servico',os,0,b);
 if r->'dados'->'relatorio'->'snapshot' is null then raise exception 'Snapshot ausente.'; end if;
 if public.aplicar_operacao(envio,'servico',os,0,b)<>r then raise exception 'Reenvio divergente.'; end if;
 if (select count(*) from public.pmoc_execucoes where servico_id=os)<>1 then raise exception 'Execução PMOC incorreta.'; end if;
 if not exists(select 1 from public.itens where id=(r->'dados'->'relatorio'->'snapshot'->>'retorno_id')::uuid and empresa_id=emp) then raise exception 'Retorno ausente.'; end if;
 begin
  perform public.aplicar_operacao(gen_random_uuid(),'servico',os,1,jsonb_set(b,'{resultado}','"Alteração proibida"'));
  raise exception 'Falhou preservação';
 exception when others then if sqlerrm not like '%preservado%' then raise; end if;
 end;
 execute 'reset role';
 perform public.reservar_foto_servico(emp,u,gen_random_uuid(),foto,repeat('a',64),1000,800,600);
 if (select count(*) from public.servico_fotos where id=foto and empresa_id=emp)<>1 then raise exception 'Reserva de foto ausente.'; end if;
end $$;
rollback;
select 'Relatório, snapshot, reenvio, PMOC, retorno, preservação e reserva de fotos validados; dados fictícios revertidos por rollback.' as resultado;
