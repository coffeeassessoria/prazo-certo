'use server'
import { revalidatePath } from 'next/cache'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { normalizarLogo } from '@/lib/documentos/logo'
import type { Resultado } from '@/lib/usuarios'

export async function salvarIdentidade(
  _prev: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const ctx = await exigirEmpresa()
  if (ctx.papel !== 'admin' && !ctx.superadmin)
    return {
      ok: false,
      msg: 'Peça ao administrador da empresa para alterar o timbrado.',
    }
  const supabase = await createClient()
  const texto = (k: string) => String(fd.get(k) ?? '').trim()
  const dados = {
    nome: texto('nome'),
    documento: texto('documento'),
    endereco: texto('endereco'),
    telefone: texto('telefone'),
    email: texto('email'),
  }
  if (!dados.nome || dados.nome.length > 160)
    return {
      ok: false,
      msg: 'Informe o nome da empresa com até 160 caracteres.',
    }
  if (
    dados.documento.length > 40 ||
    dados.endereco.length > 500 ||
    dados.telefone.length > 80 ||
    dados.email.length > 160
  )
    return { ok: false, msg: 'Confira o tamanho dos dados do timbrado.' }
  const { data: anterior, error: erroLeitura } = await supabase
    .from('documento_identidades')
    .select('logo_path')
    .eq('empresa_id', ctx.empresa.id)
    .maybeSingle()
  if (erroLeitura)
    return {
      ok: false,
      msg: 'Não foi possível abrir o timbrado atual. Confira a atualização do banco.',
    }
  let logo_path: string | null = anterior?.logo_path ?? null
  const arquivo = fd.get('logo')
  if (arquivo instanceof File && arquivo.size) {
    if (arquivo.size > 2 * 1024 * 1024)
      return { ok: false, msg: 'Envie um logo de até 2 MB.' }
    try {
      const png = await normalizarLogo(
        new Uint8Array(await arquivo.arrayBuffer()),
      )
      logo_path = `${ctx.empresa.id}/logos/${crypto.randomUUID()}.png`
      const { error } = await supabase.storage
        .from('identidades')
        .upload(logo_path, png, { contentType: 'image/png', upsert: false })
      if (error)
        return {
          ok: false,
          msg: 'Não foi possível enviar o logo. Confira a atualização do banco e tente novamente.',
        }
    } catch (e) {
      return {
        ok: false,
        msg: e instanceof Error ? e.message : 'Não foi possível ler o logo.',
      }
    }
  }
  const { error } = await supabase
    .from('documento_identidades')
    .upsert({
      empresa_id: ctx.empresa.id,
      ...dados,
      logo_path,
      updated_at: new Date().toISOString(),
    })
  if (error)
    return {
      ok: false,
      msg: 'Não foi possível salvar o timbrado. Confira os campos e a atualização do banco.',
    }
  revalidatePath('/config/documentos')
  return {
    ok: true,
    msg: 'Timbrado salvo. Os próximos PDFs usarão esta identidade; versões anteriores serão preservadas.',
  }
}
export async function removerLogo(
  _prev: Resultado,
  _fd: FormData,
): Promise<Resultado> {
  const ctx = await exigirEmpresa()
  if (ctx.papel !== 'admin' && !ctx.superadmin)
    return { ok: false, msg: 'Apenas o administrador pode alterar o logo.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('documento_identidades')
    .update({ logo_path: null, updated_at: new Date().toISOString() })
    .eq('empresa_id', ctx.empresa.id)
  if (error)
    return { ok: false, msg: 'Não foi possível remover o logo do timbrado.' }
  revalidatePath('/config/documentos')
  return {
    ok: true,
    msg: 'Os próximos PDFs usarão somente o nome da empresa. Documentos anteriores continuam com o logo original.',
  }
}
