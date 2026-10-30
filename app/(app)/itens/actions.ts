'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { finalizarEvento, removerEvento, semFalhar, sincronizarEvento } from '@/lib/google'
import { qsToast } from '@/lib/toast'
import { ACOMPANHAMENTO, fmtData, fmtDiaSemana, hojeISO, somarDias } from '@/lib/datas'

type Supa = Awaited<ReturnType<typeof createClient>>

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const numOuNull = (v: string) => (v ? Number(v) : null)

async function resolverCliente(supabase: Supa, empresaId: string, fd: FormData): Promise<string | null> {
  const novo = txt(fd, 'cliente_novo')
  if (novo) {
    const { data: existente } = await supabase
      .from('clientes').select('id').eq('empresa_id', empresaId).ilike('nome', novo).maybeSingle()
    if (existente) return existente.id
    const { data, error } = await supabase
      .from('clientes').insert({ empresa_id: empresaId, nome: novo }).select('id').single()
    if (error) throw new Error(error.message)
    return data.id
  }
  return txt(fd, 'cliente_id') || null
}

async function enviarAnexo(supabase: Supa, empresaId: string, itemId: string, fd: FormData) {
  const arquivo = fd.get('anexo')
  if (!(arquivo instanceof File) || arquivo.size === 0) return null
  if (arquivo.size > 10 * 1024 * 1024) throw new Error('Arquivo maior que 10 MB')
  const limpo = arquivo.name.normalize('NFD').replace(/[^\w.\-]+/g, '_').slice(-80)
  const path = `${empresaId}/${itemId}/${Date.now()}-${limpo}`
  const { error } = await supabase.storage.from('anexos').upload(path, arquivo, {
    contentType: arquivo.type || 'application/octet-stream',
  })
  if (error) throw new Error('Falha ao enviar anexo: ' + error.message)
  return { anexo_path: path, anexo_nome: arquivo.name }
}

async function sincronizar(supabase: Supa, empresaId: string, itemId: string) {
  const { data: i } = await supabase
    .from('itens')
    .select('id, titulo, tipo, vencimento, antecedencia_dias, descricao, google_event_id, clientes(nome)')
    .eq('id', itemId).eq('empresa_id', empresaId).single()
  if (!i) return
  const cli: any = (i as any).clientes
  const eventId = await semFalhar(() =>
    sincronizarEvento(empresaId, { ...i, cliente_nome: Array.isArray(cli) ? cli[0]?.nome : cli?.nome })
  )
  if (eventId && eventId !== i.google_event_id) {
    await supabase.from('itens').update({ google_event_id: eventId }).eq('id', itemId).eq('empresa_id', empresaId)
  }
}

export async function salvarItem(fd: FormData) {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const empresaId = ctx.empresa.id
  const id = txt(fd, 'id')

  const campos = {
    titulo: txt(fd, 'titulo'),
    tipo: txt(fd, 'tipo') || 'documento',
    descricao: txt(fd, 'descricao') || null,
    vencimento: txt(fd, 'vencimento'),
    recorrencia_meses: numOuNull(txt(fd, 'recorrencia_meses')),
    antecedencia_dias: Number(txt(fd, 'antecedencia_dias') || ctx.empresa.antecedencia_padrao || 30),
    cliente_id: await resolverCliente(supabase, empresaId, fd),
  }
  if (!campos.titulo || !/^\d{4}-\d{2}-\d{2}$/.test(campos.vencimento)) {
    throw new Error('Preencha o título e a data de vencimento.')
  }

  let itemId = id
  if (id) {
    const { error } = await supabase.from('itens').update(campos).eq('id', id).eq('empresa_id', empresaId)
    if (error) throw new Error(error.message)
  } else {
    const { data, error } = await supabase
      .from('itens').insert({ ...campos, empresa_id: empresaId, created_by: ctx.userId }).select('id').single()
    if (error) throw new Error(error.message)
    itemId = data.id
  }

  const anexo = await enviarAnexo(supabase, empresaId, itemId, fd)
  if (anexo) {
    const { data: antigo } = await supabase.from('itens').select('anexo_path').eq('id', itemId).single()
    await supabase.from('itens').update(anexo).eq('id', itemId).eq('empresa_id', empresaId)
    if (antigo?.anexo_path) await supabase.storage.from('anexos').remove([antigo.anexo_path])
  }

  await sincronizar(supabase, empresaId, itemId)
  revalidatePath('/')
  redirect(id
    ? `/itens/${itemId}?${qsToast('Alterações salvas', 'Os lembretes foram ajustados para a nova data.')}`
    : `/?f=todos&${qsToast(`${campos.titulo} cadastrado`, `Vence em ${fmtData(campos.vencimento)}. Os lembretes por e-mail já estão ativos.`)}`)
}

