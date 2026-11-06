'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirEmpresa } from '@/lib/contexto'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizarAvisos, type Campo, type Modelo } from '@/lib/modelos'
import { qsToast } from '@/lib/toast'

const CATEGORIAS = ['documento', 'manutencao', 'contrato', 'outro'] as const
const TIPOS_CAMPO = ['texto', 'data', 'numero', 'sim_nao'] as const

async function exigirAdmin() {
  const ctx = await exigirEmpresa()
  if (ctx.papel !== 'admin' && !ctx.superadmin) throw new Error('Só o administrador da empresa pode alterar os tipos de documento.')
  return ctx
}

function ler(json: string): Modelo {
  let d: any
  try { d = JSON.parse(json) } catch { throw new Error('Não foi possível ler o tipo. Tente novamente.') }
  const titulo = String(d?.titulo ?? '').trim().slice(0, 80)
  if (!titulo) throw new Error('Informe o nome do tipo')
  const rec = Number(d?.recorrencia_meses)
  const campos: Campo[] = (Array.isArray(d?.campos) ? d.campos : []).slice(0, 20)
    .map((c: any) => ({ rotulo: String(c?.rotulo ?? '').trim().slice(0, 80), tipo: TIPOS_CAMPO.includes(c?.tipo) ? c.tipo : 'texto' }))
    .filter((c: Campo, i: number, a: Campo[]) => c.rotulo && a.findIndex((x) => x.rotulo.toLowerCase() === c.rotulo.toLowerCase()) === i)
  return {
    titulo,
    tipo: CATEGORIAS.includes(d?.tipo) ? d.tipo : 'documento',
    recorrencia_meses: Number.isInteger(rec) && rec > 0 && rec <= 120 ? rec : null,
    avisos: normalizarAvisos(d?.avisos),
    colaborador: !!d?.colaborador,
    campos,
  }
}

export async function salvarTipo(fd: FormData) {
  const ctx = await exigirAdmin()
  const tipo = ler(String(fd.get('tipo') ?? ''))
  const original = String(fd.get('original') ?? '')
  const volta = String(fd.get('volta') ?? '')
  const atuais = ctx.empresa.modelos ?? []
  if (atuais.some((m) => m.titulo.toLowerCase() === tipo.titulo.toLowerCase() && m.titulo !== original)) {
    redirect(`/config/tipos?${qsToast('Já existe um tipo com esse nome', 'Use outro nome ou edite o tipo existente.', 'info')}`)
  }
  const modelos = original && atuais.some((m) => m.titulo === original)
    ? atuais.map((m) => (m.titulo === original ? tipo : m))
    : [...atuais, tipo].slice(0, 60)
  // empresas não tem policy de update para usuários: grava pelo servidor, só na empresa do próprio usuário
  const { error } = await createAdminClient().from('empresas').update({ modelos }).eq('id', ctx.empresa.id)
  if (error) throw new Error('Não foi possível salvar o tipo. Tente novamente.')
  revalidatePath('/config/tipos')
  revalidatePath('/itens/novo')
  if (/^\/itens\/(novo|[0-9a-f-]{36}\?editar=1)$/.test(volta)) {
    const sep = volta.includes('?') ? '&' : '?'
    redirect(`${volta}${sep}modelo=${encodeURIComponent(tipo.titulo)}&${qsToast(`${tipo.titulo} cadastrado`, 'Já está selecionado. Continue o cadastro.')}`)
  }
  redirect(`/config/tipos?${qsToast(original ? 'Tipo atualizado' : `${tipo.titulo} cadastrado`, 'Ele aparece como atalho no cadastro de vencimento.')}`)
}

export async function removerTipo(fd: FormData) {
  const ctx = await exigirAdmin()
  const titulo = String(fd.get('titulo') ?? '')
  const modelos = (ctx.empresa.modelos ?? []).filter((m) => m.titulo !== titulo)
  await createAdminClient().from('empresas').update({ modelos }).eq('id', ctx.empresa.id)
  revalidatePath('/config/tipos')
  redirect(`/config/tipos?${qsToast('Tipo removido', 'Os vencimentos já cadastrados com ele continuam iguais.', 'info')}`)
}
