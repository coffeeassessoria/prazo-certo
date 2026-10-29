import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

import type { Modelo } from '@/lib/modelos'

export type Empresa = {
  id: string
  nome: string
  ativo: boolean
  whatsapp_numeros: string[]
  documento: string | null
  cidade: string | null
  segmento: string | null
  responsavel: string | null
  emails_lembrete: string[]
  antecedencia_padrao: number
  modelos: Modelo[]
  lembrete_email_ativo: boolean
  onboarding_concluido: boolean
}

const CAMPOS_EMPRESA =
  'id, nome, ativo, whatsapp_numeros, documento, cidade, segmento, responsavel, emails_lembrete, antecedencia_padrao, modelos, lembrete_email_ativo, onboarding_concluido'

export type Contexto = {
  userId: string
  email: string
  nome: string
  papel: 'admin' | 'membro'
  superadmin: boolean
  trocarSenha: boolean
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
    .select('nome, papel, is_superadmin, empresa_id, trocar_senha')
    .eq('user_id', user.id)
    .maybeSingle()

  let empresa: Empresa | null = null
  if (perfil?.empresa_id) {
    const { data } = await supabase
      .from('empresas')
      .select(CAMPOS_EMPRESA)
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
    trocarSenha: !!perfil?.trocar_senha,
    empresa,
  }
}

/**
 * Para telas da operação: exige empresa vinculada e ativa.
 * Se a empresa ainda não respondeu o quiz de boas-vindas, manda para /bem-vindo.
 */
export async function exigirEmpresa(opts: { noOnboarding?: boolean } = {}): Promise<Contexto & { empresa: Empresa }> {
  const ctx = await getContexto()
  if (ctx.trocarSenha) redirect('/trocar-senha')
  if (!ctx.empresa) redirect(ctx.superadmin ? '/admin' : '/sem-acesso')
  if (!ctx.empresa.ativo) redirect('/sem-acesso?motivo=bloqueado')
  if (!opts.noOnboarding && !ctx.empresa.onboarding_concluido) redirect('/bem-vindo')
  return ctx as Contexto & { empresa: Empresa }
}

export async function exigirSuperadmin(): Promise<Contexto> {
  const ctx = await getContexto()
  if (!ctx.superadmin) redirect('/')
  return ctx
}
