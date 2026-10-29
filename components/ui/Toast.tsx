'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Info, X } from 'lucide-react'

/**
 * Toast de confirmação. Mostra a mensagem e some em 5s.
 * Padrão de uso: a ação redireciona com ?toast=Título&toastd=Descrição e a página renderiza <ToastDaUrl />.
 */
export function Toast({ titulo, descricao, tipo = 'ok', aoFechar }: { titulo: string; descricao?: string; tipo?: 'ok' | 'info'; aoFechar?: () => void }) {
  const [visivel, setVisivel] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => { setVisivel(false); aoFechar?.() }, 5000)
    return () => clearTimeout(t)
  }, [aoFechar])
  if (!visivel) return null
  return (
    <div className="toast" role="status" aria-live="polite">
      <div className={`toast-icone ${tipo === 'info' ? 'info' : ''}`}>{tipo === 'info' ? <Info size={18} /> : <CheckCircle2 size={18} />}</div>
      <div className="toast-corpo">
        <b>{titulo}</b>
        {descricao && <span>{descricao}</span>}
      </div>
      <button type="button" className="btn ghost icone peq" aria-label="Fechar aviso" onClick={() => { setVisivel(false); aoFechar?.() }}><X size={14} /></button>
    </div>
  )
}

export function ToastDaUrl() {
  const sp = useSearchParams()
  const router = useRouter()
  const path = usePathname()
  const titulo = sp.get('toast')
  if (!titulo) return null
  const limpar = () => {
    const p = new URLSearchParams(sp.toString())
    p.delete('toast'); p.delete('toastd'); p.delete('toastt')
    router.replace(p.size ? `${path}?${p}` : path, { scroll: false })
  }
  return <Toast key={titulo} titulo={titulo} descricao={sp.get('toastd') ?? undefined} tipo={sp.get('toastt') === 'info' ? 'info' : 'ok'} aoFechar={limpar} />
}

