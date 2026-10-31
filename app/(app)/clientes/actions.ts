'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { qsToast } from '@/lib/toast'

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim() || null

export async function salvarCliente(fd: FormData) {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const id = txt(fd, 'id')
  const campos = {
    nome: txt(fd, 'nome'),
    documento: txt(fd, 'documento'),
    contato: txt(fd, 'contato'),
    telefone: txt(fd, 'telefone'),
    email: txt(fd, 'email'),
    endereco: txt(fd, 'endereco'),
    observacoes: txt(fd, 'observacoes'),
  }
  if (!campos.nome) throw new Error('Informe o nome do cliente')
  if (id) await supabase.from('clientes').update(campos).eq('id', id).eq('empresa_id', ctx.empresa.id)
  else await supabase.from('clientes').insert({ ...campos, empresa_id: ctx.empresa.id })
  revalidatePath('/clientes')
  redirect(`/clientes?${qsToast(id ? 'Cliente atualizado' : `${campos.nome} cadastrado`, id ? undefined : 'Agora você pode cadastrar os vencimentos dele.')}`)
}

export async function excluirCliente(fd: FormData) {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const { error } = await supabase.from('clientes').delete().eq('id', String(fd.get('id'))).eq('empresa_id', ctx.empresa.id)
  revalidatePath('/clientes')
  if (error) redirect(`/clientes?${qsToast('Cliente não excluído', error.code === '23503' ? 'Este cliente possui unidades ou planos vinculados. Preserve o cadastro e seu histórico.' : 'Não foi possível excluir o cliente. Tente novamente.', 'info')}`)
  redirect(`/clientes?${qsToast('Cliente excluído', 'Os vencimentos dele continuam, agora sem cliente.', 'info')}`)
}