export async function renovarItem(fd: FormData) {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const empresaId = ctx.empresa.id
  const id = txt(fd, 'id')
  const novoVenc = txt(fd, 'novo_vencimento')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(novoVenc)) throw new Error('Informe a nova data de vencimento.')

  const { data: atual } = await supabase.from('itens').select('*').eq('id', id).eq('empresa_id', empresaId).single()
  if (!atual) throw new Error('Item não encontrado')

  const { data: novo, error } = await supabase
    .from('itens')
    .insert({
      empresa_id: empresaId,
      cliente_id: atual.cliente_id,
      tipo: atual.tipo,
      titulo: atual.titulo,
      descricao: atual.descricao,
      vencimento: novoVenc,
      recorrencia_meses: atual.recorrencia_meses,
      antecedencia_dias: atual.antecedencia_dias,
      item_anterior_id: atual.id,
      created_by: ctx.userId,
    })
    .select('id').single()
  if (error) throw new Error(error.message)

  const anexo = await enviarAnexo(supabase, empresaId, novo.id, fd)
  if (anexo) await supabase.from('itens').update(anexo).eq('id', novo.id)

  await supabase
    .from('itens')
    .update({ status: 'renovado', finalizado_em: new Date().toISOString() })
    .eq('id', id).eq('empresa_id', empresaId)

  if (atual.google_event_id) {
    await semFalhar(() => finalizarEvento(empresaId, atual.google_event_id, 'Renovado', atual.titulo))
  }
  await sincronizar(supabase, empresaId, novo.id)
  revalidatePath('/')
  redirect(`/?f=todos&${qsToast(`${atual.titulo} renovado`, `Próximo vencimento em ${fmtData(novoVenc)}.`)}`)
}

export async function concluirItem(fd: FormData) {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const id = txt(fd, 'id')
  const { data: atual } = await supabase
    .from('itens').select('titulo, google_event_id').eq('id', id).eq('empresa_id', ctx.empresa.id).single()
  await supabase
    .from('itens')
    .update({ status: 'concluido', finalizado_em: new Date().toISOString() })
    .eq('id', id).eq('empresa_id', ctx.empresa.id)
  if (atual?.google_event_id) {
    await semFalhar(() => finalizarEvento(ctx.empresa.id, atual.google_event_id, 'Concluído', atual.titulo))
  }
  revalidatePath('/')
  redirect(`/?${qsToast(`${atual?.titulo ?? 'Item'} concluído`, 'Ele saiu da lista e não terá mais lembretes.')}`)
}

export async function reabrirItem(fd: FormData) {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const id = txt(fd, 'id')
  const { data: atual } = await supabase.from('itens').select('tipo').eq('id', id).eq('empresa_id', ctx.empresa.id).single()
  await supabase
    .from('itens')
    .update({ status: 'ativo', finalizado_em: null })
    .eq('id', id).eq('empresa_id', ctx.empresa.id)
  await sincronizar(supabase, ctx.empresa.id, id)
  revalidatePath('/')
  const acomp = atual?.tipo === ACOMPANHAMENTO
  redirect(`/itens/${id}?${qsToast(acomp ? 'Acompanhamento reaberto' : 'Vencimento reaberto', 'Os lembretes voltaram a ficar ativos.')}`)
}

