import { acesso, corpo, erroApi, Falha, json } from "@/lib/operacao/api";
import {
  lerCSV,
  prepararLinhas,
  validarCliente,
} from "@/lib/operacao/importacao";
import { lerXlsx } from "@/lib/operacao/xlsx";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { db } = await acesso(request);
    const dados = await corpo(request, 3_000_000);
    if (dados.acao === "prever") {
      if (typeof dados.arquivo !== "string" || typeof dados.nome !== "string")
        throw new Falha("Escolha o arquivo.");
      const b = Buffer.from(dados.arquivo, "base64");
      if (b.length > 2_000_000) throw new Falha("Use um arquivo de até 2 MB.");
      let matriz: string[][];
      try {
        matriz = /\.csv$/i.test(dados.nome)
          ? lerCSV(new TextDecoder("utf-8", { fatal: true }).decode(b))
          : /\.xlsx$/i.test(dados.nome)
            ? await lerXlsx(b)
            : (() => {
                throw new Error("Use um arquivo CSV UTF-8 ou XLSX.");
              })();
      } catch (e) {
        throw new Falha((e as Error).message);
      }
      try {
        return json({ linhas: prepararLinhas(matriz) });
      } catch (e) {
        throw new Falha((e as Error).message);
      }
    }
    if (
      dados.acao !== "confirmar" ||
      !Array.isArray(dados.clientes) ||
      dados.clientes.length > 500
    )
      throw new Falha("Confira a prévia antes de importar.");
    let clientes;
    try {
      clientes = dados.clientes.map(validarCliente);
    } catch (e) {
      throw new Falha((e as Error).message);
    }
    const { data, error } = await db.rpc("importar_clientes", {
      p_operacao: dados.operacao,
      p_clientes: clientes,
    });
    if (error) throw new Falha(error.message);
    return json(data);
  } catch (e) {
    return erroApi(e);
  }
}
