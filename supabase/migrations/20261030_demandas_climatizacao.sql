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