export async function excluirItem(fd: FormData) {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const id = txt(fd, 'id')
  const { data: atual } = await supabase
    .from('itens').select('titulo, tipo, google_event_id, anexo_path').eq('id', id).eq('empresa_id', ctx.empresa.id).single()
  if (atual?.google_event_id) await semFalhar(() => removerEvento(ctx.empresa.id, atual.google_event_id))
  if (atual?.anexo_path) await supabase.storage.from('anexos').remove([atual.anexo_path])
  await supabase.from('itens').delete().eq('id', id).eq('empresa_id', ctx.empresa.id)
  revalidatePath('/')
  const destino = atual?.tipo === ACOMPANHAMENTO ? '/acompanhamentos' : '/'
  redirect(`${destino}?${qsToast(`${atual?.titulo ?? 'Item'} excluído`, undefined, 'info')}`)
}

/* ---------- Acompanhamentos (retornos e cobranças) ---------- */

const dataValida = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)

export async function salvarAcompanhamento(fd: FormData) {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const empresaId = ctx.empresa.id
  const id = txt(fd, 'id')
  const titulo = txt(fd, 'titulo')
  const quando = txt(fd, 'vencimento')
  if (!titulo || !dataValida(quando)) throw new Error('Informe o que fazer e quando lembrar.')

  const campos = {
    titulo,
    tipo: ACOMPANHAMENTO,
    descricao: txt(fd, 'descricao') || null,
    vencimento: quando,
    recorrencia_meses: null,
    antecedencia_dias: 0,
    cliente_id: await resolverCliente(supabase, empresaId, fd),
  }

  let itemId = id
  if (id) {
    const { error } = await supabase.from('itens').update(campos).eq('id', id).eq('empresa_id', empresaId)
    if (error) throw new Error(error.message)
  } else {
    const { data, error } = await supabase
      .from('itens').insert({ ...campos, empresa_id: empresaId, created_by: ctx.userId }).select('id').single()
    if (error) throw new Error(error.message)
    itemId = data.id
  }
  await sincronizar(supabase, empresaId, itemId)
  revalidatePath('/')
  revalidatePath('/acompanhamentos')
  redirect(id
    ? `/itens/${itemId}?${qsToast('Alterações salvas', `Lembrete em ${fmtDiaSemana(quando)}.`)}`
    : `/acompanhamentos?${qsToast('Acompanhamento salvo', `Você recebe o lembrete ${quando === hojeISO() ? 'hoje' : `em ${fmtDiaSemana(quando)}`}, no e-mail das 7h.`)}`)
}

export async function adiarAcompanhamento(fd: FormData) {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const empresaId = ctx.empresa.id
  const id = txt(fd, 'id')
  const dias = Number(txt(fd, 'dias'))
  const data = txt(fd, 'data')
  const nova = dataValida(data) ? data : dias > 0 ? somarDias(hojeISO(), dias) : ''
  if (!nova) throw new Error('Escolha para quando adiar.')

  const { data: atual } = await supabase
    .from('itens').select('titulo, adiamentos').eq('id', id).eq('empresa_id', empresaId).single()
  if (!atual) throw new Error('Acompanhamento não encontrado')
  await supabase
    .from('itens')
    .update({ vencimento: nova, status: 'ativo', finalizado_em: null, adiamentos: (atual.adiamentos ?? 0) + 1 })
    .eq('id', id).eq('empresa_id', empresaId)
  await sincronizar(supabase, empresaId, id)
  revalidatePath('/')
  revalidatePath('/acompanhamentos')
  redirect(`/acompanhamentos?${qsToast(`${atual.titulo} adiado`, `Novo lembrete em ${fmtDiaSemana(nova)}.`)}`)
}

export async function resolverAcompanhamento(fd: FormData) {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const id = txt(fd, 'id')
  const { data: atual } = await supabase
    .from('itens').select('titulo, google_event_id').eq('id', id).eq('empresa_id', ctx.empresa.id).single()
  await supabase
    .from('itens')
    .update({ status: 'concluido', finalizado_em: new Date().toISOString() })
    .eq('id', id).eq('empresa_id', ctx.empresa.id)
  if (atual?.google_event_id) {
    await semFalhar(() => finalizarEvento(ctx.empresa.id, atual.google_event_id, 'Resolvido', atual.titulo))
  }
  revalidatePath('/')
  revalidatePath('/acompanhamentos')
  redirect(`/acompanhamentos?${qsToast(`${atual?.titulo ?? 'Acompanhamento'} resolvido`, 'Ele saiu da lista e não terá mais lembretes.')}`)
}
