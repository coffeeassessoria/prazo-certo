export const FONTE_PMOC =
  'https://bvsms.saude.gov.br/bvs/saudelegis/gm/1998/prt3523_28_08_1998.html'
export const ANEXO_PMOC =
  'https://bvsms.saude.gov.br/bvs/saudelegis/gm/1998/anexo/anexo_prt3523_28_08_1998.pdf'
export type RotinaPmoc = {
  id: string
  aplicacao: string
  atividade: string
  periodicidade: string
}
export type DadosPlano = {
  titulo: string
  inicio: string
  revisao_em: string
  tecnico_nome: string
  tecnico_documento: string
  tecnico_conselho: string
  tecnico_registro: string
  tecnico_endereco: string
  tecnico_contato: string
  responsabilidade: string
  recomendacoes: string
  projeto_referencia: string
  projeto_path?: string | null
  observacoes: string
  rotinas: RotinaPmoc[]
}
export type IdentidadeDocumento = {
  nome: string
  documento: string
  endereco: string
  telefone: string
  email: string
  logo_path?: string | null
}
export type SnapshotPmoc = {
  plano: DadosPlano
  identidade: IdentidadeDocumento
  cliente: {
    nome: string
    documento?: string
    endereco?: string
    contato?: string
    telefone?: string
    email?: string
  }
  unidade: {
    nome: string
    endereco: string
    representante_nome: string
    representante_documento: string
    representante_papel: string
    representante_endereco: string
    representante_contato: string
  }
  ambientes: {
    id: string
    nome: string
    atividade: string
    area_m2: number | null
    ocupantes_fixos: number | null
    ocupantes_flutuantes: number | null
  }[]
  equipamentos: {
    id: string
    ambiente_id: string
    tag: string
    tipo: string
    marca: string
    modelo: string
    serie: string
    capacidade_btu: number | null
    observacoes?: string
  }[]
  execucoes: {
    data_execucao: string
    atividade: string
    equipamento_tag: string | null
    executado_por: string
    aprovado_por: string | null
    relato: string
  }[]
  versao: number
  estado: 'rascunho' | 'para_assinatura'
  emitido_em: string
  emitido_por: string
  pendencias: string[]
}
export const TIPOS_EQUIPAMENTO = {
  split: 'Split',
  janela: 'Janela',
  cassete: 'Cassete',
  piso_teto: 'Piso-teto',
  central: 'Sistema central',
  outro: 'Outro',
}
export const ROTINAS_INICIAIS: RotinaPmoc[] = [
  [
    'gabinete',
    'Gabinetes e painéis',
    'Inspecionar limpeza, conservação e vedação',
  ],
  [
    'filtros',
    'Filtros de ar',
    'Verificar o estado dos filtros e definir limpeza ou troca',
  ],
  [
    'serpentinas',
    'Serpentinas e bandejas',
    'Verificar sujidades e programar a higienização adequada',
  ],
  [
    'drenagem',
    'Sistema de drenagem',
    'Conferir o escoamento e a condição das bandejas',
  ],
  [
    'ventilacao',
    'Ventilação e renovação do ar',
    'Conferir as condições de ventilação e captação de ar externo',
  ],
  [
    'ambientes',
    'Ambientes climatizados',
    'Inspecionar limpeza e possíveis fontes de contaminação',
  ],
].map(([id, aplicacao, atividade]) => ({
  id,
  aplicacao,
  atividade,
  periodicidade: '',
}))
export const PLANO_VAZIO: DadosPlano = {
  titulo: 'Plano de Manutenção, Operação e Controle',
  inicio: '',
  revisao_em: '',
  tecnico_nome: '',
  tecnico_documento: '',
  tecnico_conselho: '',
  tecnico_registro: '',
  tecnico_endereco: '',
  tecnico_contato: '',
  responsabilidade: '',
  recomendacoes: '',
  projeto_referencia: '',
  observacoes: '',
  rotinas: ROTINAS_INICIAIS,
}
