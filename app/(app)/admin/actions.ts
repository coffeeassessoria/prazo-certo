'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirSuperadmin } from '@/lib/contexto'
import { createAdminClient } from '@/lib/supabase/admin'
import { criarUsuario, redefinirSenha, type Resultado } from '@/lib/usuarios'
import { normalizarTelefone } from '@/lib/telefone'

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()

export async function criarEmpresa(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    await exigirSuperadmin()
    const admin = createAdminClient()
    const responsavel = txt(fd, 'responsavel')
    const email = txt(fd, 'email')
    const senhaProvisoria = txt(fd, 'senha')
    // O nome da empresa é opcional aqui: o cliente confirma no quiz do primeiro acesso
    const nome = txt(fd, 'empresa') || `Empresa de ${responsavel.split(' ')[0]}`
    if (!responsavel || !email) return { ok: false, msg: 'Informe o nome e o e-mail do cliente.' }
    if (senhaProvisoria && senhaProvisoria.length < 8) return { ok: false, msg: 'A senha provisória precisa ter pelo menos 8 caracteres.' }
    const whats = normalizarTelefone(txt(fd, 'whatsapp'))
    const valor = txt(fd, 'valor').replace(',', '.')

    const { data: emp, error } = await admin
      .from('empresas')
      .insert({
        nome,
        documento: txt(fd, 'documento') || null,
        valor_mensal: valor ? Number(valor) : null,
        whatsapp_numeros: whats.length >= 12 ? [whats] : [],
      })
      .select('id').single()
    if (error) return { ok: false, msg: error.message }

    try {
      const senha = await criarUsuario({ email, nome: responsavel, empresaId: emp.id, papel: 'admin', senha: senhaProvisoria })
      revalidatePath('/admin')
      return { ok: true, msg: `Acesso de ${responsavel} criado. No primeiro login ele troca a senha e configura a empresa.`, senha, email }
    } catch (e: any) {
      await admin.from('empresas').delete().eq('id', emp.id)
      return { ok: false, msg: e.message }
    }
  } catch (e: any) {
    return { ok: false, msg: e.message }
  }
}

export async function adicionarUsuarioEmpresa(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    await exigirSuperadmin()
    const senha = await criarUsuario({
      email: txt(fd, 'email'),
      nome: txt(fd, 'nome'),
      empresaId: txt(fd, 'empresa_id'),
      papel: txt(fd, 'papel') === 'admin' ? 'admin' : 'membro',
    })
    revalidatePath('/admin')
    return { ok: true, msg: 'Usuário criado.', senha, email: txt(fd, 'email') }
  } catch (e: any) {
    return { ok: false, msg: e.message }
  }
}

export async function resetarSenha(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    await exigirSuperadmin()
    const senha = await redefinirSenha(txt(fd, 'user_id'))
    return { ok: true, msg: 'Nova senha gerada.', senha, email: txt(fd, 'email') }
  } catch (e: any) {
    return { ok: false, msg: e.message }
  }
}

export async function alternarAtivo(fd: FormData) {
  await exigirSuperadmin()
  await createAdminClient().from('empresas').update({ ativo: txt(fd, 'ativo') === 'true' }).eq('id', txt(fd, 'id'))
  revalidatePath('/admin')
}

/** Suporte: o superadmin passa a visualizar os dados de uma empresa. */
export async function acessarEmpresa(fd: FormData) {
  const ctx = await exigirSuperadmin()
  await createAdminClient().from('perfis').update({ empresa_id: txt(fd, 'id') || null }).eq('user_id', ctx.userId)
  revalidatePath('/', 'layout')
  redirect(txt(fd, 'id') ? '/' : '/admin')
}
