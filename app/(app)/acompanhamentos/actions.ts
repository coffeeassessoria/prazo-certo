'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { finalizarEvento, semFalhar, sincronizarEvento } from '@/lib/google'
import { qsToast } from '@/lib/toast'
import { CATEGORIAS, ETAPAS, dataReal, encerrada, type ResultadoDemanda } from '@/lib/demandas'

const texto = (fd: FormData, chave: string) => String(fd.get(chave) ?? '').trim()

async function gravar(fd: FormData, contato: boolean): Promise<{ id: string } | { erro: string }> {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const id = texto(fd, 'id') || null
  const etapa = texto(fd, 'etapa_demanda')
  if (!(etapa in ETAPAS)) return { erro: 'Escolha a situação da demanda.' }
  const dados: Record<string, string | null | boolean> = { etapa_demanda: etapa }
  if (!contato || !encerrada(etapa)) {
    const retorno = texto(fd, 'vencimento')
    const acao = texto(fd, 'proxima_acao')
    if (!dataReal(retorno)) return { erro: 'Escolha uma data válida para o próximo retorno.' }
    if (!acao || acao.length > 240) return { erro: 'Descreva a próxima ação com até 240 caracteres.' }
    dados.vencimento = retorno
    dados.proxima_acao = acao
  }
  if (!contato) {
    const titulo = texto(fd, 'titulo')
    const categoria = texto(fd, 'categoria_demanda')
    if (!titulo || titulo.length > 180) return { erro: 'Escreva um título com até 180 caracteres.' }
    if (!(categoria in CATEGORIAS)) return { erro: 'Escolha o tipo da demanda.' }
    if (!texto(fd, 'responsavel_id')) return { erro: 'Escolha quem vai cuidar desta demanda.' }
    Object.assign(dados, {
      titulo, categoria_demanda: categoria, descricao: texto(fd, 'descricao') || null,
      responsavel_id: texto(fd, 'responsavel_id'), cliente_id: texto(fd, 'cliente_id') || null,
      vinculo_item_id: texto(fd, 'vinculo_item_id') || null,
    })
  }
  const nota = texto(fd, 'nota')
  if (contato && (!id || !nota)) return { erro: 'Conte o que aconteceu no contato para continuar.' }
  if (nota.length > 4000) return { erro: 'Use até 4000 caracteres no contato.' }
  if (contato) dados.nota_obrigatoria = true
  const { data, error } = await supabase.rpc('salvar_demanda', { p_id: id, p_dados: dados, p_nota: nota || null })
  if (error) {
    console.error('Falha ao salvar demanda', error.code)
    return { erro: error.code === 'P0001' ? error.message : 'Não foi possível salvar. Tente novamente; se persistir, peça ao administrador para conferir a atualização do banco.' }
  }
  const { data: item } = await supabase.from('itens')
    .select('id,titulo,tipo,vencimento,antecedencia_dias,descricao,google_event_id,status,clientes(nome)')
    .eq('empresa_id', ctx.empresa.id).eq('id', data).single()
  if (item) {
    if (item.status === 'ativo') {
      const cli: any = item.clientes
      const evento = await semFalhar(() => sincronizarEvento(ctx.empresa.id, {
        ...item, cliente_nome: (Array.isArray(cli) ? cli[0]?.nome : cli?.nome) ?? null,
      }))
      if (evento) await supabase.from('itens').update({ google_event_id: evento })
        .eq('empresa_id', ctx.empresa.id).eq('id', data)
    } else if (item.google_event_id) {
      await semFalhar(() => finalizarEvento(ctx.empresa.id, item.google_event_id!, ETAPAS[etapa as keyof typeof ETAPAS], item.titulo))
    }
  }
  revalidatePath('/')
  revalidatePath('/acompanhamentos')
  revalidatePath(`/itens/${data}`)
  return { id: data as string }
}

export async function salvarDemanda(_prev: ResultadoDemanda, fd: FormData): Promise<ResultadoDemanda> {
  const resultado = await gravar(fd, false)
  if ('erro' in resultado) return resultado
  redirect(`/itens/${resultado.id}?${qsToast('Demanda salva', 'O responsável e a próxima ação ficaram registrados.')}`)
}

export async function registrarContato(_prev: ResultadoDemanda, fd: FormData): Promise<ResultadoDemanda> {
  const resultado = await gravar(fd, true)
  if ('erro' in resultado) return resultado
  redirect(`/itens/${resultado.id}?${qsToast('Contato registrado', 'O histórico e a situação da demanda foram atualizados.')}`)
}
