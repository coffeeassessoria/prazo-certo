import { FileWarning, type LucideIcon } from 'lucide-react'

/** Estado vazio: diz o que aparece aqui e qual o próximo passo. */
export function Vazio({ titulo, texto, children, icone: I = FileWarning }: { titulo: string; texto?: string; children?: React.ReactNode; icone?: LucideIcon }) {
  return (
    <div className="card vazio">
      <div className="vazio-icone"><I size={28} aria-hidden /></div>
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  )
}
