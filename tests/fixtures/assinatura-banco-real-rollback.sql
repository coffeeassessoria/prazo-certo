-- Verificação transacional de implantação, sem preservar dados de teste.

begin;
do $$
declare u uuid; emp uuid; c uuid:=gen_random_uuid(); uni uuid:=gen_random_uuid(); amb uuid:=gen_random_uuid(); eq uuid:=gen_random_uuid(); plano uuid:=gen_random_uuid(); os uuid:=gen_random_uuid(); envio uuid:=gen_random_uuid(); foto uuid:=gen_random_uuid(); r jsonb; b jsonb; d jsonb; conteudo jsonb; assinatura jsonb; hoje date:=(now() at time zone 'America/Cuiaba')::date;
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
 b:=jsonb_build_object('titulo','OS fictícia - teste revertido','cliente_id',c,'responsavel_id',u,'data',hoje,'estado','concluida','observacoes','','resultado','Etapa fictícia conferida.','checklist',jsonb_build_array(jsonb_build_object('descricao','Inspecionar filtros','feito',true,'rotina_id','filtros')),'relatorio',jsonb_build_object('unidade_id',uni,'equipamento_ids',jsonb_build_array(eq),'plano_id',plano,'tipo_manutencao','preventiva','executada_em',hoje,'inicio','09:00','fim','10:00','pecas','Sem peças','medicoes','','recomendacoes','Revisar na próxima visita','proxima_manutencao',hoje+30,'criar_retorno',true,'ciencia',jsonb_build_object('situacao','presente','nome','Representante fictício','cargo','Teste revertido','confirmada',true),'fotos','[]'::jsonb));
 conteudo:=jsonb_build_object('os',os,'empresa',emp,'versao',0,'coletor',u,'dados',b,'apresentado',jsonb_build_object('empresa','Prestadora fictícia','cliente','Cliente fictício','unidade','Unidade fictícia','unidade_endereco','Endereço fictício','tecnico','Técnico fictício','equipamentos',jsonb_build_array('QA-01')));
 assinatura:=jsonb_build_object('formato',1,'conteudo',conteudo::text,'tracos','[[[100,500],[200,200],[300,600],[400,300],[500,500],[600,400]]]'::jsonb,'capturada_em','2026-01-01T10:00:00.000Z','termo','Li o resumo deste atendimento, incluindo as observações e recomendações, e confirmo o recebimento do relatório. Este aceite não comprova pagamento nem substitui a responsabilidade técnica.');
 b:=jsonb_set(b,'{relatorio,assinatura}',assinatura);
 begin
  perform public.aplicar_operacao(gen_random_uuid(),'servico',os,0,jsonb_set(b,'{resultado}','"Texto alterado após o aceite"'));
  raise exception 'Falhou vínculo do aceite';
 exception when others then if sqlerrm not like '%mudou depois do aceite%' then raise; end if;
 end;
 r:=public.aplicar_operacao(envio,'servico',os,0,b);
 if coalesce(r->'dados'->'relatorio'->'snapshot'->'aceite'->>'sha256','') !~ '^[a-f0-9]{64}$' then raise exception 'Hash do aceite ausente.'; end if;
 if (r->'dados'->'relatorio'->'snapshot'->'aceite'->>'recebido_em')::timestamptz < now()-interval '1 minute' then raise exception 'Horário do servidor incorreto.'; end if;
 if r->'dados'->'relatorio'->'assinatura' is distinct from assinatura then raise exception 'Aceite não preservado.'; end if;

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

end $$;
rollback;
select 'Aceite, hash, relógio do servidor, vínculo do conteúdo, reenvio, PMOC e preservação validados; dados fictícios revertidos por rollback.' as resultado;
