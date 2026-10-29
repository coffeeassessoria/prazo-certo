import 'server-only'
import { randomInt } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export type Resultado = { ok: boolean; msg: string; senha?: string; email?: string } | null

export function gerarSenha(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 10 }, () => chars[randomInt(chars.length)]).join('')
}

export async function criarUsuario(p: { email: string; nome: string; empresaId: string; papel: 'admin' | 'membro' }) {
  const admin = createAdminClient()
  const senha = gerarSenha()
  const { data, error } = await admin.auth.admin.createUser({
    email: p.email.toLowerCase(),
    password: senha,
    email_confirm: true,
    user_metadata: { nome: p.nome },
  })
  if (error || !data.user) {
    const jaExiste = /already|registered|exists/i.test(error?.message ?? '')
    throw new Error(jaExiste ? 'Já existe um usuário com este e-mail.' : error?.message || 'Erro ao criar usuário')
  }
  const { error: e2 } = await admin.from('perfis').insert({
    user_id: data.user.id,
    empresa_id: p.empresaId,
    nome: p.nome,
    email: p.email.toLowerCase(),
    papel: p.papel,
  })
  if (e2) {
    await admin.auth.admin.deleteUser(data.user.id)
    throw new Error(e2.message)
  }
  return senha
}

export async function redefinirSenha(userId: string) {
  const senha = gerarSenha()
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password: senha })
  if (error) throw new Error(error.message)
  return senha
}
