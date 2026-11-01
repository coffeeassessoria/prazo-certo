import type { IdentidadeDocumento } from "@/lib/pmoc";
export const MAX_FOTOS = 20;
export const MAX_FOTO_BYTES = 600_000;
export const MAX_ORIGINAL_BYTES = 12_000_000;
export const MAX_LOCAL_BYTES = 60_000_000;
/** PostgREST pode representar uma linha composta como objeto ou lista unitária. */
export const linhaRpc = <T>(
  dados: T | T[] | null | undefined,
): T | undefined => (Array.isArray(dados) ? dados[0] : (dados ?? undefined));
export type Foto = {
  id: string;
  etapa: "antes" | "depois" | "evidencia";
  legenda: string;
  equipamento_id: string | null;
};
export type Relatorio = {
  unidade_id: string | null;
  equipamento_ids: string[];
  plano_id: string | null;
  tipo_manutencao: "preventiva" | "corretiva" | "inspecao";
  executada_em: string;
  inicio: string;
  fim: string;
  pecas: string;
  medicoes: string;
  recomendacoes: string;
  proxima_manutencao: string;
  criar_retorno: boolean;
  ciencia: {
    situacao: "presente" | "ausente" | "recusou";
    nome: string;
    cargo: string;
    confirmada: boolean;
  };
  fotos: Foto[];
  snapshot?: SnapshotRelatorio;
};
export type SnapshotRelatorio = {
  identidade: IdentidadeDocumento;
  cliente: { nome: string; documento?: string; endereco?: string };
  unidade: { nome: string; endereco: string };
  equipamentos: {
    id: string;
    tag: string;
    marca: string;
    modelo: string;
    serie: string;
    ambiente: string;
    capacidade_btu?: number;
  }[];
  tecnico: string;
  emitido_em: string;
  registrado_por: string;
  retorno_id?: string | null;
};
export type CatalogoCampo = {
  unidades: {
    id: string;
    cliente_id: string;
    nome: string;
    endereco: string;
  }[];
  equipamentos: {
    id: string;
    unidade_id: string;
    tag: string;
    marca: string;
    modelo: string;
    ambiente: string;
  }[];
  planos: {
    id: string;
    unidade_id: string;
    titulo: string;
    rotinas: { id: string; atividade: string; aplicacao: string }[];
  }[];
};
export const relatorioVazio = (data: string): Relatorio => ({
  unidade_id: null,
  equipamento_ids: [],
  plano_id: null,
  tipo_manutencao: "preventiva",
  executada_em: data,
  inicio: "",
  fim: "",
  pecas: "",
  medicoes: "",
  recomendacoes: "",
  proxima_manutencao: "",
  criar_retorno: false,
  ciencia: { situacao: "ausente", nome: "", cargo: "", confirmada: false },
  fotos: [],
});
