'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { AlertCircle, ArrowLeft, MailCheck, Send } from 'lucide-react'
import { LogoMarca } from '@/components/ui/Logo'
import { enviarLink } from './actions'

export default function EsqueciSenha() {
  const [res, acao, pendente] = useActionState(enviarLink, null)
  return (
    <div className="entrada">
      <div className="card">
        <div className="topo-entrada">
          <LogoMarca grande />
          <div>
            <h1>{res?.ok ? 'Confira seu e-mail' : 'Esqueceu a senha?'}</h1>
            <p className="sub">
              {res?.ok
                ? 'Se esse e-mail estiver cadastrado, enviamos um link para criar uma nova senha. Ele vale por 1 hora.'
                : 'Informe o e-mail que você usa para entrar. Vamos enviar um link para criar uma nova senha.'}
            </p>
          </div>
        </div>
        {res?.ok ? (
          <>
            <div className="aviso ok" role="status"><MailCheck size={18} aria-hidden /><div><b>Link enviado</b>Não chegou em 2 minutos? Olhe a caixa de spam ou peça de novo.</div></div>
            <Link href="/login" className="btn sec grande cheio"><ArrowLeft size={16} />Voltar para o login</Link>
          </>
        ) : (
          <form action={acao}>
            {res?.erro && <div className="aviso erro" role="alert"><AlertCircle size={18} aria-hidden /><div>{res.erro}</div></div>}
            <div className="campo">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" autoComplete="email" required autoFocus aria-invalid={!!res?.erro} />
            </div>
            <button className="btn grande cheio" disabled={pendente} aria-busy={pendente}>
              {pendente ? <><span className="spinner" aria-hidden />Enviando…</> : <><Send size={16} />Enviar link por e-mail</>}
            </button>
            <Link href="/login" className="btn ghost cheio" style={{ marginTop: 8 }}><ArrowLeft size={16} />Voltar para o login</Link>
          </form>
        )}
      </div>
    </div>
  )
}
