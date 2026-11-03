import { NextResponse, type NextRequest } from 'next/server'
import { criarCheckout, stripeConfigurado } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/** Botão "Assinar" da página de vendas: abre o Checkout da Stripe (com o código de indicação, se houver). */
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref')
  if (!stripeConfigurado()) return NextResponse.redirect(new URL('/inicio#preco', req.url))
  try {
    return NextResponse.redirect(await criarCheckout({ ref }), 303)
  } catch (e) {
    console.error('[stripe] checkout', e)
    return NextResponse.redirect(new URL('/inicio?erro=assinatura#preco', req.url))
  }
}
