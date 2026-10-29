import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarTexto, lerMensagem } from '@/lib/evolution'
import { interpretar, responder, type ItemBot } from '@/lib/bot'
import { variantesTelefone } from '@/lib/telefone'

export const dynamic = 'force-dynamic'
const APP = process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'

export async function GET() {
  return NextResponse.json({ ok: true, servico: 'webhook whatsapp' })
}

export async function POST(req: NextRequest) {
  const token = process.env.WHATSAPP_WEBHOOK_TOKEN
  if (!token || req.nextUrl.searchParams.get('token') !== token) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const msg = lerMensagem(body)
  if (!msg) return NextResponse.json({ ok: true, ignorado: 'evento' })

  const cmd = interpretar(msg.texto)
  if (!cmd) return NextResponse.json({ ok: true, ignorado: 'nao-comando' })

  const admin = createAdminClient()
  // Só responde a números cadastrados em alguma empresa ativa (os demais são ignorados em silêncio)
  const { data: empresas } = await admin
    .from('empresas')
    .select('id, nome')
    .eq('ativo', true)
    .overlaps('whatsapp_numeros', variantesTelefone(msg.numero))
    .limit(1)
  const empresa = empresas?.[0]
  if (!empresa) return NextResponse.json({ ok: true, ignorado: 'numero-desconhecido' })

  let itens: ItemBot[] = []
  if (cmd.tipo !== 'ajuda') {
    let q = admin
      .from('itens')
      .select('titulo, tipo, vencimento, antecedencia_dias, clientes(nome)')
      .eq('empresa_id', empresa.id)
      .eq('status', 'ativo')
      .order('vencimento')
      .limit(500)

    if (cmd.tipo === 'cliente') {
      const { data: cls } = await admin
        .from('clientes')
        .select('id')
        .eq('empresa_id', empresa.id)
        .ilike('nome', `%${cmd.busca.replace(/[%_]/g, '')}%`)
        .limit(20)
      const ids = (cls ?? []).map((c) => c.id)
      if (!ids.length) {
        await enviarTexto(msg.jid, `Não encontrei cliente com "${cmd.busca}".`, body?.instance).catch(console.error)
        return NextResponse.json({ ok: true })
      }
      q = q.in('cliente_id', ids)
    }

    const { data } = await q
    itens = (data ?? []).map((i: any) => ({
      titulo: i.titulo,
      tipo: i.tipo,
      vencimento: i.vencimento,
      antecedencia_dias: i.antecedencia_dias,
      cliente_nome: (Array.isArray(i.clientes) ? i.clientes[0]?.nome : i.clientes?.nome) ?? null,
    }))
  }

  const resposta = `${responder(cmd, itens, APP)}\n\n_${empresa.nome} · digite *ajuda* para ver os comandos_`
  try {
    await enviarTexto(msg.jid, resposta, body?.instance)
  } catch (e) {
    console.error('[whatsapp]', e)
  }
  return NextResponse.json({ ok: true })
}
