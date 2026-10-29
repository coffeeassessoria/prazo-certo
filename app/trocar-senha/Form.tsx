'use client'

import { useActionState, useState } from 'react'
import { AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react'
import { definirSenha } from './actions'

export function FormSenha() {
  const [res, acao, pendente] = useActionState(definirSenha, null)
  const [ver, setVer] = useState(false)
  return (
    <form action={acao}>
      {res?.erro && <div className="aviso erro" role="alert"><AlertCircle size={18} aria-hidden /><div>{res.erro}</div></div>}
      <div className="campo">
        <label htmlFor="senha">Nova senha</label>
        <input id="senha" name="senha" type={ver ? 'text' : 'password'} minLength={8} required autoComplete="new-password" autoFocus aria-invalid={!!res?.erro} />
        <span className="dica">Pelo menos 8 caracteres. Evite a data de nascimento ou o nome da empresa.</span>
      </div>
      <div className="campo">
        <label htmlFor="confirmar">Repita a nova senha</label>
        <input id="confirmar" name="confirmar" type={ver ? 'text' : 'password'} minLength={8} required autoComplete="new-password" aria-invalid={!!res?.erro} />
      </div>
      <button type="button" className="btn ghost peq" onClick={() => setVer(!ver)} style={{ marginBottom: 16 }}>
        {ver ? <EyeOff size={14} /> : <Eye size={14} />}{ver ? 'Esconder senhas' : 'Mostrar senhas'}
      </button>
      <button className="btn grande cheio" disabled={pendente} aria-busy={pendente}>
        {pendente ? <><span className="spinner" aria-hidden />Salvando…</> : <><KeyRound size={16} />Salvar senha e continuar</>}
      </button>
    </form>
  )
}
