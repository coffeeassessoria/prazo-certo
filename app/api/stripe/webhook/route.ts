import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, provisionarCheckout, sincronizarAssinatura } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Webhook da Stripe. Eventos: checkout.session.completed, customer.subscription.created|updated|deleted. */
export async function POST(req: NextRequest) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET
  const assinatura = req.headers.get('stripe-signature')
  if (!segredo || !assinatura) return NextResponse.json({ ok: false }, { status: 400 })

  let evento: Stripe.Event
  try {
    evento = getStripe().webhooks.constructEvent(await req.text(), assinatura, segredo)
  } catch (e: any) {
    console.error('[stripe] assinatura inválida', e?.message)
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: visto } = await admin.from('stripe_eventos').select('id').eq('id', evento.id).maybeSingle()
  if (visto) return NextResponse.json({ ok: true, repetido: true })

  try {
    switch (evento.type) {
      case 'checkout.session.completed': {
        const s = evento.data.object
        if (s.mode === 'subscription') {
          await provisionarCheckout(s)
          if (s.subscription) {
            const sub = await getStripe().subscriptions.retrieve(typeof s.subscription === 'string' ? s.subscription : s.subscription.id)
            await sincronizarAssinatura(sub)
          }
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await sincronizarAssinatura(evento.data.object)
        break
    }
    await admin.from('stripe_eventos').insert({ id: evento.id, tipo: evento.type })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[stripe] webhook', evento.type, e)
    // 500 faz a Stripe tentar de novo mais tarde
    return NextResponse.json({ ok: false, erro: e?.message }, { status: 500 })
  }
}
