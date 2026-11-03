import Link from 'next/link'
import type { Metadata } from 'next'
import { BookOpen, MailCheck } from 'lucide-react'
import { LogoMarca } from '@/components/ui/Logo'
import { getStripe, stripeConfigurado } from '@/lib/stripe'

export const metadata: Metadata = { title: 'Assinatura confirmada · Prazo Certo' }
export const dynamic = 'force-dynamic'

export default async function Obrigado({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams
  let email: string | null = null
  if (s && stripeConfigurado() && /^cs_[A-Za-z0-9_]+$/.test(s)) {
    try { email = (await getStripe().checkout.sessions.retrieve(s)).customer_details?.email ?? null } catch {}
  }
  return (
    <div className="entrada">
      <div className="card">
        <div className="topo-entrada">
          <LogoMarca grande />
          <div>
            <h1>Assinatura confirmada</h1>
            <p className="sub">Obrigado! O Prazo Certo da sua empresa já está liberado.</p>
          </div>
        </div>
        <div className="aviso ok" role="status">
          <MailCheck size={18} aria-hidden />
          <div>
            <b>Seu acesso chega por e-mail</b>
            Enviamos o endereço, {email ? <>o e-mail <strong>{email}</strong></> : 'o seu e-mail'} e uma senha provisória. Não chegou em 5 minutos? Olhe a caixa de spam.
          </div>
        </div>
        <Link href="/login" className="btn grande cheio">Ir para o login</Link>
        <a href="/guia" className="btn ghost cheio" style={{ marginTop: 8 }}><BookOpen size={16} />Ver o guia do usuário</a>
      </div>
    </div>
  )
}
