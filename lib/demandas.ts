export const ETAPAS = {
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  aguardando_cliente: 'Aguardando cliente',
  aguardando_fornecedor: 'Aguardando fornecedor',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
} as const

export const CATEGORIAS = {
  orcamento: 'Orçamento',
  agendamento: 'Agendamento de visita',
  peca: 'Peças e materiais',
  documento: 'PMOC e documentos',
  pos_venda: 'Pós-atendimento',
  outro: 'Outra demanda',
} as const

export type Etapa = keyof typeof ETAPAS
export type Categoria = keyof typeof CATEGORIAS
export type Responsavel = { user_id: string; nome: string | null; email?: string | null }
export type Vinculo = { id: string; titulo: string; vencimento: string; cliente_id: string | null }
export type ResultadoDemanda = { erro: string } | null
export type AcaoDemanda = (anterior: ResultadoDemanda, dados: FormData) => Promise<ResultadoDemanda>

export function encerrada(etapa: string) {
  return etapa === 'concluida' || etapa === 'cancelada'
}

export function dataReal(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && Number.isFinite(Date.parse(`${iso}T12:00:00Z`))
    && new Date(`${iso}T12:00:00Z`).toISOString().slice(0, 10) === iso
}

export const MODELOS_CLIMATIZACAO = [
  { categoria: 'orcamento', titulo: 'Acompanhar aprovação do orçamento', acao: 'Entrar em contato para confirmar a aprovação' },
  { categoria: 'agendamento', titulo: 'Agendar manutenção preventiva', acao: 'Confirmar a data e a liberação de acesso' },
  { categoria: 'peca', titulo: 'Confirmar chegada da peça', acao: 'Consultar o fornecedor sobre a previsão de entrega' },
  { categoria: 'documento', titulo: 'Enviar documentação do PMOC', acao: 'Conferir os documentos e enviar ao cliente' },
  { categoria: 'pos_venda', titulo: 'Conferir o funcionamento após o serviço', acao: 'Perguntar ao cliente se o ar está funcionando bem' },
] as const
