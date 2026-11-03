import { NextResponse, type NextRequest } from 'next/server'
import { getContexto } from '@/lib/contexto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { qsToast } from '@/lib/toast'

export const dynamic = 'force-dynamic'

/** Abre o portal da Stripe (cartão, faturas, cancelamento). Funciona também com a empresa suspensa. */
export async function GET(req: NextRequest) {
  const ctx = await getContexto()
  const volta = ctx.empresa?.ativo ? '/config' : '/sem-acesso?motivo=bloqueado'
  if (!ctx.empresa || (ctx.papel !== 'admin' && !ctx.superadmin)) {
    return NextResponse.redirect(new URL(`${volta}${volta.includes('?') ? '&' : '?'}${qsToast('Só o administrador da empresa gerencia a assinatura', undefined, 'info')}`, req.url))
  }
  const { data: emp } = await createAdminClient().from('empresas').select('stripe_customer_id').eq('id', ctx.empresa.id).maybeSingle()
  if (!emp?.stripe_customer_id) return NextResponse.redirect(new URL('/config', req.url))
  try {
    const s = await getStripe().billingPortal.sessions.create({
      customer: emp.stripe_customer_id,
      return_url: new URL('/config', process.env.APP_URL || req.url).toString(),
      locale: 'pt-BR',
    })
    return NextResponse.redirect(s.url, 303)
  } catch (e) {
    console.error('[stripe] portal', e)
    return NextResponse.redirect(new URL(`/config?${qsToast('Não foi possível abrir a assinatura agora', 'Tente de novo em alguns minutos.', 'info')}`, req.url))
  }
}
