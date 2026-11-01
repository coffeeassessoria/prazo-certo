/** Servidor LOCAL para conferir navegador/SW sem contas ou dados reais.
 * Next deve estar em :3001. Execute: npx tsx tests/fixtures/servidor-operacao.ts
 * Estado fictício fica em /tmp. Nunca publicar como API da aplicação.
 */
import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { baseDemo } from "../../lib/operacao/demo";
import {
  totalOrcamento,
  type Base,
  type Registro,
} from "../../lib/operacao/modelo";
async function main() {
  const arquivo = "/private/tmp/prazo-certo-qa-operacao.json";
  let base: Base;
  try {
    base = JSON.parse(await readFile(arquivo, "utf8"));
  } catch {
    base = baseDemo();
    base.usuario.empresa = "Empresa fictícia · teste local";
  }
  const recibos = new Map<string, Registro>();
  http
    .createServer(async (req, res) => {
      if (req.url === "/api/operacao") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        if (req.method === "GET") {
          base.sincronizado = new Date().toISOString();
          res.end(JSON.stringify(base));
          return;
        }
        const partes: Buffer[] = [];
        for await (const p of req) partes.push(p);
        const o = JSON.parse(Buffer.concat(partes).toString());
        if (
          o.empresa_id !== base.usuario.empresa_id ||
          o.usuario_id !== base.usuario.id
        ) {
          res.statusCode = 403;
          res.end(JSON.stringify({ erro: "Conta diferente" }));
          return;
        }
        if (recibos.has(o.operacao)) {
          res.end(JSON.stringify(recibos.get(o.operacao)));
          return;
        }
        const anterior = base.registros.find((r) => r.id === o.id);
        if ((anterior?.versao || 0) !== o.versao) {
          res.statusCode = 409;
          res.end(
            JSON.stringify({
              erro: "Este registro mudou em outro dispositivo. Revise as alterações antes de salvar.",
            }),
          );
          return;
        }
        const dados = { ...o.dados };
        if (o.tipo === "orcamento")
          dados.total_centavos = totalOrcamento(
            dados.itens,
            dados.desconto_centavos,
          );
        const r: Registro = {
          id: o.id,
          tipo: o.tipo,
          dados,
          versao: o.versao + 1,
        };
        base.registros = [r, ...base.registros.filter((a) => a.id !== r.id)];
        recibos.set(o.operacao, r);
        await writeFile(arquivo, JSON.stringify(base));
        res.end(JSON.stringify(r));
        return;
      }
      const proxy = http.request(
        {
          hostname: "127.0.0.1",
          port: 3001,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: "127.0.0.1:3001" },
        },
        (r) => {
          res.writeHead(r.statusCode || 500, r.headers);
          r.pipe(res);
        },
      );
      proxy.on("error", () => {
        res.statusCode = 503;
        res.end("Inicie Next na porta 3001");
      });
      req.pipe(proxy);
    })
    .listen(3002, "127.0.0.1", () =>
      console.log("QA fictício: http://127.0.0.1:3002/operacao"),
    );
}
void main();
