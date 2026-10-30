'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LogoMarca } from '@/components/ui/Logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const nome = process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('link') === 'expirado') {
      setErro('Esse link de redefinição expirou ou já foi usado. Peça um novo em "Esqueci minha senha".')
    }
  }, [])

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password: senha })
    setCarregando(false)
    if (error) {
      setErro('E-mail ou senha não conferem. Confira e tente de novo.')
      return
    }
    router.replace('/')
    router.refresh()
  }

  return (
    <div className="entrada">
      <div className="card">
        <div className="topo-entrada">
          <LogoMarca grande />
          <div>
            <h1>{nome}</h1>
            <p className="sub">Documentos, contratos e manutenções sempre no prazo</p>
          </div>
        </div>
        {erro && <div className="aviso erro" role="alert"><AlertCircle size={18} aria-hidden /><div>{erro}</div></div>}
        <form onSubmit={entrar}>
          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!erro} />
          </div>
          <div className="campo">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <label htmlFor="senha">Senha</label>
              <Link href="/esqueci-senha" style={{ fontSize: 13, fontWeight: 500 }}>Esqueci minha senha</Link>
            </div>
            <input id="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} aria-invalid={!!erro} />
          </div>
          <button className="btn grande cheio" disabled={carregando} aria-busy={carregando}>
            {carregando ? <><span className="spinner" aria-hidden />Entrando…</> : <><LogIn size={16} />Entrar</>}
          </button>
        </form>
        <p className="dica" style={{ textAlign: 'center', marginTop: 16 }}><Link href="/privacidade">Política de privacidade</Link></p>
      </div>
    </div>
  )
}
