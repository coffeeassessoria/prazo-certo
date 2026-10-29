import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

type Tipo = 'info' | 'ok' | 'erro' | 'atencao'
const ICONE = { info: Info, ok: CheckCircle2, erro: AlertCircle, atencao: AlertTriangle }

/** Aviso (alert). Título curto + explicação do que fazer. */
export function Aviso({ tipo = 'info', titulo, children }: { tipo?: Tipo; titulo?: string; children?: React.ReactNode }) {
  const I = ICONE[tipo]
  return (
    <div className={`aviso ${tipo === 'info' ? '' : tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      <I size={18} aria-hidden />
      <div>
        {titulo && <b>{titulo}</b>}
        {children}
      </div>
    </div>
  )
}
