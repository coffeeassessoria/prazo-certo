import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { exigirEmpresa } from '@/lib/contexto'
import { createAdminClient } from '@/lib/supabase/admin'
import { semFalhar, sincronizarEvento, trocarCodigo } from '@/lib/google'
import { qsToast } from '@/lib/toast'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const base = process.env.APP_URL ?? req.nextUrl.origin
  const ctx = await exigirEmpresa()
  const jar = await cookies()
  const state = req.nextUrl.searchParams.get('state')
  const code = req.nextUrl.searchParams.get('code')
  const esperado = jar.get('g_state')?.value
  jar.delete('g_state')

  if (!code || !state || state !== esperado) return NextResponse.redirect(`${base}/config?erro=google-cancelado`)

  try {
    const { refreshToken, email } = await trocarCodigo(code)
    if (!refreshToken) return NextResponse.redirect(`${base}/config?erro=google-sem-token`)

    const admin = createAdminClient()
    await admin.from('google_conexoes').upsert({
      empresa_id: ctx.empresa.id,
      refresh_token: refreshToken,
      google_email: email,
      calendar_id: 'primary',
      conectado_por: ctx.userId,
      updated_at: new Date().toISOString(),
    })

    // Envia para a agenda tudo que já estava cadastrado e ativo
    const { data: itens } = await admin
      .from('itens')
      .select('id, titulo, tipo, vencimento, antecedencia_dias, descricao, google_event_id, clientes(nome)')
      .eq('empresa_id', ctx.empresa.id)
      .eq('status', 'ativo')
      .limit(300)
    for (const i of itens ?? []) {
      const cli: any = (i as any).clientes
      const eventId = await semFalhar(() =>
        sincronizarEvento(ctx.empresa.id, { ...i, cliente_nome: Array.isArray(cli) ? cli[0]?.nome : cli?.nome })
      )
      if (eventId && eventId !== i.google_event_id) {
        await admin.from('itens').update({ google_event_id: eventId }).eq('id', i.id).eq('empresa_id', ctx.empresa.id)
      }
    }
    return NextResponse.redirect(`${base}/config?${qsToast('Google Agenda conectada', 'Os vencimentos ativos já foram enviados para a agenda.')}`)
  } catch (e) {
    console.error('[google callback]', e)
    return NextResponse.redirect(`${base}/config?erro=google-falhou`)
  }
}
