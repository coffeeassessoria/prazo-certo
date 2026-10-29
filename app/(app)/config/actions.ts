'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizarTelefone } from '@/lib/telefone'
import { qsToast } from '@/lib/toast'
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
  redirect(`/config?${qsToast('Números do WhatsApp salvos')}`)
}

export async function desconectarGoogle() {
  const ctx = await exigirAdminEmpresa()
  await createAdminClient().from('google_conexoes').delete().eq('empresa_id', ctx.empresa.id)
  revalidatePath('/config')
  redirect(`/config?${qsToast('Google Agenda desconectada', undefined, 'info')}`)
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

export async function salvarLembretes(fd: FormData) {
  const ctx = await exigirAdminEmpresa()
  const emails = [...new Set(String(fd.get('emails') ?? '').split(/[\n,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))]
  const antecedencia = Math.min(Math.max(Number(fd.get('antecedencia') || 30), 0), 365)
  await createAdminClient()
    .from('empresas')
    .update({ emails_lembrete: emails, antecedencia_padrao: antecedencia, lembrete_email_ativo: fd.get('ativo') === 'on' })
    .eq('id', ctx.empresa.id)
  revalidatePath('/config')
  redirect(`/config?${qsToast('Lembretes salvos', emails.length ? `Os avisos vão para ${emails.join(', ')}.` : 'Nenhum e-mail cadastrado: ninguém vai receber avisos.')}`)
}

/** Envia agora um e-mail com tudo que está vencido ou vencendo, sem registrar como enviado. */
export async function emailTeste(_prev: Resultado, _fd: FormData): Promise<Resultado> {
  try {
    const ctx = await exigirAdminEmpresa()
    const { emailConfigurado, enviarEmail } = await import('@/lib/email')
    const { montarEmail } = await import('@/lib/lembretes')
    const { hojeISO, somarDias } = await import('@/lib/datas')
    if (!emailConfigurado()) return { ok: false, msg: 'O envio de e-mail ainda não foi configurado no servidor.' }
    const para = ctx.empresa.emails_lembrete
    if (!para.length) return { ok: false, msg: 'Cadastre pelo menos um e-mail e salve antes de testar.' }
    const hoje = hojeISO()
    const supabase = await createClient()
    const { data } = await supabase
      .from('itens').select('id, titulo, tipo, vencimento, antecedencia_dias, clientes(nome)')
      .eq('empresa_id', ctx.empresa.id).eq('status', 'ativo').lte('vencimento', somarDias(hoje, ctx.empresa.antecedencia_padrao))
      .order('vencimento').limit(30)
    const itens = (data ?? []).map((i: any) => ({ ...i, cliente_nome: (Array.isArray(i.clientes) ? i.clientes[0]?.nome : i.clientes?.nome) ?? null }))
    const exemplo = itens.length ? itens : [{ id: 'exemplo', titulo: 'Exemplo: PMOC', tipo: 'documento', vencimento: somarDias(hoje, 7), antecedencia_dias: 30, cliente_nome: 'Cliente de exemplo' }]
    const email = montarEmail(ctx.empresa.nome, exemplo, hoje, process.env.APP_URL ?? '', process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo')
    await enviarEmail({ para, ...email, assunto: `[Teste] ${email.assunto}` })
    return { ok: true, msg: `E-mail de teste enviado para ${para.join(', ')}. Confira também a caixa de spam.` }
  } catch (e: any) {
    return { ok: false, msg: `Não foi possível enviar: ${e.message}` }
  }
}
