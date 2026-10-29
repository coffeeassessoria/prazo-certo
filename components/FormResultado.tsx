'use client'

import { useActionState } from 'react'

type Res = { ok: boolean; msg: string; senha?: string; email?: string } | null

export function FormResultado({
  acao, children, className = 'card',
}: {
  acao: (prev: Res, fd: FormData) => Promise<Res>
  children: React.ReactNode
  className?: string
}) {
  const [res, formAction, pending] = useActionState(acao, null)
  const app = process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'
  const textoAcesso = res?.senha
    ? `Acesso ao ${app}\nEndereço: ${typeof window !== 'undefined' ? window.location.origin : ''}\nE-mail: ${res.email}\nSenha: ${res.senha}`
    : ''
  return (
    <form action={formAction} className={className}>
      {res && (
        <div className={`aviso ${res.ok ? 'ok' : 'erro'}`}>
          {res.msg}
          {res.senha && (
            <div style={{ marginTop: 8 }}>
              <pre style={{ background: '#fff', padding: 10, borderRadius: 8, whiteSpace: 'pre-wrap', color: '#15202b' }}>{textoAcesso}</pre>
              <div className="acoes">
                <button type="button" className="btn peq sec" onClick={() => navigator.clipboard.writeText(textoAcesso)}>Copiar</button>
                <a className="btn peq" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(textoAcesso)}`}>Enviar no WhatsApp</a>
              </div>
              <div className="dica" style={{ marginTop: 6 }}>Anote agora: a senha não aparece de novo. A pessoa pode trocar depois em Configurações.</div>
            </div>
          )}
        </div>
      )}
      <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0 }}>{children}</fieldset>
    </form>
  )
}
