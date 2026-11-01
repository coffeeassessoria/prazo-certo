import ExcelJS from "exceljs";
import { inflateRawSync } from "node:zlib";
/** Limites conferidos antes do parser: não extrai arquivos para o disco. */
export function conferirZip(b: Buffer) {
  let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--)
    if (b.readUInt32LE(i) === 0x06054b50) {
      e = i;
      break;
    }
  if (e < 0 || b.readUInt16LE(e + 4) || b.readUInt16LE(e + 6))
    throw new Error("Arquivo XLSX inválido.");
  const n = b.readUInt16LE(e + 10),
    tamanho = b.readUInt32LE(e + 12),
    inicio = b.readUInt32LE(e + 16);
  if (n > 200 || n === 65535 || inicio + tamanho > e)
    throw new Error(
      "Planilha muito complexa. Exporte apenas os clientes para CSV.",
    );
  let p = inicio,
    total = 0;
  for (let i = 0; i < n; i++) {
    if (p + 46 > b.length || b.readUInt32LE(p) !== 0x02014b50)
      throw new Error("Estrutura XLSX inválida.");
    const flags = b.readUInt16LE(p + 8),
      metodo = b.readUInt16LE(p + 10),
      comprimido = b.readUInt32LE(p + 20),
      expandido = b.readUInt32LE(p + 24),
      local = b.readUInt32LE(p + 42);
    total += expandido;
    if (
      flags & 1 ||
      ![0, 8].includes(metodo) ||
      expandido > 10_000_000 ||
      total > 20_000_000 ||
      local + 30 > b.length ||
      b.readUInt32LE(local) !== 0x04034b50
    )
      throw new Error(
        "XLSX excede os limites. Exporte uma planilha simples como CSV.",
      );
    const inicioDados =
      local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    if (inicioDados + comprimido > inicio)
      throw new Error("Estrutura XLSX inválida.");
    const bruto = b.subarray(inicioDados, inicioDados + comprimido);
    const dados =
      metodo === 8
        ? inflateRawSync(bruto, { maxOutputLength: 10_000_001 })
        : bruto;
    if (dados.length !== expandido)
      throw new Error("Tamanho interno inválido na planilha.");
    p +=
      46 +
      b.readUInt16LE(p + 28) +
      b.readUInt16LE(p + 30) +
      b.readUInt16LE(p + 32);
  }
  if (p !== inicio + tamanho) throw new Error("Estrutura XLSX inválida.");
}
export async function lerXlsx(buffer: Buffer) {
  conferirZip(buffer);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const folha = wb.worksheets.find((w) => w.state === "visible");
  if (!folha) throw new Error("Inclua uma aba visível com os clientes.");
  if (folha.rowCount > 501 || folha.columnCount > 30)
    throw new Error(
      "Use até 500 clientes e 30 colunas, sem linhas extras formatadas.",
    );
  const matriz: string[][] = [];
  folha.eachRow({ includeEmpty: true }, (r) => {
    const valores: string[] = [];
    for (let i = 1; i <= folha.columnCount; i++) {
      const c = r.getCell(i);
      if (c.isMerged || c.type === ExcelJS.ValueType.Formula)
        throw new Error(
          `Remova fórmulas e células mescladas na linha ${r.number}.`,
        );
      valores.push(c.text);
    }
    matriz.push(valores);
  });
  return matriz;
}
