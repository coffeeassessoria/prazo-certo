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
