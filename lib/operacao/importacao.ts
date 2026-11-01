export type ClienteImportado = {
  nome: string;
  documento: string;
  contato: string;
  telefone: string;
  email: string;
  endereco: string;
  observacoes: string;
};
export type LinhaImportada = {
  linha: number;
  cliente: ClienteImportado;
  erros: string[];
  duplicado: boolean;
};
export const CAMPOS = [
  "nome",
  "documento",
  "contato",
  "telefone",
  "email",
  "endereco",
  "observacoes",
] as const;
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
export const chaveCliente = (
  c: Pick<ClienteImportado, "nome" | "documento">,
) =>
  c.documento.replace(/\W/g, "")
    ? `doc:${normalizar(c.documento).replace(/[^a-z0-9]/g, "")}`
    : `nome:${normalizar(c.nome)}`;
export function validarCliente(obj: unknown): ClienteImportado {
  if (!obj || typeof obj !== "object") throw new Error("Linha inválida.");
  const c = Object.fromEntries(
    CAMPOS.map((k) => [
      k,
      String((obj as Record<string, unknown>)[k] ?? "").trim(),
    ]),
  ) as ClienteImportado;
  if (!c.nome || c.nome.length > 180)
    throw new Error("Informe um nome com até 180 caracteres.");
  if (
    c.documento.length > 30 ||
    c.telefone.length > 40 ||
    c.contato.length > 180 ||
    c.email.length > 254 ||
    c.endereco.length > 500 ||
    c.observacoes.length > 2000
  )
    throw new Error("Um dos campos excede o tamanho permitido.");
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))
    throw new Error("Revise o e-mail.");
  if (CAMPOS.some((k) => /^[=+@]/.test(c[k])))
    throw new Error("Substitua fórmulas por texto antes de importar.");
  return c;
}
export function lerCSV(texto: string): string[][] {
  texto = texto.replace(/^\uFEFF/, "");
  const primeira = texto.split(/\r?\n/)[0] || "";
  const separador =
    primeira.split(";").length > primeira.split(",").length ? ";" : ",";
  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = "";
  let aspas = false;
  let fechou = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          celula += '"';
          i++;
        } else {
          aspas = false;
          fechou = true;
        }
      } else celula += c;
    } else if (c === '"') {
      if (celula || fechou)
        throw new Error(
          "Aspas inválidas na planilha. Exporte novamente como CSV.",
        );
      aspas = true;
    } else if (c === separador || c === "\n" || c === "\r") {
      linha.push(celula);
      celula = "";
      fechou = false;
      if (c !== separador) {
        if (c === "\r" && texto[i + 1] === "\n") i++;
        linhas.push(linha);
        linha = [];
      }
    } else {
      if (fechou && c.trim())
        throw new Error("Há texto após o fechamento de aspas.");
      if (!fechou) celula += c;
    }
    if (linhas.length > 502)
      throw new Error("Importe até 500 clientes por arquivo.");
  }
  if (aspas) throw new Error("Há uma célula com aspas sem fechamento.");
  if (celula || linha.length) {
    linha.push(celula);
    linhas.push(linha);
  }
  return linhas;
}
const ALIASES: Record<string, string> = {
  nome: "nome",
  cliente: "nome",
  "nome da empresa": "nome",
  "razao social": "nome",
  empresa: "nome",
  documento: "documento",
  cnpj: "documento",
  cpf: "documento",
  "cnpj/cpf": "documento",
  contato: "contato",
  "pessoa de contato": "contato",
  telefone: "telefone",
  celular: "telefone",
  whatsapp: "telefone",
  email: "email",
  "e-mail": "email",
  endereco: "endereco",
  observacoes: "observacoes",
};
export function prepararLinhas(matriz: string[][]): LinhaImportada[] {
  const cabecalho = matriz[0]?.map((s) => ALIASES[normalizar(s)]) || [];
  if (!cabecalho.includes("nome"))
    throw new Error(
      "A primeira linha precisa conter a coluna Nome. Baixe o modelo.",
    );
  if (
    cabecalho.filter(Boolean).length !== new Set(cabecalho.filter(Boolean)).size
  )
    throw new Error(
      "Há colunas repetidas. Use apenas uma coluna para cada campo.",
    );
  const vistas = new Set<string>();
  const saida: LinhaImportada[] = [];
  matriz.slice(1).forEach((valores, i) => {
    if (valores.every((v) => !v.trim())) return;
    const cliente = Object.fromEntries(
      CAMPOS.map((k) => [
        k,
        String(valores[cabecalho.indexOf(k)] ?? "").trim(),
      ]),
    ) as ClienteImportado;
    const erros: string[] = [];
    try {
      validarCliente(cliente);
    } catch (e) {
      erros.push((e as Error).message);
    }
    if (
      valores.length > cabecalho.length &&
      valores.slice(cabecalho.length).some(Boolean)
    )
      erros.push("Há dados além das colunas do cabeçalho.");
    const chave = chaveCliente(cliente);
    const duplicado = vistas.has(chave);
    vistas.add(chave);
    saida.push({ linha: i + 2, cliente, erros, duplicado });
  });
  if (!saida.length || saida.length > 500)
    throw new Error("Envie de 1 a 500 clientes por arquivo.");
  return saida;
}
