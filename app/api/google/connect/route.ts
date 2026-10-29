import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { exigirEmpresa } from '@/lib/contexto'
import { googleConfigurado, urlAutorizacao } from '@/lib/google'

export const dynamic = 'force-dynamic'

export async function GET() {
  await exigirEmpresa()
  if (!googleConfigurado()) {
    return NextResponse.redirect(`${process.env.APP_URL ?? ''}/config?erro=google-nao-configurado`)
  }
  const state = randomBytes(16).toString('hex')
  ;(await cookies()).set('g_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' })
  return NextResponse.redirect(urlAutorizacao(state))
}
