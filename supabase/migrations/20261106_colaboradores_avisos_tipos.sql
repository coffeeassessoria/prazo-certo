-- Colaboradores, vários avisos por vencimento e respostas de tipos de documento (2026-11-06)
-- Só adiciona colunas e tabela. Seguro reaplicar.
begin;

create table if not exists public.colaboradores (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas(id) on delete cascade,
  nome            text not null,
  funcao          text,
  cpf             text,
  rg              text,
  data_nascimento date,
  data_admissao   date,
  telefone        text,
  email           text,
  observacoes     text,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists colaboradores_empresa_idx on public.colaboradores(empresa_id, nome);
alter table public.colaboradores enable row level security;
drop policy if exists colaboradores_all on public.colaboradores;
create policy colaboradores_all on public.colaboradores
  for all to authenticated using (empresa_id = (select privado.minha_empresa()))
  with check (empresa_id = (select privado.minha_empresa()));

alter table public.itens add column if not exists colaborador_id uuid references public.colaboradores(id) on delete set null;
alter table public.itens add column if not exists avisos_dias int[];
alter table public.itens add column if not exists modelo text;
alter table public.itens add column if not exists dados jsonb not null default '[]'::jsonb;
create index if not exists itens_colaborador_idx on public.itens(colaborador_id);

-- Itens antigos mantêm exatamente os avisos de antes: antecedência escolhida, 7 dias e 1 dia.
update public.itens set avisos_dias = (
  select array_agg(d order by d desc) from (select distinct unnest(array[antecedencia_dias, 7, 1]) d) x where d > 0
) where avisos_dias is null and tipo <> 'acompanhamento';

commit;
