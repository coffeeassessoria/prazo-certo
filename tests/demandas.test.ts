import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { dataReal, encerrada } from '../lib/demandas'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const empresa = id(1), outra = id(2), usuario = id(11), colega = id(12), externo = id(13)
const cliente = id(21), outroCliente = id(22), prazo = id(31), outroPrazo = id(32), legado = id(33)

// Postgres real em WASM; apenas a infraestrutura Auth/RLS do Supabase é simulada.
const fixture = `
create role authenticated; create role anon;
create schema auth; create schema privado;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.empresas(id uuid primary key, ativo boolean default true);
create table public.perfis(user_id uuid primary key references auth.users,empresa_id uuid references public.empresas,nome text,email text,created_at timestamptz default now());
create table public.clientes(id uuid primary key,empresa_id uuid references public.empresas);
create table public.itens(id uuid primary key default gen_random_uuid(),empresa_id uuid references public.empresas,cliente_id uuid references public.clientes,tipo text,titulo text not null,descricao text,vencimento date not null,antecedencia_dias int default 0,status text default 'ativo',finalizado_em timestamptz,created_by uuid references auth.users,google_event_id text);
create function privado.minha_empresa() returns uuid language sql stable security definer set search_path=public as $$ select empresa_id from public.perfis where user_id=auth.uid() $$;
alter table public.itens enable row level security;
create policy itens_all on public.itens for all to authenticated using(empresa_id=(select privado.minha_empresa())) with check(empresa_id=(select privado.minha_empresa()));
grant usage on schema public,auth,privado to authenticated,anon;
grant select,insert,update,delete on public.itens to authenticated;
insert into public.empresas(id) values('${empresa}'),('${outra}');
insert into auth.users values('${usuario}'),('${colega}'),('${externo}');
insert into public.perfis(user_id,empresa_id,nome) values('${usuario}','${empresa}','Vanderlei'),('${colega}','${empresa}','Ana'),('${externo}','${outra}','Outro usuário');
insert into public.clientes values('${cliente}','${empresa}'),('${outroCliente}','${outra}');
insert into public.itens(id,empresa_id,cliente_id,tipo,titulo,vencimento,created_by) values
('${prazo}','${empresa}','${cliente}','manutencao','Preventiva','2035-12-20','${usuario}'),
('${outroPrazo}','${outra}','${outroCliente}','manutencao','Outra preventiva','2035-12-20','${externo}'),
('${legado}','${empresa}','${cliente}','acompanhamento','Retorno antigo','2035-12-01','${usuario}');
`

test('datas reais e encerramento', () => {
  assert.equal(dataReal('2028-02-29'), true)
  for (const d of ['2026-02-29','2026-02-31','2026-13-01','qualquer coisa']) assert.equal(dataReal(d), false)
  assert.equal(encerrada('aguardando_cliente'), false)
  assert.equal(encerrada('concluida'), true)
  assert.equal(encerrada('cancelada'), true)
})

