export const TZ = process.env.APP_TZ || 'America/Cuiaba'

/** Data de hoje (AAAA-MM-DD) no fuso da operação. */
export function hojeISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function utc(iso: string): number {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

export function isoDeUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Dias corridos de hoje até a data (negativo = já venceu). */
export function diasAte(iso: string, hoje = hojeISO()): number {
  return Math.round((utc(iso) - utc(hoje)) / 86_400_000)
}

export function somarDias(iso: string, dias: number): string {
  return isoDeUtc(utc(iso) + dias * 86_400_000)
}

/** Soma meses mantendo o dia; se o mês não tiver o dia (ex.: 31), usa o último dia. */
export function somarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1))
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
  alvo.setUTCDate(Math.min(d, ultimo))
  return isoDeUtc(alvo.getTime())
}

export function fmtData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export type Situacao = 'vencido' | 'atencao' | 'ok' | 'renovado' | 'concluido'

export function situacao(
  item: { status: string; vencimento: string; antecedencia_dias: number; tipo?: string },
  hoje = hojeISO()
): Situacao {
  if (item.status === 'renovado') return 'renovado'
  if (item.status === 'concluido') return 'concluido'
  const dias = diasAte(item.vencimento, hoje)
  if (dias < 0) return 'vencido'
  if (item.tipo === ACOMPANHAMENTO) return dias === 0 ? 'atencao' : 'ok'
  if (dias <= Math.max(item.antecedencia_dias, 7)) return 'atencao'
  return 'ok'
}

export function textoPrazo(iso: string, hoje = hojeISO()): string {
  const d = diasAte(iso, hoje)
  if (d === 0) return 'vence hoje'
  if (d === 1) return 'vence amanhã'
  if (d > 1) return `em ${d} dias`
  if (d === -1) return 'venceu ontem'
  return `venceu há ${-d} dias`
}

export const TIPOS: Record<string, string> = {
  documento: 'Documento',
  manutencao: 'Manutenção',
  contrato: 'Contrato',
  outro: 'Outro',
}

/** Lembretes curtos de retorno ("cobrar se comprou a peça", "ver se o ar foi arrumado"). */
export const ACOMPANHAMENTO = 'acompanhamento'

/** Rótulo de qualquer tipo, incluindo acompanhamento (TIPOS só tem as categorias de vencimento). */
export const ROTULO_TIPO: Record<string, string> = { ...TIPOS, acompanhamento: 'Acompanhamento' }

/** Atalhos de "Lembrar em" dos acompanhamentos (dias a partir de hoje). */
export const LEMBRAR_EM = [
  { dias: 1, rotulo: 'Amanhã' },
  { dias: 3, rotulo: 'Em 3 dias' },
  { dias: 7, rotulo: 'Em 7 dias' },
  { dias: 15, rotulo: 'Em 15 dias' },
]

/** "retorno hoje", "amanhã", "em 3 dias", "atrasado há 2 dias" */
export function textoRetorno(iso: string, hoje = hojeISO()): string {
  const d = diasAte(iso, hoje)
  if (d === 0) return 'retorno hoje'
  if (d === 1) return 'amanhã'
  if (d > 1) return `em ${d} dias`
  if (d === -1) return 'atrasado desde ontem'
  return `atrasado há ${-d} dias`
}

const DIAS_SEMANA = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.']
/** "sex., 02/11" */
export function fmtDiaSemana(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${DIAS_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

export const RECORRENCIAS: { valor: string; rotulo: string }[] = [
  { valor: '', rotulo: 'Não repete' },
  { valor: '1', rotulo: 'Mensal' },
  { valor: '2', rotulo: 'Bimestral' },
  { valor: '3', rotulo: 'Trimestral' },
  { valor: '4', rotulo: 'Quadrimestral' },
  { valor: '6', rotulo: 'Semestral' },
  { valor: '12', rotulo: 'Anual' },
  { valor: '24', rotulo: 'A cada 2 anos' },
]

export function rotuloRecorrencia(meses: number | null): string {
  if (!meses) return 'Não repete'
  return RECORRENCIAS.find((r) => r.valor === String(meses))?.rotulo ?? `A cada ${meses} meses`
}

const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "29 de outubro de 2026" */
export function fmtDataExtenso(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} de ${MESES_LONGOS[m - 1]} de ${a}`
}

/** Instante exibido no fuso da operação, sem trocar a data na virada UTC. */
export function fmtInstante(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}
