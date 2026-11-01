export type Tipo = "orcamento" | "servico" | "demanda" | "financeiro";
export type Linha = {
  descricao: string;
  quantidade_mil: number;
  preco_centavos: number;
  tipo: "servico" | "material";
};
export type Dados = {
  titulo: string;
  cliente_id: string | null;
  responsavel_id?: string | null;
  data: string;
  estado: string;
  observacoes: string;
  itens?: Linha[];
  desconto_centavos?: number;
  total_centavos?: number;
  condicoes?: string;
  orcamento_id?: string | null;
  checklist?: { descricao: string; feito: boolean }[];
  resultado?: string;
  proxima_acao?: string;
  natureza?: "receita" | "despesa";
  valor_centavos?: number;
  baixas?: { id: string; valor_centavos: number; data: string }[];
};
export type Registro = {
  id: string;
  tipo: Tipo;
  dados: Dados;
  versao: number;
  updated_at?: string;
};
export type Operacao = {
  operacao: string;
  tipo: Tipo;
  id: string;
  versao: number;
  dados: Dados;
};
export type Pendente = Operacao & {
  tentado?: boolean;
  erro?: string;
  conflito?: boolean;
};
export type Base = {
  usuario: {
    id: string;
    nome: string;
    empresa_id: string;
    empresa: string;
    admin: boolean;
  };
  clientes: {
    id: string;
    nome: string;
    documento?: string;
    telefone?: string;
  }[];
  equipe: { id: string; nome: string }[];
  registros: Registro[];
  sincronizado: string;
};
export const NOMES: Record<Tipo, string> = {
  orcamento: "Orçamentos",
  servico: "Ordens de serviço",
  demanda: "Demandas",
  financeiro: "Financeiro",
};
export const ESTADOS: Record<Tipo, Record<string, string>> = {
  orcamento: {
    rascunho: "Rascunho",
    enviado: "Enviado",
    aprovado: "Aprovado",
    recusado: "Recusado",
    cancelado: "Cancelado",
  },
  servico: {
    agendada: "Agendada",
    em_andamento: "Em andamento",
    concluida: "Concluída",
    cancelada: "Cancelada",
  },
  demanda: {
    a_fazer: "A fazer",
    em_andamento: "Em andamento",
    aguardando_cliente: "Aguardando cliente",
    aguardando_fornecedor: "Aguardando fornecedor",
    concluida: "Concluída",
    cancelada: "Cancelada",
  },
  financeiro: { aberto: "Em aberto", cancelado: "Cancelado" },
};
export const hoje = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Cuiaba" }).format(
    new Date(),
  );
export const dinheiro = (centavos = 0) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    centavos / 100,
  );
export function decimalBR(valor: string, casas = 2): number {
  const texto = valor.trim().replace(/\s|R\$/g, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(texto))
    throw new Error("Use números no formato brasileiro, como 1.250,50.");
  const [inteiro, fracao = ""] = texto.replace(/\./g, "").split(",");
  if (fracao.length > casas)
    throw new Error(`Use até ${casas} casas decimais.`);
  const n = Number(inteiro) * 10 ** casas + Number(fracao.padEnd(casas, "0"));
  if (!Number.isSafeInteger(n) || n > 100_000_000)
    throw new Error("Valor acima do limite permitido.");
  return n;
}
export function totalOrcamento(itens: Linha[], desconto = 0) {
  if (!itens.length || itens.length > 50)
    throw new Error("Inclua de 1 a 50 serviços ou materiais.");
  let total = 0;
  for (const i of itens) {
    if (
      !i.descricao.trim() ||
      i.descricao.length > 240 ||
      !["servico", "material"].includes(i.tipo) ||
      !Number.isInteger(i.quantidade_mil) ||
      i.quantidade_mil < 1 ||
      i.quantidade_mil > 1_000_000 ||
      !Number.isInteger(i.preco_centavos) ||
      i.preco_centavos < 0 ||
      i.preco_centavos > 100_000_000
    )
      throw new Error("Revise descrição, quantidade e preço de cada item.");
    total += Math.floor((i.quantidade_mil * i.preco_centavos + 500) / 1000);
  }
  if (!Number.isInteger(desconto) || desconto < 0 || desconto > total)
    throw new Error("O desconto não pode superar o subtotal.");
  if (total > 10_000_000_000)
    throw new Error("Orçamento acima do limite permitido.");
  return total - desconto;
}
export function vazio(tipo: Tipo, usuario = ""): Dados {
  return {
    titulo: "",
    cliente_id: null,
    responsavel_id: usuario || null,
    data: hoje(),
    estado: Object.keys(ESTADOS[tipo])[0],
    observacoes: "",
    ...(tipo === "orcamento"
      ? {
          itens: [
            {
              descricao: "",
              quantidade_mil: 1000,
              preco_centavos: 0,
              tipo: "servico",
            },
          ],
          desconto_centavos: 0,
          condicoes: "",
        }
      : {}),
    ...(tipo === "servico"
      ? {
          checklist: [
            {
              descricao: "Inspecionar equipamento e registrar o serviço",
              feito: false,
            },
          ],
          resultado: "",
        }
      : {}),
    ...(tipo === "demanda" ? { proxima_acao: "" } : {}),
    ...(tipo === "financeiro"
      ? { natureza: "receita", valor_centavos: 0, baixas: [] }
      : {}),
  };
}
