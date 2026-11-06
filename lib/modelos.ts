// Catálogo de itens comuns por segmento. Usado no quiz de boas-vindas
// e como "modelos rápidos" no cadastro de vencimento.
export type TipoCampo = 'texto' | 'data' | 'numero' | 'sim_nao'
/** Pergunta extra de um tipo de documento (ex.: "Número da apólice"). */
export type Campo = { rotulo: string; tipo: TipoCampo }
/** Resposta gravada no vencimento (itens.dados). Guarda o rótulo para continuar legível se o tipo mudar. */
export type Resposta = { rotulo: string; tipo: TipoCampo; valor: string }

export type Modelo = {
  titulo: string
  tipo: 'documento' | 'manutencao' | 'contrato' | 'outro'
  recorrencia_meses: number | null
  /** Dias antes do vencimento em que avisar (ex.: [7, 5, 3, 1]). Vazio = padrão da empresa. */
  avisos?: number[]
  /** Pede o colaborador vinculado (ex.: seguro de vida, ASO, NR-35). */
  colaborador?: boolean
  campos?: Campo[]
}

export const TIPOS_CAMPO: Record<TipoCampo, string> = {
  texto: 'Texto', data: 'Data', numero: 'Número', sim_nao: 'Sim ou não',
}

/** Perguntas sugeridas ao criar um tipo de documento novo. */
export const PERGUNTAS_SUGERIDAS: Campo[] = [
  { rotulo: 'Número do documento', tipo: 'texto' },
  { rotulo: 'Órgão ou empresa emissora', tipo: 'texto' },
  { rotulo: 'Data de emissão', tipo: 'data' },
  { rotulo: 'Responsável técnico', tipo: 'texto' },
  { rotulo: 'Número da apólice', tipo: 'texto' },
  { rotulo: 'Seguradora', tipo: 'texto' },
  { rotulo: 'Valor', tipo: 'numero' },
  { rotulo: 'Comprovante de pagamento enviado', tipo: 'sim_nao' },
  { rotulo: 'Local ou unidade', tipo: 'texto' },
]

/** Normaliza a lista de avisos: inteiros de 1 a 365, sem repetir, do maior para o menor (no máx. 8). */
export function normalizarAvisos(v: unknown): number[] {
  const lista = Array.isArray(v) ? v : String(v ?? '').split(',')
  return [...new Set(lista.map((x) => Math.floor(Number(x))).filter((n) => Number.isFinite(n) && n >= 1 && n <= 365))]
    .sort((a, b) => b - a).slice(0, 8)
}

/** Avisos atuais de um item (itens antigos sem lista: antecedência, 7 e 1 dia). */
export function avisosDoItem(item: { avisos_dias?: number[] | null; antecedencia_dias?: number }): number[] {
  if (item.avisos_dias?.length) return normalizarAvisos(item.avisos_dias)
  return normalizarAvisos([item.antecedencia_dias ?? 30, 7, 1])
}

export const SEGMENTOS: { valor: string; rotulo: string; descricao: string }[] = [
  { valor: 'climatizacao', rotulo: 'Climatização e refrigeração', descricao: 'Ar-condicionado, câmaras frias, chillers' },
  { valor: 'eletrica', rotulo: 'Instalações elétricas', descricao: 'Laudos, SPDA, manutenção elétrica' },
  { valor: 'seguranca', rotulo: 'Segurança e incêndio', descricao: 'AVCB, extintores, segurança do trabalho' },
  { valor: 'outro', rotulo: 'Outro tipo de serviço', descricao: 'Contratos, alvarás e manutenções em geral' },
]

export const CATALOGO: Record<string, Modelo[]> = {
  climatizacao: [
    { titulo: 'PMOC', tipo: 'documento', recorrencia_meses: 12 },
    { titulo: 'ART do PMOC', tipo: 'documento', recorrencia_meses: 12 },
    { titulo: 'Laudo de qualidade do ar', tipo: 'documento', recorrencia_meses: 6 },
    { titulo: 'Manutenção preventiva', tipo: 'manutencao', recorrencia_meses: 1 },
    { titulo: 'Limpeza de filtros', tipo: 'manutencao', recorrencia_meses: 1 },
    { titulo: 'Higienização de dutos', tipo: 'manutencao', recorrencia_meses: 12 },
    { titulo: 'Contrato de manutenção', tipo: 'contrato', recorrencia_meses: 12 },
  ],
  eletrica: [
    { titulo: 'Laudo de SPDA (para-raios)', tipo: 'documento', recorrencia_meses: 12 },
    { titulo: 'Laudo das instalações elétricas', tipo: 'documento', recorrencia_meses: 12 },
    { titulo: 'Termografia', tipo: 'manutencao', recorrencia_meses: 12 },
    { titulo: 'Manutenção preventiva', tipo: 'manutencao', recorrencia_meses: 6 },
    { titulo: 'Contrato de manutenção', tipo: 'contrato', recorrencia_meses: 12 },
  ],
  seguranca: [
    { titulo: 'AVCB', tipo: 'documento', recorrencia_meses: 36 },
    { titulo: 'Recarga de extintores', tipo: 'manutencao', recorrencia_meses: 12 },
    { titulo: 'Teste hidrostático', tipo: 'manutencao', recorrencia_meses: 60 },
    { titulo: 'Treinamento de brigada', tipo: 'documento', recorrencia_meses: 12 },
    { titulo: 'Contrato de manutenção', tipo: 'contrato', recorrencia_meses: 12 },
  ],
  outro: [
    { titulo: 'Contrato de prestação de serviço', tipo: 'contrato', recorrencia_meses: 12 },
    { titulo: 'Alvará de funcionamento', tipo: 'documento', recorrencia_meses: 12 },
    { titulo: 'Licença ambiental', tipo: 'documento', recorrencia_meses: 12 },
    { titulo: 'Manutenção preventiva', tipo: 'manutencao', recorrencia_meses: 6 },
  ],
}

export function modelosPadrao(segmento: string): Modelo[] {
  return CATALOGO[segmento] ?? CATALOGO.outro
}
