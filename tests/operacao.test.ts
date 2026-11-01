import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import ExcelJS from "exceljs";
import { indexedDB } from "fake-indexeddb";
import {
  decimalBR,
  totalOrcamento,
  vazio,
  type Operacao,
} from "../lib/operacao/modelo";
import { lerCSV, prepararLinhas } from "../lib/operacao/importacao";
import { lerXlsx, conferirZip } from "../lib/operacao/xlsx";
import { baseDemo } from "../lib/operacao/demo";
import * as offline from "../lib/operacao/offline";
const id = (n: number) =>
  `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("dinheiro usa centavos e arredonda cada linha sem erros de ponto flutuante", () => {
  assert.equal(decimalBR("1.250,50"), 125050);
  assert.equal(decimalBR("1,125", 3), 1125);
  for (const v of ["1.25", "-1", "1,234", "NaN", "1e3"])
    assert.throws(() => decimalBR(v));
  assert.equal(
    totalOrcamento(
      [
        {
          descricao: "Teste",
          tipo: "servico",
          quantidade_mil: 1500,
          preco_centavos: 101,
        },
      ],
      1,
    ),
    151,
  );
  assert.throws(() =>
    totalOrcamento(
      [
        {
          descricao: "Teste",
          tipo: "servico",
          quantidade_mil: 1,
          preco_centavos: 1,
        },
      ],
      1,
    ),
  );
});
test("CSV aceita acentos, campos entre aspas e zeros à esquerda; aponta erros e duplicados", () => {
  const r = prepararLinhas(
    lerCSV(
      '\uFEFFNome;CNPJ;E-mail;Observacoes\r\n"Cliente; A";001234;ana@exemplo.com;"Uma linha\noutra"\r\nOutro;001234;invalido;\r\n',
    ),
  );
  assert.equal(r[0].cliente.nome, "Cliente; A");
  assert.equal(r[0].cliente.documento, "001234");
  assert.equal(r[0].cliente.observacoes, "Uma linha\noutra");
  assert.equal(r[1].duplicado, true);
  assert.ok(r[1].erros.length);
  assert.throws(() => lerCSV('Nome\n"Sem fechar'));
  assert.throws(() =>
    prepararLinhas([
      ["Nome", "Cliente"],
      ["a", "b"],
    ]),
  );
  assert.throws(() => prepararLinhas([["Telefone"], ["123"]]));
});
test("XLSX lê texto, recusa fórmulas e arquivos inválidos antes de importar", async () => {
  const w = new ExcelJS.Workbook(),
    s = w.addWorksheet("Clientes");
  s.addRow(["Nome", "CNPJ"]);
  s.addRow(["São José", "00123"]);
  const b = Buffer.from(await w.xlsx.writeBuffer());
  assert.equal((await lerXlsx(b))[1][1], "00123");
  s.getCell("A2").value = { formula: "1+1", result: 2 };
  await assert.rejects(
    lerXlsx(Buffer.from(await w.xlsx.writeBuffer())),
    /fórmulas/,
  );
  assert.throws(() => conferirZip(Buffer.from("invalido")));
});
test("fila durável mantém operação estável, isola contas e não apaga um envio novo por confirmação antiga", async () => {
  Object.assign(globalThis, {
    indexedDB,
    localStorage: new (class {
      m = new Map<string, string>();
      getItem(k: string) {
        return this.m.get(k) || null;
      }
      setItem(k: string, v: string) {
        this.m.set(k, v);
      }
      removeItem(k: string) {
        this.m.delete(k);
      }
    })(),
  });
  const base = baseDemo();
  base.registros.push({
    id: id(80),
    tipo: "financeiro",
    versao: 1,
    dados: { ...vazio("financeiro"), titulo: "Segredo" },
  });
  const k = await offline.ativar(base);
  assert.equal(
    (await offline.carregar(k))?.base.registros.some(
      (r) => r.tipo === "financeiro",
    ),
    false,
  );
  const o: Operacao = {
    operacao: id(90),
    id: id(91),
    tipo: "orcamento",
    versao: 0,
    dados: { ...vazio("orcamento"), titulo: "Offline" },
  };
  await offline.enfileirar(k, o);
  assert.equal((await offline.carregar(k))?.fila[0].operacao, o.operacao);
  await offline.reservarEnvio(k, o);
  await assert.rejects(
    offline.enfileirar(k, { ...o, operacao: id(92) }),
    /confirmação/,
  );
  const editavel={...o,id:id(94),operacao:id(95)};
  await offline.enfileirar(k,editavel);
  await offline.enfileirar(k,{...editavel,operacao:id(96),dados:{...editavel.dados,titulo:'Revisado sem conexão'}});
  assert.equal((await offline.carregar(k))?.fila.find(p=>p.id===id(94))?.dados.titulo,'Revisado sem conexão');
  assert.equal(await offline.reservarEnvio(k,editavel),undefined);
  await offline.marcarErro(k, o, "Conflito", true);
  const novo = { ...o, operacao: id(93), versao: 2 };
  await offline.substituirEnvio(k, o.operacao, novo);
  await offline.acusar(k, o, {
    id: o.id,
    tipo: o.tipo,
    dados: o.dados,
    versao: 1,
  });
  assert.equal((await offline.carregar(k))?.fila[0].operacao, novo.operacao);
  const outra = { ...base, usuario: { ...base.usuario, id: id(99) } };
  await assert.rejects(offline.atualizarBase(k, outra), /conta/);
  await offline.limpar();
  assert.equal(await offline.carregar(), undefined);
});
const emp = id(1),
  outro = id(2),
  admin = id(11),
  membro = id(12),
  externo = id(13),
  cliente = id(21),
  clienteB = id(22);
const fixture = `
create role authenticated;create role anon;create schema auth;create schema privado;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table auth.users(id uuid primary key);
create table empresas(id uuid primary key,ativo boolean default true);
create table perfis(user_id uuid primary key references auth.users,empresa_id uuid references empresas,nome text,email text,papel text,created_at timestamptz default now());
create table clientes(id uuid primary key default gen_random_uuid(),empresa_id uuid references empresas,nome text,documento text,contato text,telefone text,email text,endereco text,observacoes text);
create table itens(id uuid primary key default gen_random_uuid(),empresa_id uuid references empresas,cliente_id uuid references clientes,tipo text,titulo text not null,descricao text,vencimento date not null,antecedencia_dias int default 0,status text default 'ativo',finalizado_em timestamptz,created_by uuid references auth.users,google_event_id text,updated_at timestamptz default now());
create function privado.minha_empresa() returns uuid language sql stable security definer as $$select empresa_id from public.perfis where user_id=auth.uid()$$;
grant usage on schema public,auth,privado to authenticated,anon;
grant select on empresas,perfis,clientes to authenticated;
insert into empresas values('${emp}',true),('${outro}',true);
insert into auth.users values('${admin}'),('${membro}'),('${externo}');
insert into perfis(user_id,empresa_id,nome,papel) values('${admin}','${emp}','Admin','admin'),('${membro}','${emp}','Técnico','membro'),('${externo}','${outro}','Externo','admin');
insert into clientes(id,empresa_id,nome) values('${cliente}','${emp}','Cliente A'),('${clienteB}','${outro}','Cliente B');
`;
test("operação SQL: isolamento, reenvio, conflitos, OS, financeiro e importação atômica", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(fixture);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261030_demandas_climatizacao.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const migration = await readFile(
      new URL(
        "../supabase/migrations/20261031_operacao_offline.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    const login = async (u: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        u,
      ]);
      await db.exec("set role authenticated");
    };
    const salvar = async (
      tipo: string,
      rid: string,
      versao: number,
      dados: unknown,
      op = crypto.randomUUID(),
    ) =>
      (
        await db.query<{ r: any }>(
          "select public.aplicar_operacao($1,$2,$3,$4,$5::jsonb) r",
          [op, tipo, rid, versao, JSON.stringify(dados)],
        )
      ).rows[0].r;
    const qid = id(31),
      osid = id(32),
      fid = id(33),
      op = id(34);
    const dados = {
      ...vazio("orcamento", admin),
      titulo: "Proposta",
      data: "2035-01-01",
      cliente_id: cliente,
      itens: [
        {
          descricao: "Teste",
          tipo: "servico",
          quantidade_mil: 1500,
          preco_centavos: 101,
        },
      ],
      total_centavos: 1,
    };
    await login(admin);
    await t.test("calcula total no banco e reenvio não duplica", async () => {
      const a = await salvar("orcamento", qid, 0, dados, op),
        b = await salvar("orcamento", qid, 0, dados, op);
      assert.equal(a.dados.total_centavos, 152);
      assert.deepEqual(a, b);
      await assert.rejects(
        salvar("orcamento", qid, 0, { ...dados, titulo: "Outro" }, op),
        /já utilizado/,
      );
      await assert.rejects(
        salvar("orcamento", qid, 0, dados),
        /outro dispositivo/,
      );
      await assert.rejects(
        db.exec("update operacao_registros set versao=100"),
        /permission denied/,
      );
    });
    await t.test("recusa referências e leituras entre empresas", async () => {
      await assert.rejects(
        salvar("orcamento", id(35), 0, { ...dados, cliente_id: clienteB }),
        /sua empresa/,
      );
      await login(externo);
      assert.equal(
        (await db.query("select * from operacao_registros")).rows.length,
        0,
      );
      await assert.rejects(salvar("orcamento", qid, 1, dados), /indisponível/);
      await login(admin);
    });
    await t.test('cadastro usado em orçamento não pode ser excluído',async()=>{
      await db.exec('reset role');
      await assert.rejects(db.query('delete from clientes where id=$1',[cliente]),/foreign key/);
      await login(admin);
    });
    let aprovado: any;
    await t.test(
      "aprovação preserva valores e não cria recebimento",
      async () => {
        aprovado = await salvar("orcamento", qid, 1, {
          ...dados,
          estado: "aprovado",
        });
        assert.equal(
          (
            await db.query(
              "select * from operacao_registros where tipo='financeiro'",
            )
          ).rows.length,
          0,
        );
        await assert.rejects(
          salvar("orcamento", qid, 2, {
            ...aprovado.dados,
            itens: [{ ...dados.itens[0], preco_centavos: 1 }],
          }),
          /preservados/,
        );
      },
    );
    await t.test(
      "OS exige checklist e resultado para concluir e não duplica vínculo",
      async () => {
        const s = {
          ...vazio("servico", admin),
          titulo: "Serviço",
          cliente_id: cliente,
          orcamento_id: qid,
        };
        const a = await salvar("servico", osid, 0, s);
        assert.equal(a.versao, 1);
        await assert.rejects(salvar("servico", id(36), 0, s), /duplicate key/);
        await assert.rejects(
          salvar("servico", osid, 1, { ...s, estado: "concluida" }),
          /Marque/,
        );
        const b = await salvar("servico", osid, 1, {
          ...s,
          estado: "concluida",
          resultado: "Limpeza realizada.",
          checklist: s.checklist!.map((c) => ({ ...c, feito: true })),
        });
        assert.equal(b.versao, 2);
      },
    );
    await t.test(
      "recebível não é caixa, baixa parcial é imutável e reenvio não duplica",
      async () => {
        const f = {
          ...vazio("financeiro"),
          titulo: "Receber proposta",
          cliente_id: cliente,
          orcamento_id: qid,
          valor_centavos: 152,
        };
        await salvar("financeiro", fid, 0, f);
        const b = await salvar(
          "baixa",
          fid,
          1,
          { valor_centavos: 52, data: "2026-01-01" },
          id(40),
        );
        assert.equal(b.dados.baixas.length, 1);
        assert.deepEqual(
          await salvar(
            "baixa",
            fid,
            1,
            { valor_centavos: 52, data: "2026-01-01" },
            id(40),
          ),
          b,
        );
        await assert.rejects(
          salvar("baixa", fid, 2, { valor_centavos: 101, data: "2026-01-01" }),
          /saldo/,
        );
        await assert.rejects(
          salvar("financeiro", fid, 2, { ...b.dados, valor_centavos: 1 }),
          /preservados/,
        );
        await login(membro);
        assert.equal(
          (
            await db.query(
              "select * from operacao_registros where tipo='financeiro'",
            )
          ).rows.length,
          0,
        );
        await assert.rejects(
          salvar("baixa", fid, 2, { valor_centavos: 1, data: "2026-01-01" }),
          /administradores/,
        );
        await login(admin);
      },
    );
    await t.test(
      "demandas usam histórico existente e detectam edição feita fora do offline",
      async () => {
        const d = {
          ...vazio("demanda", admin),
          titulo: "Retornar proposta",
          cliente_id: cliente,
          data: "2035-01-01",
          proxima_acao: "Ligar",
        };
        const a = await salvar("demanda", id(50), 0, d, id(51));
        assert.ok(a.id);
        assert.equal(a.versao, 1);
        await db.query("select public.salvar_demanda($1,$2::jsonb)", [
          a.id,
          JSON.stringify({ titulo: "Editado no painel" }),
        ]);
        await assert.rejects(
          salvar("demanda", a.id, 1, d),
          /outro dispositivo/,
        );
      },
    );
    await t.test(
      "importação atômica, ignora documentos repetidos e retry é estável",
      async () => {
        const c = {
          nome: "Novo",
          documento: "00.123",
          contato: "",
          telefone: "",
          email: "",
          endereco: "",
          observacoes: "",
        };
        const importar = async (lista: unknown[], opid = id(60)) =>
          (
            await db.query<{ r: any }>(
              "select public.importar_clientes($1,$2::jsonb) r",
              [opid, JSON.stringify(lista)],
            )
          ).rows[0].r;
        const r = await importar([c, { ...c, nome: "Duplicado" }]);
        assert.deepEqual(r, { inseridos: 1, ignorados: 1 });
        assert.deepEqual(await importar([c, { ...c, nome: "Duplicado" }]), r);
        await assert.rejects(
          importar(
            [
              { ...c, documento: "novo" },
              { ...c, nome: "" },
            ],
            id(61),
          ),
          /Revise/,
        );
        assert.equal(
          (await db.query("select * from clientes where documento='novo'")).rows
            .length,
          0,
        );
      },
    );
    await t.test(
      "empresa suspensa e visitante não executam operação",
      async () => {
        await db.exec(
          `reset role;update empresas set ativo=false where id='${emp}';set role authenticated`,
        );
        assert.equal(
          (await db.query("select * from operacao_registros")).rows.length,
          0,
        );
        await assert.rejects(
          salvar("orcamento", id(70), 0, dados),
          /empresa ativa/,
        );
        await db.exec("reset role;set role anon");
        await assert.rejects(
          salvar("orcamento", id(71), 0, dados),
          /permission denied/,
        );
      },
    );
  } finally {
    await db.close();
  }
});

test("PDFs de orçamento e OS reutilizam o timbrado A4 em conteúdo longo", async () => {
  const { gerarDocumentoOperacao } = await import("../lib/documentos/operacao");
  const { PDFDocument } = await import("pdf-lib");
  for (const r of baseDemo().registros.filter(
    (r) => r.tipo === "orcamento" || r.tipo === "servico",
  )) {
    const b = await gerarDocumentoOperacao(
      {
        ...r,
        dados: {
          ...r.dados,
          observacoes: "Observação longa para conferir paginação. ".repeat(500),
        },
      },
      {
        nome: "Prestadora fictícia",
        documento: "",
        endereco: "",
        telefone: "",
        email: "",
      },
      { nome: "Cliente fictício" },
    );
    const p = await PDFDocument.load(b);
    assert.ok(p.getPageCount() > 1);
    for (const pg of p.getPages()) {
      assert.equal(pg.getWidth(), 595.28);
      assert.equal(pg.getHeight(), 841.89);
    }
  }
});
