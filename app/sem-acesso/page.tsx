import { CreditCard, Lock } from 'lucide-react'
import { getContexto } from '@/lib/contexto'
import { createAdminClient } from '@/lib/supabase/admin'
import { LogoMarca } from '@/components/ui/Logo'

export default async function SemAcesso({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const { motivo } = await searchParams
  const bloqueado = motivo === 'bloqueado'
  // Assinante da Stripe com pagamento pendente: pode regularizar sozinho pelo portal
  let porPagamento = false
  if (bloqueado) {
    const ctx = await getContexto()
    if (ctx.empresa && (ctx.papel === 'admin' || ctx.superadmin)) {
      const { data } = await createAdminClient().from('empresas').select('plano, stripe_customer_id').eq('id', ctx.empresa.id).maybeSingle()
      porPagamento = data?.plano === 'assinatura' && !!data.stripe_customer_id
    }
  }
  return (
    <div className="entrada">
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="topo-entrada">
          <LogoMarca grande />
          <div>
            <h1 style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}><Lock size={20} aria-hidden />{bloqueado ? 'Acesso suspenso' : 'Sem empresa vinculada'}</h1>
            <p className="sub">
              {porPagamento
                ? 'A assinatura desta empresa está com o pagamento pendente. Atualize o cartão e o acesso volta na hora.'
                : bloqueado
                ? 'O acesso desta empresa está suspenso no momento. Fale com o suporte para regularizar.'
                : 'Seu usuário ainda não está ligado a uma empresa. Fale com quem enviou seu acesso.'}
            </p>
          </div>
        </div>
        {porPagamento && <a href="/api/stripe/portal" className="btn grande cheio" style={{ marginBottom: 8 }}><CreditCard size={16} />Regularizar pagamento</a>}
        <form action="/sair" method="post"><button className="btn sec cheio">Sair</button></form>
      </div>
    </div>
  )
}
