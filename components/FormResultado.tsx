'use client'

import { useActionState, useState } from 'react'
import { AlertCircle, Check, CheckCircle2, Copy, MessageCircle } from 'lucide-react'

type Res = { ok: boolean; msg: string; senha?: string; email?: string } | null

/**
 * Formulário cuja ação devolve um resultado na própria tela (sem recarregar).
 * Mostra sucesso/erro no padrão de aviso do DS e, quando há acesso gerado, o bloco para copiar/enviar.
 */
export function FormResultado({
  acao, children, className = 'card',
}: {
  acao: (prev: Res, fd: FormData) => Promise<Res>
  children: React.ReactNode
  className?: string
}) {
  const [res, formAction, pending] = useActionState(acao, null)
  const [copiado, setCopiado] = useState(false)
  const app = process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'
  const textoAcesso = res?.senha
    ? `Acesso ao ${app}\nEndereço: ${typeof window !== 'undefined' ? window.location.origin : ''}\nE-mail: ${res.email}\nSenha: ${res.senha}`
    : ''
  return (
    <form action={formAction} className={className} aria-busy={pending}>
      {res && (
        <div className={`aviso ${res.ok ? 'ok' : 'erro'}`} role={res.ok ? 'status' : 'alert'}>
          {res.ok ? <CheckCircle2 size={18} aria-hidden /> : <AlertCircle size={18} aria-hidden />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{res.msg}</b>
            {res.senha && (
              <>
                <pre className="pre-codigo" style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{textoAcesso}</pre>
                <div className="acoes">
                  <button type="button" className="btn sec peq" onClick={() => { navigator.clipboard.writeText(textoAcesso); setCopiado(true) }}>
                    {copiado ? <Check size={14} /> : <Copy size={14} />}{copiado ? 'Copiado' : 'Copiar acesso'}
                  </button>
                  <a className="btn peq" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(textoAcesso)}`}><MessageCircle size={14} />Enviar no WhatsApp</a>
                </div>
                <span className="dica" style={{ display: 'block', marginTop: 8 }}>Anote agora: a senha não aparece de novo. A pessoa pode trocar depois em Ajustes.</span>
              </>
            )}
          </div>
        </div>
      )}
      <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{children}</fieldset>
    </form>
  )
}
