begin;
do $$
declare u uuid; c uuid; q uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); f uuid:=gen_random_uuid(); envio uuid:=gen_random_uuid(); r jsonb; b jsonb;
begin
 select p.user_id,x.id into u,c from public.perfis p join public.empresas e on e.id=p.empresa_id and e.ativo join public.clientes x on x.empresa_id=e.id where p.papel='admin' limit 1;
 if u is null then raise exception 'Teste precisa de uma empresa ativa com administrador e cliente.'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 execute 'set local role authenticated';
 b:=jsonb_build_object('titulo','QA transacional - será revertido','cliente_id',c,'responsavel_id',u,'data','2035-01-01','estado','rascunho','observacoes','Dados fictícios, somente nesta transação.','condicoes','A combinar','desconto_centavos',0,'itens',jsonb_build_array(jsonb_build_object('descricao','Teste de cálculo','tipo','servico','quantidade_mil',1500,'preco_centavos',101)));
 r:=public.aplicar_operacao(envio,'orcamento',q,0,b);
 if (r->'dados'->>'total_centavos')::bigint<>152 then raise exception 'Total incorreto.'; end if;
 if public.aplicar_operacao(envio,'orcamento',q,0,b)<>r then raise exception 'Reenvio divergente.'; end if;
 r:=public.aplicar_operacao(gen_random_uuid(),'orcamento',q,1,jsonb_set(r->'dados','{estado}','"aprovado"'));
 r:=public.aplicar_operacao(gen_random_uuid(),'servico',o,0,jsonb_build_object('titulo','QA serviço temporário','cliente_id',c,'responsavel_id',u,'orcamento_id',q,'data','2035-01-01','estado','concluida','resultado','Teste concluído','observacoes','','checklist',jsonb_build_array(jsonb_build_object('descricao','Etapa fictícia','feito',true))));
 r:=public.aplicar_operacao(gen_random_uuid(),'financeiro',f,0,jsonb_build_object('titulo','QA recebível temporário','cliente_id',c,'orcamento_id',q,'data','2035-01-01','estado','aberto','natureza','receita','valor_centavos',152,'observacoes',''));
 r:=public.aplicar_operacao(gen_random_uuid(),'baixa',f,1,jsonb_build_object('valor_centavos',52,'data','2026-01-01'));
 if jsonb_array_length(r->'dados'->'baixas')<>1 then raise exception 'Baixa incorreta.'; end if;
 r:=public.aplicar_operacao(gen_random_uuid(),'demanda',gen_random_uuid(),0,jsonb_build_object('titulo','QA retorno temporário','cliente_id',c,'responsavel_id',u,'data','2035-01-01','estado','a_fazer','proxima_acao','Confirmar resultado do teste','observacoes','Teste temporário'));
 r:=public.importar_clientes(gen_random_uuid(),jsonb_build_array(jsonb_build_object('nome','QA cliente temporário '||q::text,'documento','QA'||left(replace(q::text,'-',''),20),'contato','','telefone','','email','','endereco','','observacoes','Será revertido')));
 if (r->>'inseridos')::int<>1 then raise exception 'Importação não inseriu a linha temporária.'; end if;
end $$;
rollback;
select 'Orçamento, reenvio, aprovação, OS, recebível, baixa, demanda e importação executados com papel authenticated; alterações revertidas por rollback.' as resultado;
