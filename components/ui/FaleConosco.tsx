'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { AlertCircle, CheckCircle2, MessageSquareText, X } from 'lucide-react'
import { enviarFeedback, type RespostaFeedback } from '@/app/actions/feedback'
import { TIPOS_FEEDBACK } from '@/lib/uso'

export const ABRIR_FALE_CONOSCO = 'pc-fale-conosco'

/**
 * Botão flutuante "Fale com a gente" + painel para enviar sugestão, problema, reclamação ou elogio.
 * Também abre por evento (menu): window.dispatchEvent(new Event(ABRIR_FALE_CONOSCO)).
 */
export function FaleConosco({ flutuante = true }: { flutuante?: boolean }) {
  const [aberto, setAberto] = useState(false)
  const [tipo, setTipo] = useState<string>('sugestao')
  const [res, acao, enviando] = useActionState<RespostaFeedback, FormData>(enviarFeedback, null)
  const [chave, setChave] = useState(0)
  const pagina = usePathname()
  const tituloId = useId()
  const painel = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const abrir = () => setAberto(true)
    window.addEventListener(ABRIR_FALE_CONOSCO, abrir)
    return () => window.removeEventListener(ABRIR_FALE_CONOSCO, abrir)
  }, [])
  useEffect(() => {
    if (!aberto) return
    painel.current?.querySelector<HTMLElement>('textarea, button')?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [aberto])

  function fechar() {
    setAberto(false)
    if (res?.ok) { setChave((k) => k + 1); setTipo('sugestao') }
    botao.current?.focus()
  }
  const enviado = res?.ok

  return (
    <>
      {flutuante && (
        <button ref={botao} type="button" className="fale-fab" onClick={() => setAberto(true)} aria-haspopup="dialog">
          <MessageSquareText size={18} aria-hidden /><span>Fale com a gente</span>
        </button>
      )}
      {aberto && createPortal(
        <div className="modal-fundo" onClick={fechar}>
          <div ref={painel} className="modal fale-modal" role="dialog" aria-modal="true" aria-labelledby={tituloId} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="btn ghost icone fale-fechar" aria-label="Fechar" onClick={fechar}><X size={18} /></button>
            {enviado ? (
              <div className="fale-ok">
                <div className="modal-icone info"><CheckCircle2 size={20} aria-hidden /></div>
                <h3 id={tituloId}>Mensagem enviada</h3>
                <p>{res!.msg}</p>
                <div className="modal-acoes"><button type="button" className="btn" onClick={fechar}>Fechar</button></div>
              </div>
            ) : (
              <form key={chave} action={acao}>
                <h3 id={tituloId}>Fale com a gente</h3>
                <p>Sua opinião vai direto para quem desenvolve o Prazo Certo.</p>
                <input type="hidden" name="tipo" value={tipo} />
                <input type="hidden" name="pagina" value={pagina} />
                <div className="chips compactos fale-tipos" role="radiogroup" aria-label="Tipo da mensagem">
                  {TIPOS_FEEDBACK.map((t) => (
                    <button key={t.valor} type="button" role="radio" aria-checked={tipo === t.valor} aria-pressed={tipo === t.valor} className="chip" onClick={() => setTipo(t.valor)}>
                      <span className="chip-titulo">{t.rotulo}</span>
                      <span className="chip-meta">{t.dica}</span>
                    </button>
                  ))}
                </div>
                <div className={`campo ${res && !res.ok ? 'com-erro' : ''}`} style={{ marginBottom: 0 }}>
                  <label htmlFor="fale-msg">Mensagem</label>
                  <textarea id="fale-msg" name="mensagem" rows={5} maxLength={4000} required
                    placeholder={tipo === 'problema' ? 'O que você tentou fazer e o que aconteceu?' : tipo === 'elogio' ? 'Do que você mais gostou?' : 'Conte com suas palavras. Quanto mais detalhe, melhor.'} />
                  {res && !res.ok && <span className="erro-campo"><AlertCircle size={14} aria-hidden />{res.msg}</span>}
                </div>
                <div className="modal-acoes">
                  <button type="button" className="btn sec" onClick={fechar}>Cancelar</button>
                  <button className="btn" disabled={enviando} aria-busy={enviando}>{enviando ? <><span className="spinner" aria-hidden />Enviando…</> : 'Enviar mensagem'}</button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
