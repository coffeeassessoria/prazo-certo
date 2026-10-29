'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizarTelefone } from '@/lib/telefone'
import { criarUsuario, type Resultado } from '@/lib/usuarios'

async function exigirAdminEmpresa() {
  const ctx = await exigirEmpresa()
  if (ctx.papel !== 'admin' && !ctx.superadmin) throw new Error('Apenas o administrador da empresa pode fazer isso.')
  return ctx
}

export async function salvarWhatsapp(fd: FormData) {
  const ctx = await exigirAdminEmpresa()
  const numeros = String(fd.get('numeros') ?? '')
    .split(/[\n,;]+/)
    .map(normalizarTelefone)
    .filter((n) => n.length >= 12)
  // empresas não tem policy de update para o usuário: grava via service role, sempre na empresa do próprio usuário
  await createAdminClient().from('empresas').update({ whatsapp_numeros: [...new Set(numeros)] }).eq('id', ctx.empresa.id)
  revalidatePath('/config')
  redirect('/config?ok=whatsapp')
}

export async function desconectarGoogle() {
  const ctx = await exigirAdminEmpresa()
  await createAdminClient().from('google_conexoes').delete().eq('empresa_id', ctx.empresa.id)
  revalidatePath('/config')
  redirect('/config?ok=google-desconectado')
}

export async function adicionarUsuario(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    const ctx = await exigirAdminEmpresa()
    const email = String(fd.get('email') ?? '').trim()
    const nome = String(fd.get('nome') ?? '').trim()
    if (!email || !nome) return { ok: false, msg: 'Informe nome e e-mail.' }
    const senha = await criarUsuario({ email, nome, empresaId: ctx.empresa.id, papel: 'membro' })
    revalidatePath('/config')
    return { ok: true, msg: `Usuário ${nome} criado.`, senha, email }
  } catch (e: any) {
    return { ok: false, msg: e.message }
  }
}

export async function trocarSenha(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const senha = String(fd.get('senha') ?? '')
  if (senha.length < 8) return { ok: false, msg: 'A senha precisa ter pelo menos 8 caracteres.' }
  if (senha !== String(fd.get('confirmar') ?? '')) return { ok: false, msg: 'As senhas não conferem.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: senha })
  return error ? { ok: false, msg: error.message } : { ok: true, msg: 'Senha alterada.' }
}
