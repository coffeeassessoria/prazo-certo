'use client'

import { useFormStatus } from 'react-dom'

/** Botão de envio de formulário com estado "carregando" (spinner + aria-busy). */
export function BotaoEnviar({ children, className = 'btn', carregando = 'Salvando…', disabled }: {
  children: React.ReactNode; className?: string; carregando?: string; disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending}>
      {pending ? <><span className="spinner" aria-hidden />{carregando}</> : children}
    </button>
  )
}
