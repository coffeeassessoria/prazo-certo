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
  item: { status: string; vencimento: string; antecedencia_dias: number },
  hoje = hojeISO()
): Situacao {
  if (item.status === 'renovado') return 'renovado'
  if (item.status === 'concluido') return 'concluido'
  const dias = diasAte(item.vencimento, hoje)
  if (dias < 0) return 'vencido'
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
