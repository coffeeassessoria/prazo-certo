import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/** Link do e-mail de recuperação: valida o token, abre a sessão e leva para criar a nova senha. */
export async function GET(req: NextRequest) {
  const base = process.env.APP_URL ?? req.nextUrl.origin
  const token_hash = req.nextUrl.searchParams.get('token_hash')
  const type = (req.nextUrl.searchParams.get('type') ?? 'recovery') as EmailOtpType
  if (!token_hash) return NextResponse.redirect(`${base}/esqueci-senha`)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })
  if (error || !data.user) return NextResponse.redirect(`${base}/login?link=expirado`)

  await createAdminClient().from('perfis').update({ trocar_senha: true }).eq('user_id', data.user.id)
  return NextResponse.redirect(`${base}/trocar-senha?motivo=recuperar`)
}
