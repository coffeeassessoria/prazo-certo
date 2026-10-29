'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Info } from 'lucide-react'

/**
 * Botão que pede confirmação num modal do DS antes de enviar o formulário onde está.
 * Uso: <form action={acao}><Confirmar titulo="Excluir vencimento?" ...>Excluir</Confirmar></form>
 */
export function Confirmar({
  children, titulo, texto, destaque, confirmar, className = 'btn perigo', tom = 'perigo',
}: {
  children: React.ReactNode
  titulo: string
  texto?: string
  destaque?: string
  confirmar?: string
  className?: string
  tom?: 'perigo' | 'info'
}) {
  const [aberto, setAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const gatilho = useRef<HTMLButtonElement>(null)
  const cancelar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberto) return
    cancelar.current?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [aberto])

  function confirmarAcao() {
    setEnviando(true)
    gatilho.current?.closest('form')?.requestSubmit()
  }

  return (
    <>
      <button ref={gatilho} type="button" className={className} onClick={() => setAberto(true)}>{children}</button>
      {aberto && createPortal(
        <div className="modal-fundo" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" onClick={() => !enviando && setAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-icone ${tom === 'info' ? 'info' : ''}`}>{tom === 'info' ? <Info size={20} /> : <AlertTriangle size={20} />}</div>
            <h3 id="modal-titulo">{titulo}</h3>
            {(texto || destaque) && <p>{texto}{destaque && <><br /><strong>{destaque}</strong></>}</p>}
            <div className="modal-acoes">
              <button ref={cancelar} type="button" className="btn sec" onClick={() => setAberto(false)} disabled={enviando}>Cancelar</button>
              <button type="button" className={tom === 'info' ? 'btn' : 'btn perigo'} onClick={confirmarAcao} disabled={enviando} aria-busy={enviando}>
                {enviando ? <><span className="spinner" aria-hidden />Aguarde…</> : (confirmar ?? children)}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
