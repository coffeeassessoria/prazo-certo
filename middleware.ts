import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLICAS = ['/login', '/inicio', '/guia', '/privacidade', '/termos', '/esqueci-senha', '/auth/', '/api/whatsapp', '/api/cron', '/demo', '/design-system']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const path = request.nextUrl.pathname
  if (['/operacao', '/sw.js', '/api/operacao', '/api/operacao/pdf', '/api/operacao/fotos', '/api/importacao'].includes(path) || PUBLICAS.some((p) => path.startsWith(p))) return response
  // Antes de configurar o Supabase, só a demonstração e o login funcionam
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.redirect(new URL('/demo', request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Visitante no endereço principal vê a página de vendas (sem mudar a URL)
    if (path === '/') return NextResponse.rewrite(new URL('/inicio', request.url))
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|apple-touch-icon.png|icon-.*\\.png).*)'],
}
