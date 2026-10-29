import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type Empresa = {
  id: string
  nome: string
  ativo: boolean
  whatsapp_numeros: string[]
}

export type Contexto = {
  userId: string
  email: string
  nome: string
  papel: 'admin' | 'membro'
  superadmin: boolean
  empresa: Empresa | null
}

export async function getContexto(): Promise<Contexto> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome, papel, is_superadmin, empresa_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let empresa: Empresa | null = null
  if (perfil?.empresa_id) {
    const { data } = await supabase
      .from('empresas')
      .select('id, nome, ativo, whatsapp_numeros')
      .eq('id', perfil.empresa_id)
      .maybeSingle()
    empresa = (data as Empresa) ?? null
  }

  return {
    userId: user.id,
    email: user.email ?? '',
    nome: perfil?.nome || user.email || '',
    papel: (perfil?.papel as 'admin' | 'membro') ?? 'membro',
    superadmin: !!perfil?.is_superadmin,
    empresa,
  }
}

/** Para telas da operação: exige empresa vinculada e ativa. */
export async function exigirEmpresa(): Promise<Contexto & { empresa: Empresa }> {
  const ctx = await getContexto()
  if (!ctx.empresa) redirect(ctx.superadmin ? '/admin' : '/sem-acesso')
  if (!ctx.empresa.ativo) redirect('/sem-acesso?motivo=bloqueado')
  return ctx as Contexto & { empresa: Empresa }
}

export async function exigirSuperadmin(): Promise<Contexto> {
  const ctx = await getContexto()
  if (!ctx.superadmin) redirect('/')
  return ctx
}
