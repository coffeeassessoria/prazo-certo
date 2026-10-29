// Catálogo de itens comuns por segmento. Usado no quiz de boas-vindas
// e como "modelos rápidos" no cadastro de vencimento.
export type Modelo = { titulo: string; tipo: 'documento' | 'manutencao' | 'contrato' | 'outro'; recorrencia_meses: number | null }

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
