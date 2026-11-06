'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { qsToast } from '@/lib/toast'

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim() || null
const data = (fd: FormData, k: string) => { const v = txt(fd, k); return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null }

export async function salvarColaborador(fd: FormData) {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const id = txt(fd, 'id')
  const campos = {
    nome: txt(fd, 'nome'),
    funcao: txt(fd, 'funcao'),
    cpf: txt(fd, 'cpf'),
    rg: txt(fd, 'rg'),
    data_nascimento: data(fd, 'data_nascimento'),
    data_admissao: data(fd, 'data_admissao'),
    telefone: txt(fd, 'telefone'),
    email: txt(fd, 'email'),
    observacoes: txt(fd, 'observacoes'),
  }
  if (!campos.nome) throw new Error('Informe o nome do colaborador')
  const { error } = id
    ? await supabase.from('colaboradores').update(campos).eq('id', id).eq('empresa_id', ctx.empresa.id)
    : await supabase.from('colaboradores').insert({ ...campos, empresa_id: ctx.empresa.id })
  if (error) throw new Error('Não foi possível salvar o colaborador. Tente novamente.')
  revalidatePath('/colaboradores')
  redirect(`/colaboradores?${qsToast(id ? 'Colaborador atualizado' : `${campos.nome} cadastrado`, id ? undefined : 'Ele já aparece na lista ao cadastrar um vencimento.')}`)
}

export async function excluirColaborador(fd: FormData) {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  await supabase.from('colaboradores').delete().eq('id', String(fd.get('id'))).eq('empresa_id', ctx.empresa.id)
  revalidatePath('/colaboradores')
  redirect(`/colaboradores?${qsToast('Colaborador excluído', 'Os documentos dele continuam, agora sem vínculo.', 'info')}`)
}