test('migração, isolamento e ciclo da demanda', async t => {
  const db = new PGlite()
  try {
    await db.exec(fixture)
    const migration = await readFile(new URL('../supabase/migrations/20261030_demandas_climatizacao.sql', import.meta.url), 'utf8')
    await db.exec(migration)
    await db.exec(migration)
    const row = async (sql: string, args: any[] = []) => (await db.query<any>(sql,args)).rows[0]
    const login = async (uid: string) => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
      await db.exec('set role authenticated')
    }
    const salvar = async (item: string | null, dados: object, nota: string | null = null) => {
      const r = await row('select public.salvar_demanda($1::uuid,$2::jsonb,$3::text) as id',[item,JSON.stringify(dados),nota]); return r.id as string
    }
    const campos = { titulo:'Aprovar troca do compressor',vencimento:'2035-12-03',cliente_id:cliente,responsavel_id:usuario,
      proxima_acao:'Ligar para o João',categoria_demanda:'orcamento',etapa_demanda:'aguardando_cliente',vinculo_item_id:prazo }
    let demanda = ''
    await login(usuario)

    await t.test('preserva acompanhamentos existentes e define responsável',async () => {
      const antigo = await row('select responsavel_id,proxima_acao,vencimento::text from public.itens where id=$1',[legado])
      assert.equal(antigo.responsavel_id,usuario); assert.equal(antigo.proxima_acao,'Retorno antigo'); assert.equal(antigo.vencimento,'2035-12-01')
    })
    await t.test('cria com responsável, próxima ação e histórico',async () => {
      demanda=await salvar(null,campos)
      const evento=await row('select * from public.demanda_eventos where item_id=$1',[demanda])
      assert.equal(evento.tipo,'criacao'); assert.equal(evento.autor_nome,'Vanderlei')
    })
    await t.test('aguardar cliente mantém lembretes e contato não muda manutenção',async () => {
      await salvar(demanda,{ etapa_demanda:'aguardando_cliente',vencimento:'2035-12-06',proxima_acao:'Retornar na sexta',nota_obrigatoria:true },'João pediu mais tempo.')
      assert.equal((await row('select status from public.itens where id=$1',[demanda])).status,'ativo')
      assert.equal((await row('select vencimento::text from public.itens where id=$1',[prazo])).vencimento,'2035-12-20')
      assert.equal((await row("select count(*)::int as n from public.demanda_eventos where item_id=$1 and tipo='contato'",[demanda])).n,1)
    })
    await t.test('recusa vínculos e responsáveis de outra empresa',async () => {
      for(const dados of [{responsavel_id:externo},{cliente_id:outroCliente},{vinculo_item_id:outroPrazo}])
        await assert.rejects(salvar(demanda,dados),/sua empresa|mesmo cliente/)
      await assert.rejects(salvar(demanda,{cliente_id:null}),/mesmo cliente/)
    })
    await t.test('demanda aberta exige responsável, ação e data válida',async () => {
      await assert.rejects(salvar(null,{...campos,responsavel_id:null}),/responsável/)
      await assert.rejects(salvar(null,{...campos,proxima_acao:' '}),/próxima ação/)
      await assert.rejects(salvar(null,{...campos,vencimento:'2026-02-31'}),/date|range/)
      await assert.rejects(salvar(demanda,{vencimento:'2020-01-01'}),/futura/)
      await assert.rejects(salvar(demanda,{nota_obrigatoria:true},' '),/aconteceu/)
    })
    await t.test('nenhuma leitura ou alteração de demandas de outra empresa',async () => {
      await login(externo)
      assert.equal((await db.query('select * from public.demanda_eventos where item_id=$1',[demanda])).rows.length,0)
      await assert.rejects(salvar(demanda,{titulo:'Ataque'}),/não encontrada/)
      assert.equal((await db.query('update public.itens set titulo=$1 where id=$2 returning id',['Ataque',demanda])).rows.length,0)
      await login(usuario)
    })
    await t.test('histórico não pode ser inserido, editado ou apagado pelo cliente',async () => {
      for(const sql of ['delete from public.demanda_eventos',"update public.demanda_eventos set descricao='alterado'","insert into public.demanda_eventos default values"])
        await assert.rejects(db.exec(sql),/permission denied/)
    })
    await t.test('falha no contato desfaz também mudança de data e auditoria',async () => {
      await db.exec("reset role; alter table public.demanda_eventos add constraint teste_falha check(descricao <> 'FALHAR'); set role authenticated")
      const antes=await row('select count(*)::int as n from public.demanda_eventos where item_id=$1',[demanda])
      await assert.rejects(salvar(demanda,{vencimento:'2035-12-10'},'FALHAR'),/teste_falha/)
      assert.equal((await row('select vencimento::text from public.itens where id=$1',[demanda])).vencimento,'2035-12-06')
      assert.equal((await row('select count(*)::int as n from public.demanda_eventos where item_id=$1',[demanda])).n,antes.n)
      await db.exec('reset role; alter table public.demanda_eventos drop constraint teste_falha; set role authenticated')
    })
    await t.test('sincronização da agenda não cria alterações falsas no histórico',async () => {
      const antes=await row('select count(*)::int as n from public.demanda_eventos where item_id=$1',[demanda])
      await db.query("update public.itens set google_event_id='evento' where id=$1",[demanda])
      assert.equal((await row('select count(*)::int as n from public.demanda_eventos where item_id=$1',[demanda])).n,antes.n)
    })
    await t.test('conclui, reabre e cancela mantendo o vencimento original',async () => {
      for(const etapa of ['concluida','a_fazer','cancelada']) {
        await salvar(demanda,{etapa_demanda:etapa},`Situação ${etapa}`)
        const r=await row('select status,finalizado_em from public.itens where id=$1',[demanda])
        assert.equal(r.status,etapa==='a_fazer' ? 'ativo':'concluido')
        assert.equal(r.finalizado_em===null,etapa==='a_fazer')
      }
      assert.equal((await row('select status from public.itens where id=$1',[prazo])).status,'ativo')
    })
    await t.test('não permite remover a auditoria convertendo demanda em outro tipo',async () => {
      await assert.rejects(db.query("update public.itens set tipo='outro' where id=$1",[demanda]),/convertida/)
    })
    await t.test('empresa suspensa e visitante não executam a função',async () => {
      await db.exec(`reset role; update public.empresas set ativo=false where id='${empresa}'; set role authenticated`)
      await assert.rejects(salvar(null,campos),/empresa ativa/)
      await assert.rejects(db.query("update public.itens set titulo='Alterado' where id=$1",[demanda]),/empresa ativa/)
      await db.exec('reset role; set role anon')
      await assert.rejects(salvar(null,campos),/permission denied/)
    })
  } finally { await db.close() }
})
