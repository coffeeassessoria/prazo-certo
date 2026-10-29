import { Check } from 'lucide-react'

/** Logo do DS 2.0: etiqueta azul com furo e visto verde. Nunca rotacionar, nunca recolorir. */
export function LogoMarca({ grande = false }: { grande?: boolean }) {
  return (
    <span className={`logo-mark ${grande ? 'grande' : ''}`} aria-hidden>
      <span><Check size={grande ? 18 : 12} strokeWidth={3} /></span>
    </span>
  )
}

export function Logo({ sub }: { sub?: string | null }) {
  const nome = process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'
  return (
    <span className="marca">
      <LogoMarca />
      <span className="marca-texto">
        <span className="marca-nome">{nome}</span>
        {sub && <span className="marca-sub">{sub}</span>}
      </span>
    </span>
  )
}
