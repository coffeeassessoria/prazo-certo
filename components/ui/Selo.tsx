import type { Situacao } from '@/lib/datas'

type Tom = Situacao | 'info' | 'neutro'
const CLASSE: Record<string, string> = { vencido: 'vencido', atencao: 'atencao', ok: 'ok', info: 'info' }

/** Selo (pill) de status. Sempre com texto; o ponto colorido reforça, nunca substitui. */
export function Selo({ tom = 'neutro', children, peq = false, ponto = true }: { tom?: Tom; children: React.ReactNode; peq?: boolean; ponto?: boolean }) {
  const c = CLASSE[tom] ?? ''
  return (
    <span className={`selo ${c} ${peq ? 'peq' : ''}`}>
      {ponto && c && c !== 'info' && <span className="ponto" aria-hidden />}
      {children}
    </span>
  )
}
