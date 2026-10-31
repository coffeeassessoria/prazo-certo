import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { PLANO_VAZIO } from '../lib/pmoc'
const uid = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const emp = uid(1),
  outra = uid(2),
  admin = uid(11),
  membro = uid(12),
  externo = uid(13),
  cliente = uid(21),
  clienteB = uid(22),
  unidade = uid(31),
  unidadeB = uid(32)
const fixture = `
create role authenticated;create role anon;create schema auth;create schema privado;create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key);
create table public.empresas(id uuid primary key,nome text,ativo boolean default true);
create table public.perfis(user_id uuid primary key references auth.users,empresa_id uuid references public.empresas,nome text,email text,papel text default 'membro',is_superadmin boolean default false);
create table public.clientes(id uuid primary key,empresa_id uuid references public.empresas,nome text,documento text,endereco text,contato text,telefone text,email text);
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets,name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(regexp_replace(name,'/[^/]*$',''),'/') $$;
grant usage on schema public,auth,privado,storage to authenticated,anon;
grant select,insert,update,delete on storage.objects to authenticated;
insert into public.empresas(id,nome) values('${emp}','Prestadora A'),('${outra}','Prestadora B');
insert into auth.users values('${admin}'),('${membro}'),('${externo}');
insert into public.perfis(user_id,empresa_id,nome,papel) values('${admin}','${emp}','Administrador','admin'),('${membro}','${emp}','Técnico','membro'),('${externo}','${outra}','Outra pessoa','admin');
insert into public.clientes(id,empresa_id,nome,documento) values('${cliente}','${emp}','Cliente A','Documento A'),('${clienteB}','${outra}','Cliente B','Documento B');
`
test('PMOC: referências, versões e arquivos separados por empresa', async (t) => {
  const db = new PGlite()
  try {
    await db.exec(fixture)
    const migration = await readFile(
      new URL(
        '../supabase/migrations/20261030_pmoc_documentos.sql',
        import.meta.url,
      ),
      'utf8',
    )
    await db.exec(migration)
    await db.exec(migration)
    const login = async (user: string) => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user,
      ])
      await db.exec('set role authenticated')
    }
    const row = async (sql: string, args: unknown[] = []) =>
      (await db.query<any>(sql, args)).rows[0]
    const salvar = async (id: string | null, dados: object, uni = unidade) =>
      (
        await row('select public.salvar_pmoc($1,$2,$3::jsonb) id', [
          id,
          uni,
          JSON.stringify(dados),
        ])
      ).id as string
    const reserva = async (id: string, estado = 'rascunho', revisado = false) =>
      await row('select * from public.reservar_pmoc_pdf($1,$2,$3)', [
        id,
        estado,
        revisado,
      ])
    let plano = '',
      ambiente = '',
      equipamento = '',
      versao: any
    await login(admin)
    await t.test(
      'cadastra unidade, ambiente e equipamento da empresa',
      async () => {
        await db.query(
          'insert into public.unidades(id,empresa_id,cliente_id,nome,endereco,representante_nome,representante_documento,representante_endereco,representante_contato) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [
            unidade,
            emp,
            cliente,
            'Unidade A',
            'Endereço',
            'Preposto',
            'Doc',
            'Endereço',
            'Contato',
          ],
        )
        ambiente = (
          await row(
            'insert into public.ambientes(empresa_id,unidade_id,nome,atividade,area_m2,ocupantes_fixos,ocupantes_flutuantes) values($1,$2,$3,$4,20,2,0) returning id',
            [emp, unidade, 'Recepção', 'Atendimento'],
          )
        ).id
        equipamento = (
          await row(
            "insert into public.equipamentos(empresa_id,unidade_id,ambiente_id,tag,capacidade_btu) values($1,$2,$3,'AC-01',12000) returning id",
            [emp, unidade, ambiente],
          )
        ).id
      },
    )
    await t.test(
      'impede cliente e unidade de outra empresa por chave composta',
      async () => {
        await assert.rejects(
          db.query(
            "insert into public.unidades(empresa_id,cliente_id,nome) values($1,$2,'Invasão')",
            [emp, clienteB],
          ),
          /foreign key/,
        )
        await login(externo)
        await db.query(
          "insert into public.unidades(id,empresa_id,cliente_id,nome) values($1,$2,$3,'Unidade B')",
          [unidadeB, outra, clienteB],
        )
        await assert.rejects(
          db.query(
            "insert into public.ambientes(empresa_id,unidade_id,nome) values($1,$2,'Invasão')",
            [outra, unidade],
          ),
          /foreign key/,
        )
        await login(admin)
        await db.query(
          "insert into public.unidades(id,empresa_id,cliente_id,nome) values($1,$2,$3,'Outra unidade A')",
          [uid(33), emp, cliente],
        )
        await assert.rejects(
          db.query(
            "insert into public.equipamentos(empresa_id,unidade_id,ambiente_id,tag) values($1,$2,$3,'AC-errado')",
            [emp, uid(33), ambiente],
          ),
          /foreign key/,
        )
      },
    )
    await t.test(
      'somente administrador altera timbrado; membro pode consultar',
      async () => {
        await db.query(
          "insert into public.documento_identidades(empresa_id,nome,documento,endereco) values($1,'Prestadora A','Documento','Endereço')",
          [emp],
        )
        await login(membro)
        assert.equal(
          (await row('select nome from public.documento_identidades')).nome,
          'Prestadora A',
        )
        assert.equal(
          (
            await db.query(
              "update public.documento_identidades set nome='Alteração' returning nome",
            )
          ).rows.length,
          0,
        )
        await assert.rejects(
          db.query(
            "insert into storage.objects(bucket_id,name) values('identidades',$1)",
            [`${emp}/logos/${uid(90)}.png`],
          ),
          /row-level security/,
        )
        await login(admin)
        await db.query(
          "insert into storage.objects(bucket_id,name) values('identidades',$1)",
          [`${emp}/logos/${uid(90)}.png`],
        )
        await login(externo)
        assert.equal(
          (
            await db.query(
              "select * from storage.objects where bucket_id='identidades'",
            )
          ).rows.length,
          0,
        )
        await login(admin)
        await db.query('update public.documento_identidades set logo_path=$1', [
          `${emp}/logos/${uid(90)}.png`,
        ])
        await assert.rejects(
          db.query('update public.documento_identidades set logo_path=$1', [
            `${outra}/logos/${uid(90)}.png`,
          ]),
          /check constraint/,
        )
      },
    )
    await t.test(
      'rascunho admite campos pendentes; versão para assinatura exige revisão',
      async () => {
        plano = await salvar(null, PLANO_VAZIO)
        await assert.rejects(
          salvar(plano, {
            ...PLANO_VAZIO,
            inicio: '2026-02-01',
            revisao_em: '2026-01-01',
          }),
          /revisão/,
        )
        versao = await reserva(plano)
        assert.ok(versao.snapshot.pendencias.length > 0)
        await assert.rejects(
          reserva(plano, 'para_assinatura', false),
          /revisão/,
        )
        await assert.rejects(
          reserva(plano, 'para_assinatura', true),
          /Complete/,
        )
        await assert.rejects(
          db.exec('insert into public.pmoc_versoes default values'),
          /permission denied/,
        )
        await assert.rejects(
          db.exec("update public.pmoc_planos set dados='{}'"),
          /permission denied/,
        )
      },
    )
    await t.test(
      'não grava ou emite plano e projeto de outra empresa',
      async () => {
        await assert.rejects(salvar(null, PLANO_VAZIO, unidadeB), /sua empresa/)
        await assert.rejects(
          salvar(plano, {
            ...PLANO_VAZIO,
            projeto_path: `${outra}/projetos/${uid(90)}.pdf`,
          }),
          /sua empresa/,
        )
        await login(externo)
        assert.equal(
          (await db.query('select * from public.pmoc_versoes')).rows.length,
          0,
        )
        await assert.rejects(
          salvar(plano, PLANO_VAZIO, unidadeB),
          /sua empresa/,
        )
        await assert.rejects(reserva(plano), /sua empresa/)
        await login(admin)
      },
    )
    await t.test(
      'histórico de execução valida atividade, equipamento e data',
      async () => {
        await assert.rejects(
          db.query(
            'select public.registrar_execucao_pmoc($1,$2,$3,$4,$5,$6,$7)',
            [
              plano,
              'inexistente',
              null,
              '2026-01-01',
              'Técnico',
              null,
              'Teste',
            ],
          ),
          /atividade/,
        )
        await assert.rejects(
          db.query(
            'select public.registrar_execucao_pmoc($1,$2,$3,$4,$5,$6,$7)',
            [plano, 'filtros', null, '2035-01-01', 'Técnico', null, 'Teste'],
          ),
          /até hoje/,
        )
        await db.query(
          'select public.registrar_execucao_pmoc($1,$2,$3,$4,$5,$6,$7)',
          [
            plano,
            'filtros',
            equipamento,
            '2026-01-01',
            'Técnico',
            null,
            'Verificação realizada',
          ],
        )
        await assert.rejects(
          db.exec('delete from public.pmoc_execucoes'),
          /permission denied/,
        )
        const v = await reserva(plano)
        assert.equal(v.snapshot.execucoes.length, 1)
        assert.equal(v.snapshot.execucoes[0].equipamento_tag, 'AC-01')
      },
    )
    await t.test(
      'emissão completa preserva dados, logo e execução nas versões anteriores',
      async () => {
        const dados = {
          ...PLANO_VAZIO,
          inicio: '2026-01-01',
          tecnico_nome: 'Profissional',
          tecnico_documento: 'Doc',
          tecnico_conselho: 'Conselho',
          tecnico_registro: 'Registro',
          tecnico_endereco: 'Endereço',
          tecnico_contato: 'Contato',
          responsabilidade: 'Referência técnica',
          recomendacoes: 'Orientações específicas',
          projeto_referencia: 'Projeto identificado',
          rotinas: PLANO_VAZIO.rotinas.map((r) => ({
            ...r,
            periodicidade: 'Conforme plano específico',
          })),
        }
        await salvar(plano, dados)
        const v = await reserva(plano, 'para_assinatura', true)
        assert.deepEqual(v.snapshot.pendencias, [])
        assert.equal(
          v.snapshot.identidade.logo_path,
          `${emp}/logos/${uid(90)}.png`,
        )
        const anterior = JSON.stringify(v.snapshot)
        await db.query(
          "update public.documento_identidades set nome='Nome novo',logo_path=null where empresa_id=$1",
          [emp],
        )
        await db.query(
          'update public.equipamentos set capacidade_btu=18000 where id=$1',
          [equipamento],
        )
        await salvar(plano, { ...dados, titulo: 'Plano atualizado' })
        assert.equal(
          JSON.stringify(
            (
              await row(
                'select snapshot from public.pmoc_versoes where id=$1',
                [v.id],
              )
            ).snapshot,
          ),
          anterior,
        )
        assert.ok((await reserva(plano)).numero > v.numero)
      },
    )
    await t.test(
      'arquivo só é publicado depois de armazenado; depois fica imutável',
      async () => {
        await assert.rejects(
          db.query('select public.finalizar_pmoc_pdf($1,$2)', [
            versao.id,
            'a'.repeat(64),
          ]),
          /armazenado/,
        )
        await assert.rejects(
          db.query(
            "insert into storage.objects(bucket_id,name) values('documentos',$1)",
            [`${emp}/pmoc/forjado.pdf`],
          ),
          /row-level security/,
        )
        await db.query(
          "insert into storage.objects(bucket_id,name) values('documentos',$1)",
          [versao.arquivo_path],
        )
        await db.query('select public.finalizar_pmoc_pdf($1,$2)', [
          versao.id,
          'a'.repeat(64),
        ])
        assert.equal(
          (
            await row(
              'select arquivo_status from public.pmoc_versoes where id=$1',
              [versao.id],
            )
          ).arquivo_status,
          'pronto',
        )
        assert.equal(
          (
            await db.query(
              'delete from storage.objects where name=$1 returning id',
              [versao.arquivo_path],
            )
          ).rows.length,
          0,
        )
        assert.equal(
          (
            await db.query(
              "update storage.objects set name='alterado' where name=$1 returning id",
              [versao.arquivo_path],
            )
          ).rows.length,
          0,
        )
        await assert.rejects(
          db.query('select public.finalizar_pmoc_pdf($1,null)', [versao.id]),
          /aguardando/,
        )
        await login(externo)
        assert.equal(
          (
            await db.query('select * from storage.objects where name=$1', [
              versao.arquivo_path,
            ])
          ).rows.length,
          0,
        )
        await assert.rejects(
          db.query('select public.finalizar_pmoc_pdf($1,null)', [versao.id]),
          /aguardando/,
        )
        await login(admin)
      },
    )
    await t.test(
      'migração pode ser reaplicada sem alterar PDFs ou snapshots',
      async () => {
        await db.exec('reset role')
        await db.exec(migration)
        await db.exec('set role authenticated')
        assert.equal(
          (
            await row(
              'select arquivo_status from public.pmoc_versoes where id=$1',
              [versao.id],
            )
          ).arquivo_status,
          'pronto',
        )
      },
    )
    await t.test(
      'empresa suspensa perde leitura e gravação; anônimo não emite',
      async () => {
        await db.exec(
          `reset role;update public.empresas set ativo=false where id='${emp}';set role authenticated`,
        )
        assert.equal(
          (await db.query('select * from public.pmoc_planos')).rows.length,
          0,
        )
        await assert.rejects(salvar(plano, PLANO_VAZIO), /empresa ativa/)
        await db.exec('reset role;set role anon')
        await assert.rejects(reserva(plano), /permission denied/)
      },
    )
  } finally {
    await db.close()
  }
})
