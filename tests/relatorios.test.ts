import { criarAssinatura, type Assinatura } from "../lib/relatorios/assinatura";
import { baseDemo } from "../lib/operacao/demo";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import { indexedDB } from "fake-indexeddb";
import { otimizarFoto, fotoParaPdf } from "../lib/relatorios/imagens";
import { relatorioVazio, linhaRpc } from "../lib/relatorios/modelo";
import * as fotos from "../lib/relatorios/fotos-offline";
import { gerarDocumentoOperacao } from "../lib/documentos/operacao";
import { PDFDocument } from "pdf-lib";
import { vazio, type Dados } from "../lib/operacao/modelo";
const id = (n: number) =>
  `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const emp = id(1),
  outra = id(2),
  admin = id(11),
  membro = id(12),
  externo = id(13),
  cliente = id(21),
  clienteB = id(22),
  unidade = id(31),
  unidadeB = id(32),
  ambiente = id(41),
  equipamento = id(51),
  plano = id(61),
  os = id(71),
  foto = id(81);
const fixture = `
create role authenticated; create role anon; create role service_role bypassrls; create schema auth; create schema privado; create schema storage;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table auth.users(id uuid primary key);
create table empresas(id uuid primary key,nome text,ativo boolean default true);
create table perfis(user_id uuid primary key references auth.users,empresa_id uuid references empresas,nome text,email text,papel text,is_superadmin boolean default false,created_at timestamptz default now());
create table clientes(id uuid primary key default gen_random_uuid(),empresa_id uuid references empresas,nome text,documento text,contato text,telefone text,email text,endereco text,observacoes text);
create table itens(id uuid primary key default gen_random_uuid(),empresa_id uuid references empresas,cliente_id uuid references clientes,tipo text,titulo text not null,descricao text,vencimento date not null,antecedencia_dias int default 0,status text default 'ativo',finalizado_em timestamptz,created_by uuid references auth.users,google_event_id text,updated_at timestamptz default now());
create function privado.minha_empresa() returns uuid language sql stable security definer as $$select empresa_id from public.perfis where user_id=auth.uid()$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets,name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(regexp_replace(name,'/[^/]*$',''),'/')$$;
grant usage on schema public,auth,privado,storage to authenticated,anon,service_role;
grant select,insert,update,delete on storage.objects to authenticated;
grant select on empresas,perfis,clientes,itens to authenticated;
insert into empresas values('${emp}','Empresa A',true),('${outra}','Empresa B',true);
insert into auth.users values('${admin}'),('${membro}'),('${externo}');
insert into perfis(user_id,empresa_id,nome,papel) values('${admin}','${emp}','Admin','admin'),('${membro}','${emp}','Técnico','membro'),('${externo}','${outra}','Externo','admin');
insert into clientes(id,empresa_id,nome) values('${cliente}','${emp}','Cliente A'),('${clienteB}','${outra}','Cliente B');
`;
test("resposta composta do Storage aceita objeto/lista do PostgREST e reserva ausente", () => {
  const f = { id: foto, empresa_id: emp, servico_id: os };
  assert.deepEqual(linhaRpc(f), f);
  assert.deepEqual(linhaRpc([f]), f);
  assert.equal(linhaRpc([]), undefined);
  assert.equal(linhaRpc(null), undefined);
});
test("imagens: orientação, limites, miniaturas e remoção de metadados", async () => {
  const entrada = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: "navy" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const r = await otimizarFoto(entrada),
    m = await sharp(r.foto).metadata(),
    mini = await sharp(r.miniatura).metadata();
  assert.equal(m.width, 800);
  assert.equal(m.height, 1600);
  assert.equal(m.exif, undefined);
  assert.equal(m.icc, undefined);
  assert.equal(m.orientation, undefined);
  assert.ok(Math.max(mini.width!, mini.height!) <= 320);
  assert.ok(r.foto.length <= 600000);
  assert.equal((await otimizarFoto(entrada)).sha256, r.sha256);
  assert.ok((await fotoParaPdf(r.foto)).length <= 140000);
  await assert.rejects(
    otimizarFoto(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
      ),
    ),
    /JPG/,
  );
  await assert.rejects(otimizarFoto(new Uint8Array(600001)), /600 KB/);
  await assert.rejects(otimizarFoto(Buffer.from("não é foto")));
});
test("fotos offline: blobs duráveis, isolamento de contas, confirmação e limpeza", async () => {
  Object.assign(globalThis, { indexedDB });
  const f = {
    id: foto,
    chave: "a:empresa",
    servico_id: os,
    blob: new Blob(["foto"], { type: "image/jpeg" }),
    enviada: false,
  };
  await fotos.guardarFoto(f);
  assert.equal((await fotos.listarFotosLocais(f.chave)).length, 1);
  assert.equal((await fotos.listarFotosLocais("outra:empresa")).length, 0);
  assert.equal(await fotos.lerFotoLocal("b:empresa", foto), undefined);
  assert.equal(await fotos.fotosPendentes(), 1);
  assert.equal(
    await (await fotos.lerFotoLocal(f.chave, foto))?.blob.text(),
    "foto",
  );
  await fotos.guardarFoto({ ...f, enviada: true });
  assert.equal(await fotos.fotosPendentes(), 0);
  await fotos.removerFotoLocal("b:empresa", foto);
  assert.ok(await fotos.lerFotoLocal(f.chave, foto));
  await fotos.limparFotosLocais();
  assert.equal(await fotos.lerFotoLocal(f.chave, foto), undefined);
});
test("relatório SQL: isolamento, fotos, PMOC, ciência, retorno e preservação", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(fixture);
    for (const nome of [
      "20261030_demandas_climatizacao.sql",
      "20261030_pmoc_documentos.sql",
      "20261031_operacao_offline.sql",
      "20261031_relatorios_fotos.sql",
      "20261101_assinatura_atendimento.sql",
    ])
      await db.exec(
        await readFile(
          new URL("../supabase/migrations/" + nome, import.meta.url),
          "utf8",
        ),
      );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261031_relatorios_fotos.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      `insert into unidades(id,empresa_id,cliente_id,nome) values('${unidade}','${emp}','${cliente}','Unidade A'),('${unidadeB}','${outra}','${clienteB}','Unidade B'); insert into ambientes(id,empresa_id,unidade_id,nome) values('${ambiente}','${emp}','${unidade}','Recepção'); insert into equipamentos(id,empresa_id,unidade_id,ambiente_id,tag) values('${equipamento}','${emp}','${unidade}','${ambiente}','AC-01'); insert into pmoc_planos(id,empresa_id,unidade_id,dados) values('${plano}','${emp}','${unidade}','{"rotinas":[{"id":"filtros","atividade":"Inspecionar filtros"}]}');`,
    );
    const login = async (user = admin) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user,
      ]);
      await db.exec("set role authenticated");
    };
    const row = async (sql: string, args: unknown[] = []) =>
      (await db.query<any>(sql, args)).rows[0];
    const rel = {
      ...relatorioVazio("2026-01-01"),
      unidade_id: unidade,
      equipamento_ids: [equipamento],
      plano_id: plano,
    };
    let dados = {
      ...vazio("servico", membro),
      titulo: "Manutenção",
      cliente_id: cliente,
      estado: "em_andamento",
      relatorio: rel,
      checklist: [
        { descricao: "Conferir filtros", feito: true, rotina_id: "filtros" },
      ],
      resultado: "Filtros inspecionados.",
    };
    const salvar = async (
      d: Dados = dados,
      versao = 0,
      operacao = crypto.randomUUID(),
    ) =>
      (
        await row("select aplicar_operacao($1,$2,$3,$4,$5::jsonb) r", [
          operacao,
          "servico",
          os,
          versao,
          JSON.stringify(d),
        ])
      ).r;
    const reservar = async (
      fid = foto,
      sha = "a".repeat(64),
      servico = os,
      bytes = 1000,
    ) =>
      row("select * from reservar_foto_servico($1,$2,$3,$4,$5,$6,800,600)", [
        emp,
        admin,
        servico,
        fid,
        sha,
        bytes,
      ]);
    await login();
    await t.test(
      "rejeita unidade de outra empresa, equipamento fora da unidade, rotina falsa e campos inválidos",
      async () => {
        await assert.rejects(
          salvar({ ...dados, relatorio: { ...rel, unidade_id: unidadeB } }),
          /unidade do cliente/,
        );
        await assert.rejects(
          salvar({
            ...dados,
            relatorio: { ...rel, equipamento_ids: [id(999)] },
          }),
          /equipamentos/,
        );
        await assert.rejects(
          salvar({
            ...dados,
            checklist: [
              { descricao: "Etapa", feito: true, rotina_id: "falsa" },
            ],
          }),
          /rotina/,
        );
        await assert.rejects(
          salvar({ ...dados, relatorio: { ...rel, inicio: "25:00" } }),
          /horários/,
        );
        await assert.rejects(
          salvar({
            ...dados,
            relatorio: {
              ...rel,
              fotos: [
                { id: foto, etapa: "antes", legenda: "", equipamento_id: null },
              ],
            },
          }),
          /Sincronize/,
        );
      },
    );
    await t.test(
      "somente servidor reserva arquivos, quota é contabilizada e reenvio não duplica",
      async () => {
        await assert.rejects(reservar(), /permission denied/);
        await assert.rejects(
          db.exec(
            `insert into storage.objects(bucket_id,name) values('evidencias','${emp}/${os}/${foto}.jpg')`,
          ),
          /row-level/,
        );
        await db.exec("reset role");
        const a = await reservar(),
          b = await reservar();
        assert.equal(a.id, b.id);
        await assert.rejects(reservar(id(82)), /já foi enviada/);
        await assert.rejects(reservar(foto, "b".repeat(64)), /Identificador/);
        await db.exec(
          `insert into evidencias_limites values('${emp}',1048576)`,
        );
        await reservar(id(83), "b".repeat(64), id(73), 600000);
        await assert.rejects(
          reservar(id(84), "c".repeat(64), id(74), 600000),
          /espaço/,
        );
        await assert.rejects(
          db.query("select finalizar_foto_servico($1,$2)", [emp, foto]),
          /incompleto/,
        );
        for (const sufixo of [".jpg", "-mini.jpg"])
          await db.query(
            "insert into storage.objects(bucket_id,name) values('evidencias',$1)",
            [`${emp}/${os}/${foto}${sufixo}`],
          );
        await db.query("select finalizar_foto_servico($1,$2)", [emp, foto]);
        await login(externo);
        assert.equal(
          (await db.query("select * from servico_fotos")).rows.length,
          0,
        );
        await login(membro);
        assert.equal(
          (await db.query("select * from servico_fotos")).rows.length,
          2,
        );
        assert.equal(
          (await row("select uso_fotos_servico() r")).r.usado,
          601000,
        );
      },
    );
    const fotografias = [
      {
        id: foto,
        etapa: "antes" as const,
        legenda: "Filtro antes da limpeza",
        equipamento_id: equipamento,
      },
    ];
    await t.test(
      "rascunho não alimenta PMOC; foto vinculada não é coletada",
      async () => {
        dados = { ...dados, relatorio: { ...rel, fotos: fotografias } };
        await salvar();
        assert.equal(
          (await db.query("select * from pmoc_execucoes")).rows.length,
          0,
        );
        await db.exec("reset role");
        assert.equal(
          (
            await row("select descartar_foto_servico($1,$2,false) r", [
              emp,
              foto,
            ])
          ).r,
          null,
        );
        await db.exec(
          `update servico_fotos set updated_at=now()-interval '2 days'`,
        );
        const candidatos = (
          await db.query<any>("select * from fotos_abandonadas()")
        ).rows;
        assert.equal(candidatos.length, 1);
        assert.equal(candidatos[0].id, id(83));
        await login(membro);
      },
    );
    await t.test(
      "foto sem vínculo coletada pode ser reenviada com o mesmo UUID da fila offline",
      async () => {
        await db.exec("reset role");
        const descartada = await row(
          "select * from descartar_foto_servico($1,$2,true)",
          [emp, id(83)],
        );
        assert.equal(descartada.id, id(83));
        await db.query(
          "delete from servico_fotos where id=$1 and empresa_id=$2 and estado='excluindo'",
          [id(83), emp],
        );
        const restaurada = await reservar(
          id(83),
          "b".repeat(64),
          id(73),
          600000,
        );
        assert.equal(restaurada.id, id(83));
        assert.equal(restaurada.estado, "reservada");
        await login(membro);
      },
    );
    await t.test(
      "conclusão exige ciência válida e preserva snapshot, gera execução e retorno uma única vez",
      async () => {
        const final = {
          ...dados,
          estado: "concluida",
          relatorio: {
            ...dados.relatorio,
            proxima_manutencao: "2099-01-01",
            criar_retorno: true,
            ciencia: {
              situacao: "presente" as const,
              nome: "",
              cargo: "Gestora",
              confirmada: false,
            },
          },
        };
        await assert.rejects(salvar(final, 1), /representante/);
        final.relatorio.ciencia = {
          situacao: "presente",
          nome: "Ana",
          cargo: "Gestora",
          confirmada: true,
        };
        const assinatura = criarAssinatura(
          { id: os, tipo: "servico", versao: 1, dados: final },
          {
            ...baseDemo(),
            usuario: { ...baseDemo().usuario, id: membro, empresa_id: emp },
          },
          [
            [
              [100, 400],
              [150, 300],
              [200, 600],
              [300, 500],
              [400, 300],
              [500, 500],
            ],
          ],
        );
        const assinado: Dados = {
          ...final,
          relatorio: { ...final.relatorio, assinatura },
        };
        await assert.rejects(
          salvar({ ...assinado, resultado: "Mudou após assinar" }, 1),
          /mudou depois/,
        );
        await assert.rejects(
          salvar(
            {
              ...assinado,
              relatorio: {
                ...assinado.relatorio!,
                ciencia: { ...final.relatorio.ciencia, nome: "Outra pessoa" },
              },
            },
            1,
          ),
          /mudou depois/,
        );
        for (const patch of [
          { termo: "Termo falso" },
          { formato: 2 },
          { tracos: [[[100, 100]]] },
          {
            tracos: [
              [
                [100, 100],
                [101, 101],
                [102, 102],
                [103, 103],
                [104, 104],
                [105, 105],
              ],
            ],
          },
          {
            tracos: [
              [
                [100, 100],
                [100, 100],
                [100, 100],
                [100, 100],
                [100, 100],
                [1001, 100],
              ],
            ],
          },
          {
            conteudo: JSON.stringify({
              ...JSON.parse(assinatura.conteudo),
              os: id(999),
            }),
          },
          {
            conteudo: JSON.stringify({
              ...JSON.parse(assinatura.conteudo),
              empresa: outra,
            }),
          },
          {
            conteudo: JSON.stringify({
              ...JSON.parse(assinatura.conteudo),
              coletor: admin,
            }),
          },
          {
            conteudo: JSON.stringify({
              ...JSON.parse(assinatura.conteudo),
              versao: 0,
            }),
          },
        ])
          await assert.rejects(
            salvar(
              {
                ...assinado,
                relatorio: {
                  ...assinado.relatorio!,
                  assinatura: { ...assinatura, ...patch } as Assinatura,
                },
              },
              1,
            ),
          );
        const op = crypto.randomUUID(),
          a = await salvar(assinado, 1, op),
          b = await salvar(assinado, 1, op);
        assert.deepEqual(a, b);
        assert.match(
          a.dados.relatorio.snapshot.aceite.sha256,
          /^[a-f0-9]{64}$/,
        );
        assert.equal(a.dados.relatorio.snapshot.aceite.versao, 2);
        assert.equal(a.dados.relatorio.snapshot.aceite.registrado_por, membro);
        assert.deepEqual(a.dados.relatorio.assinatura, assinatura);
        const imagem = await sharp({
          create: { width: 600, height: 300, channels: 3, background: "navy" },
        })
          .jpeg()
          .toBuffer();
        const pdf = await gerarDocumentoOperacao(
          a,
          a.dados.relatorio.snapshot.identidade,
          a.dados.relatorio.snapshot.cliente,
          undefined,
          [{ id: foto, bytes: imagem }],
        );
        await mkdir("tmp", { recursive: true });
        await writeFile("tmp/relatorio-assinado.pdf", pdf);
        const doc = await PDFDocument.load(pdf);
        assert.ok(doc.getPageCount() >= 2);
        for (const p of doc.getPages()) {
          assert.ok(Math.abs(p.getWidth() - 595.28) < 0.1);
          assert.ok(Math.abs(p.getHeight() - 841.89) < 0.1);
        }

        const confere = await row(
          `select encode(sha256(convert_to(jsonb_build_object('assinatura',dados->'relatorio'->'assinatura','snapshot',(dados->'relatorio'->'snapshot')-'aceite','fotos',jsonb_build_array(jsonb_build_object('id',$2::uuid,'sha256',repeat('a',64))),'empresa',empresa_id,'os',id,'versao',versao,'registrado_por',(dados->'relatorio'->'snapshot'->'aceite'->>'registrado_por')::uuid,'recebido_em',(dados->'relatorio'->'snapshot'->'aceite'->>'recebido_em')::timestamptz)::text,'UTF8')),'hex') hash from operacao_registros where id=$1`,
          [os, foto],
        );
        assert.equal(confere.hash, a.dados.relatorio.snapshot.aceite.sha256);
        assert.equal(a.dados.relatorio.snapshot.tecnico, "Técnico");
        assert.ok(a.dados.relatorio.snapshot.retorno_id);
        assert.equal(
          (await db.query("select * from pmoc_execucoes")).rows.length,
          1,
        );
        assert.equal(
          (await db.query("select * from itens where tipo='acompanhamento'"))
            .rows.length,
          1,
        );
        await assert.rejects(
          salvar({ ...final, resultado: "Alterado" }, 2),
          /preservado/,
        );
        await assert.rejects(
          salvar({ ...final, relatorio: undefined }, 2),
          /preservado/,
        );
        await db.exec("reset role");
        await db.exec(
          `update equipamentos set tag='AC-NOVO' where id='${equipamento}'; update unidades set nome='Unidade nova' where id='${unidade}';`,
        );
        assert.equal(
          (await row("select dados from operacao_registros where id=$1", [os]))
            .dados.relatorio.snapshot.equipamentos[0].tag,
          "AC-01",
        );
        assert.equal(
          (
            await row("select descartar_foto_servico($1,$2,false) r", [
              emp,
              foto,
            ])
          ).r,
          null,
        );
        await login(externo);
        assert.equal(
          (await db.query("select * from operacao_registros")).rows.length,
          0,
        );
      },
    );
  } finally {
    await db.close();
  }
});
test("PDF do relatório inclui fotos, mantém A4 e rejeita evidência ausente", async () => {
  const fotoBytes = await sharp({
    create: { width: 1200, height: 700, channels: 3, background: "navy" },
  })
    .jpeg()
    .toBuffer();
  const rel = {
    ...relatorioVazio("2026-01-01"),
    fotos: [
      {
        id: foto,
        etapa: "antes" as const,
        legenda: "Registro de demonstração, imagem ilustrativa.",
        equipamento_id: equipamento,
      },
    ],
    snapshot: {
      identidade: {
        nome: "Prestadora de demonstração",
        documento: "00.000.000/0000-00",
        endereco: "Endereço fictício",
        telefone: "",
        email: "",
      },
      cliente: { nome: "Cliente fictício" },
      unidade: { nome: "Unidade A", endereco: "Rua de exemplo, 100" },
      equipamentos: [
        {
          id: equipamento,
          tag: "AC-01",
          marca: "Marca",
          modelo: "Split",
          serie: "DEMO",
          ambiente: "Recepção",
        },
      ],
      tecnico: "Técnico de demonstração",
      emitido_em: "2026-10-31T15:00:00Z",
      registrado_por: admin,
    },
  };
  const r = {
    id: os,
    tipo: "servico" as const,
    versao: 2,
    dados: {
      ...vazio("servico", admin),
      titulo: "Manutenção preventiva",
      estado: "concluida",
      relatorio: rel,
      checklist: [{ descricao: "Inspeção de filtros e drenagem", feito: true }],
      resultado: "Limpeza e inspeção realizadas, conforme checklist.",
    },
  };
  await assert.rejects(
    gerarDocumentoOperacao(r, rel.snapshot.identidade, rel.snapshot.cliente),
    /foto/,
  );
  const bytes = await gerarDocumentoOperacao(
    r,
    rel.snapshot.identidade,
    rel.snapshot.cliente,
    undefined,
    [{ id: foto, bytes: fotoBytes }],
  );
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() >= 2);
  for (const p of pdf.getPages()) {
    assert.equal(p.getWidth(), 595.28);
    assert.equal(p.getHeight(), 841.89);
  }
  await mkdir("tmp/pdfs", { recursive: true });
  await writeFile("tmp/pdfs/relatorio-qa.pdf", bytes);
});

test("PDF com 20 fotos ruidosas permanece abaixo do limite da hospedagem", async () => {
  const original = await sharp(randomBytes(1600 * 1600 * 3), {
    raw: { width: 1600, height: 1600, channels: 3 },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
  const pequena = await fotoParaPdf(original);
  assert.ok(pequena.length <= 140000);
  const rel = relatorioVazio("2026-01-01");
  rel.fotos = Array.from({ length: 20 }, (_, i) => ({
    id: id(100 + i),
    etapa: "evidencia",
    legenda: "Foto de teste",
    equipamento_id: null,
  }));
  const r = {
    id: os,
    tipo: "servico" as const,
    versao: 1,
    dados: {
      ...vazio("servico", admin),
      relatorio: rel,
      titulo: "Inspeção",
      resultado: "Serviço de teste",
    },
  };
  const bytes = await gerarDocumentoOperacao(
    r,
    {
      nome: "Empresa fictícia",
      documento: "",
      endereco: "",
      telefone: "",
      email: "",
    },
    { nome: "Cliente fictício" },
    undefined,
    rel.fotos.map((f) => ({ id: f.id, bytes: pequena })),
  );
  assert.ok(bytes.length < 4_000_000, `PDF: ${bytes.length} bytes`);
});
