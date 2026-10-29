'use client'

import { useFormStatus } from 'react-dom'

export function BotaoConfirmar({
  children, mensagem, className = 'btn',
}: { children: React.ReactNode; mensagem?: string; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (mensagem && !confirm(mensagem)) e.preventDefault()
      }}
    >
      {pending ? 'Aguarde…' : children}
    </button>
  )
}
