'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const nome = process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password: senha })
    setCarregando(false)
    if (error) {
      setErro('E-mail ou senha incorretos.')
      return
    }
    router.replace('/')
    router.refresh()
  }

  return (
    <div className="entrada">
      <div className="card">
        <img src="/icon-192.png" alt="" />
        <h1>{nome}</h1>
        <p className="sub">Documentos, contratos e manutenções sempre no prazo</p>
        {erro && <div className="aviso erro">{erro}</div>}
        <form onSubmit={entrar}>
          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <input id="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          <button className="btn cheio" disabled={carregando}>
            {carregando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
