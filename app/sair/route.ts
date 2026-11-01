import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const response = NextResponse.redirect(new URL('/login', req.url), { status: 303 })
  response.cookies.set('pc_offline_encerrado','1',{path:'/',sameSite:'lax',httpOnly:false,maxAge:60*60*24*365})
  return response
}
