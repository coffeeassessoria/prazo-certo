import { redirect } from 'next/navigation'
import { getContexto } from '@/lib/contexto'
import { LogoMarca } from '@/components/ui/Logo'
import { FormSenha } from './Form'

export const dynamic = 'force-dynamic'

export default async function TrocarSenha() {
  const ctx = await getContexto()
  if (!ctx.trocarSenha) redirect('/')
  const primeiroNome = (ctx.nome || '').split(/[\s@]/)[0]
  return (
    <div className="entrada">
      <div className="card">
        <div className="topo-entrada">
          <LogoMarca grande />
          <div>
            <h1>Bem-vindo{primeiroNome ? `, ${primeiroNome}` : ''}!</h1>
            <p className="sub">Antes de começar, crie a sua senha. A senha provisória que você recebeu deixa de valer.</p>
          </div>
        </div>
        <FormSenha />
        <form action="/sair" method="post" style={{ marginTop: 12, textAlign: 'center' }}>
          <button className="btn ghost peq">Sair</button>
        </form>
      </div>
    </div>
  )
}
