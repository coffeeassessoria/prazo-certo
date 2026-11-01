/** Somente QA local, dados fictícios. Next :3001, proxy :3003. Nunca é usado pela aplicação. */
import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { baseDemo } from "../../lib/operacao/demo";
import { otimizarFoto } from "../../lib/relatorios/imagens";
async function main() {
  const arquivo = "/private/tmp/pc-qa-relatorios.json";
  let estado: {
    base: ReturnType<typeof baseDemo>;
    recibos: Record<string, unknown>;
    fotos: Record<string, string>;
    uploads: number;
  };
  try {
    estado = JSON.parse(await readFile(arquivo, "utf8"));
  } catch {
    const base = baseDemo();
    base.usuario.empresa_id = "90000000-0000-4000-8000-000000000001";
    base.usuario.id = "90000000-0000-4000-8000-000000000002";
    base.equipe = [{ id: base.usuario.id, nome: base.usuario.nome }];
    for (const r of base.registros) r.dados.responsavel_id = base.usuario.id;
    base.usuario.empresa = "Empresa fictícia · QA de fotos";
    estado = { base, recibos: {}, fotos: {}, uploads: 0 };
  }
  const gravar = () => writeFile(arquivo, JSON.stringify(estado));
  http
    .createServer(async (req, res) => {
      const q = new URL(req.url || "/", "http://127.0.0.1:3003");
      if (q.pathname === "/api/operacao/fotos") {
        if (req.method === "POST") {
          const partes: Buffer[] = [];
          for await (const p of req) partes.push(p);
          const imagem = await otimizarFoto(Buffer.concat(partes)),
            id = q.searchParams.get("id")!;
          estado.fotos[id] = imagem.foto.toString("base64");
          estado.uploads++;
          await gravar();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ id }));
          return;
        }
        const imagem = estado.fotos[q.searchParams.get("id")!];
        if (!imagem) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader("Content-Type", "image/jpeg");
        res.end(Buffer.from(imagem, "base64"));
        return;
      }
      if (q.pathname === "/api/operacao") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        if (req.method === "GET") {
          estado.base.sincronizado = new Date().toISOString();
          res.end(JSON.stringify(estado.base));
          return;
        }
        const partes: Buffer[] = [];
        for await (const p of req) partes.push(p);
        const o = JSON.parse(Buffer.concat(partes).toString());
        if (
          o.usuario_id !== estado.base.usuario.id ||
          o.empresa_id !== estado.base.usuario.empresa_id
        ) {
          res.statusCode = 403;
          res.end(JSON.stringify({ erro: "Conta diferente" }));
          return;
        }
        if (estado.recibos[o.operacao]) {
          res.end(JSON.stringify(estado.recibos[o.operacao]));
          return;
        }
        if (
          o.dados.relatorio?.fotos.some(
            (f: { id: string }) => !estado.fotos[f.id],
          )
        ) {
          res.statusCode = 400;
          res.end(JSON.stringify({ erro: "Fotos ainda não sincronizadas" }));
          return;
        }
        const r = {
          id: o.id,
          tipo: o.tipo,
          versao: o.versao + 1,
          dados: o.dados,
        };
        estado.base.registros = [
          r,
          ...estado.base.registros.filter((a) => a.id !== o.id),
        ];
        estado.recibos[o.operacao] = r;
        await gravar();
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
        res.end("Next indisponível");
      });
      req.pipe(proxy);
    })
    .listen(3003, "127.0.0.1", () =>
      process.stdout.write("QA fictício: http://127.0.0.1:3003/operacao\n"),
    );
}
void main();
