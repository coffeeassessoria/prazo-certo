import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailConfigurado, enviarEmail } from '@/lib/email'
import { marcoDoDia, montarEmail, type ItemLembrete } from '@/lib/lembretes'
import { diasAte, hojeISO, somarDias } from '@/lib/datas'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Rodado todo dia pela Vercel Cron (vercel.json). Envia 1 e-mail-resumo por empresa. */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  if (!emailConfigurado()) return NextResponse.json({ ok: false, motivo: 'smtp-nao-configurado' })

  const admin = createAdminClient()
  const hoje = hojeISO()
  const appUrl = process.env.APP_URL ?? ''
  const appNome = process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'

  const { data: empresas } = await admin
    .from('empresas')
    .select('id, nome, emails_lembrete')
    .eq('ativo', true)
    .eq('lembrete_email_ativo', true)
  const resultado: Record<string, unknown> = {}

  for (const emp of empresas ?? []) {
    const para = (emp.emails_lembrete ?? []).filter(Boolean)
    if (!para.length) continue

    const { data: itens } = await admin
      .from('itens')
      .select('id, titulo, tipo, vencimento, antecedencia_dias, clientes(nome)')
      .eq('empresa_id', emp.id)
      .eq('status', 'ativo')
      .lte('vencimento', somarDias(hoje, 366))
      .limit(1000)

    const candidatos = (itens ?? [])
      .map((i: any) => ({
        id: i.id, titulo: i.titulo, tipo: i.tipo, vencimento: i.vencimento, antecedencia_dias: i.antecedencia_dias,
        cliente_nome: (Array.isArray(i.clientes) ? i.clientes[0]?.nome : i.clientes?.nome) ?? null,
        marco: marcoDoDia(diasAte(i.vencimento, hoje), i.antecedencia_dias, i.tipo, i.vencimento),
      }))
      .filter((i) => i.marco) as (ItemLembrete & { marco: string })[]
    if (!candidatos.length) continue

    const { data: jaEnviados } = await admin
      .from('lembretes_enviados')
      .select('item_id, marco')
      .eq('canal', 'email')
      .in('item_id', candidatos.map((c) => c.id))
    const enviados = new Set((jaEnviados ?? []).map((e) => `${e.item_id}:${e.marco}`))
    const novos = candidatos.filter((c) => !enviados.has(`${c.id}:${c.marco}`))
    if (!novos.length) continue

    try {
      const email = montarEmail(emp.nome, novos, hoje, appUrl, appNome)
      await enviarEmail({ para, ...email })
      await admin.from('lembretes_enviados').upsert(
        novos.map((n) => ({ empresa_id: emp.id, item_id: n.id, marco: n.marco, canal: 'email', destinatarios: para })),
        { onConflict: 'item_id,marco,canal', ignoreDuplicates: true }
      )
      resultado[emp.id] = { enviados: novos.length }
    } catch (e: any) {
      console.error('[lembretes]', emp.id, e)
      resultado[emp.id] = { erro: e.message }
    }
  }
  return NextResponse.json({ ok: true, hoje, resultado })
}
