import { test } from "node:test";
import assert from "node:assert/strict";
import { indexedDB } from "fake-indexeddb";
import { baseDemo } from "../lib/operacao/demo";
import {
  criarAssinatura,
  semAssinatura,
  validarTracos,
  type Tracos,
} from "../lib/relatorios/assinatura";
import * as offline from "../lib/operacao/offline";
const tracos: Tracos = [
  [
    [100, 700],
    [200, 300],
    [250, 600],
    [400, 350],
    [500, 600],
    [650, 400],
  ],
];
test("aceite vincula OS, empresa, versão, coletor e conteúdo sem alterar o original", () => {
  const b = baseDemo(),
    r = structuredClone(b.registros.find((r) => r.tipo === "servico")!);
  r.dados.estado = "concluida";
  const antes = structuredClone(r);
  const a = criarAssinatura(r, b, tracos),
    c = JSON.parse(a.conteudo);
  assert.equal(c.os, r.id);
  assert.equal(c.empresa, b.usuario.empresa_id);
  assert.equal(c.versao, r.versao);
  assert.equal(c.coletor, b.usuario.id);
  assert.deepEqual(c.dados, r.dados);
  assert.deepEqual(r, antes);
  const d = { ...r.dados, relatorio: { ...r.dados.relatorio!, assinatura: a } };
  assert.deepEqual(semAssinatura(d), r.dados);
  assert.ok(d.relatorio.assinatura);
  const outro = criarAssinatura(
    { ...r, dados: { ...r.dados, resultado: "Modificado" } },
    b,
    tracos,
  );
  assert.notEqual(outro.conteudo, a.conteudo);
});
test("desenho rejeita pontos isolados, números inválidos, excesso e relatório muito extenso", () => {
  assert.equal(validarTracos(tracos), true);
  for (const t of [
    [],
    [[[1, 2]]],
    [
      [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
        [5, 5],
      ],
    ],
    [
      [
        [0, 0],
        [10, 10],
        [20, 20],
        [30, 30],
        [40, 40],
        [1001, 100],
      ],
    ],
    Array(33).fill(tracos[0]),
    [Array(801).fill([100, 500])],
    [
      [
        [NaN, 0],
        [Infinity, 2],
      ],
    ],
  ] as Tracos[])
    assert.equal(validarTracos(t), false);
  const b = baseDemo(),
    r = b.registros.find((r) => r.tipo === "servico")!;
  assert.throws(
    () =>
      criarAssinatura(
        { ...r, dados: { ...r.dados, observacoes: "á".repeat(35000) } },
        b,
        tracos,
      ),
    /extenso/,
  );
});
test("assinatura offline sobrevive à retomada, fica isolada por conta e sai da fila somente após recibo", async () => {
  Object.assign(globalThis, {
    indexedDB,
    localStorage: {
      setItem() {},
      getItem() {
        return null;
      },
      removeItem() {},
    },
  });
  const b = baseDemo(),
    r = structuredClone(b.registros.find((r) => r.tipo === "servico")!);
  r.dados.estado = "concluida";
  const a = criarAssinatura(r, b, tracos);
  r.dados.relatorio!.assinatura = a;
  const chave = await offline.ativar(b),
    o = { ...r, operacao: crypto.randomUUID() };
  await offline.enfileirar(chave, o);
  const retomada = await offline.carregar(chave);
  assert.deepEqual(retomada?.fila[0].dados.relatorio?.assinatura, a);
  assert.equal(await offline.carregar("outra:empresa"), undefined);
  assert.equal((await offline.reservarEnvio(chave, o))?.operacao, o.operacao);
  assert.equal((await offline.carregar(chave))?.fila.length, 1);
  await offline.acusar(chave, o, { ...r, versao: r.versao + 1 });
  assert.equal((await offline.carregar(chave))?.fila.length, 0);
  assert.deepEqual(
    (await offline.carregar(chave))?.base.registros.find((v) => v.id === r.id)
      ?.dados.relatorio?.assinatura,
    a,
  );
  await offline.limpar();
});
