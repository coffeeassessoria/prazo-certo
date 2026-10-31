'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { qsToast } from '@/lib/toast'
import type { Resultado } from '@/lib/usuarios'

async function gravar(
  fd: FormData,
  tabela: 'unidades' | 'ambientes' | 'equipamentos',
): Promise<{ url: string } | { ok: false; msg: string }> {
  const ctx = await exigirEmpresa(),
    supabase = await createClient(),
    txt = (k: string) => String(fd.get(k) ?? '').trim()
  const id = txt('id'),
    unidade = txt('unidade_id')
  const campos: Record<string, unknown> = { empresa_id: ctx.empresa.id }
  const chaves =
    tabela === 'unidades'
      ? [
          'cliente_id',
          'nome',
          'endereco',
          'representante_nome',
          'representante_documento',
          'representante_papel',
          'representante_endereco',
          'representante_contato',
        ]
      : tabela === 'ambientes'
        ? ['unidade_id', 'nome', 'atividade']
        : [
            'unidade_id',
            'ambiente_id',
            'tag',
            'tipo',
            'marca',
            'modelo',
            'serie',
            'observacoes',
          ]
  for (const chave of chaves) campos[chave] = txt(chave)
  for (const chave of tabela === 'ambientes'
    ? ['area_m2', 'ocupantes_fixos', 'ocupantes_flutuantes']
    : tabela === 'equipamentos'
      ? ['capacidade_btu']
      : []) {
    const valor = txt(chave),
      n = Number(valor)
    if (
      valor &&
      (!Number.isFinite(n) ||
        n < 0 ||
        (['area_m2', 'capacidade_btu'].includes(chave) && n <= 0) ||
        (chave.startsWith('ocupantes') && !Number.isInteger(n)))
    )
      return {
        ok: false,
        msg: 'Confira os números: área e capacidade devem ser positivas; ocupação deve ser um número inteiro a partir de zero.',
      }
    campos[chave] = valor ? n : null
  }
  const query = id
    ? supabase
        .from(tabela)
        .update(campos)
        .eq('id', id)
        .eq('empresa_id', ctx.empresa.id)
    : supabase.from(tabela).insert(campos)
  const { data, error } = await query.select('id').single()
  if (error)
    return {
      ok: false,
      msg:
        error.code === '23505'
          ? 'Já existe um equipamento com esta identificação nesta unidade.'
          : 'Não foi possível salvar. Confira os campos e os vínculos com cliente, unidade e ambiente da sua empresa.',
    }
  revalidatePath('/unidades')
  revalidatePath(`/unidades/${unidade || data.id}`)
  return {
    url: `/unidades/${tabela === 'unidades' ? data.id : unidade}?${qsToast(id ? 'Cadastro atualizado' : 'Cadastro salvo')}`,
  }
}
export async function salvarUnidade(
  _prev: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const r = await gravar(fd, 'unidades')
  if ('ok' in r) return r
  redirect(r.url)
}
export async function salvarAmbiente(
  _prev: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const r = await gravar(fd, 'ambientes')
  if ('ok' in r) return r
  redirect(r.url)
}
export async function salvarEquipamento(
  _prev: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const r = await gravar(fd, 'equipamentos')
  if ('ok' in r) return r
  redirect(r.url)
}
