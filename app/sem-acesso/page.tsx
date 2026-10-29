import { Lock } from 'lucide-react'
import { LogoMarca } from '@/components/ui/Logo'

export default async function SemAcesso({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const { motivo } = await searchParams
  const bloqueado = motivo === 'bloqueado'
  return (
    <div className="entrada">
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="topo-entrada">
          <LogoMarca grande />
          <div>
            <h1 style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}><Lock size={20} aria-hidden />{bloqueado ? 'Acesso suspenso' : 'Sem empresa vinculada'}</h1>
            <p className="sub">
              {bloqueado
                ? 'O acesso desta empresa está suspenso no momento. Fale com o suporte para regularizar.'
                : 'Seu usuário ainda não está ligado a uma empresa. Fale com quem enviou seu acesso.'}
            </p>
          </div>
        </div>
        <form action="/sair" method="post"><button className="btn sec cheio">Sair</button></form>
      </div>
    </div>
  )
}
