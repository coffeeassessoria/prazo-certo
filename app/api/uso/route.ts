import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { caminhoGenerico, secaoDe } from '@/lib/uso'

export const dynamic = 'force-dynamic'

/** Recebe o registro de tela aberta (navigator.sendBeacon). Sem resposta útil: nunca atrapalha o uso. */
export async function POST(req: NextRequest) {
  try {
    const { p, f } = JSON.parse(await req.text()) as { p?: string; f?: string }
    if (!p || typeof p !== 'string' || !p.startsWith('/')) return new NextResponse(null, { status: 204 })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse(null, { status: 204 })
    const ua = req.headers.get('user-agent') || ''
    await supabase.from('acessos').insert({
      secao: secaoDe(p, f),
      caminho: caminhoGenerico(p),
      dispositivo: /Mobi|Android|iPhone|iPad/i.test(ua) ? 'celular' : 'computador',
    })
  } catch {}
  return new NextResponse(null, { status: 204 })
}
