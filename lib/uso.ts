/** Nome da área do sistema a partir do caminho (para o painel de uso do Admin). */
export function secaoDe(caminho: string, filtro?: string | null): string {
  const p = caminho.replace(/\/+$/, '') || '/'
  if (p === '/') return filtro === 'historico' ? 'Histórico' : 'Painel'
  const regras: [RegExp, string][] = [
    [/^\/itens\/novo/, 'Novo vencimento'],
    [/^\/itens\//, 'Detalhe do vencimento'],
    [/^\/acompanhamentos\/novo/, 'Nova demanda'],
    [/^\/acompanhamentos/, 'Demandas e retornos'],
    [/^\/novo/, 'Botão Novo'],
    [/^\/clientes\/importar/, 'Importar clientes'],
    [/^\/clientes/, 'Clientes'],
    [/^\/config\/documentos/, 'Logo e timbrado'],
    [/^\/config/, 'Ajustes'],
    [/^\/pmoc\/novo/, 'Novo PMOC'],
    [/^\/pmoc/, 'Planos PMOC'],
    [/^\/unidades/, 'Unidades e equipamentos'],
    [/^\/operacao/, 'Orçamentos e serviços'],
    [/^\/admin/, 'Admin'],
    [/^\/bem-vindo/, 'Boas-vindas'],
  ]
  return regras.find(([r]) => r.test(p))?.[1] ?? p.split('/')[1]
}

/** Caminho sem ids (uuid e números), para agrupar. */
export const caminhoGenerico = (p: string) =>
  p.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id').replace(/\/\d+(?=\/|$)/g, '/:n').slice(0, 200)

export const TIPOS_FEEDBACK = [
  { valor: 'sugestao', rotulo: 'Sugestão', dica: 'Uma ideia para melhorar' },
  { valor: 'problema', rotulo: 'Problema', dica: 'Algo não funcionou' },
  { valor: 'reclamacao', rotulo: 'Reclamação', dica: 'Algo que incomodou' },
  { valor: 'elogio', rotulo: 'Elogio', dica: 'Algo que você gostou' },
] as const
export const ROTULO_FEEDBACK: Record<string, string> = Object.fromEntries(TIPOS_FEEDBACK.map((t) => [t.valor, t.rotulo]))
