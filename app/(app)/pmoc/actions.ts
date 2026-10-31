'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createHash } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { qsToast } from '@/lib/toast'
import { gerarPdfPmoc } from '@/lib/documentos/pmoc'
import { PLANO_VAZIO, type DadosPlano, type SnapshotPmoc } from '@/lib/pmoc'
import { dataReal } from '@/lib/demandas'
import type { Resultado } from '@/lib/usuarios'

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
export async function salvarPlano(
  _prev: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const ctx = await exigirEmpresa(),
    supabase = await createClient(),
    id = txt(fd, 'id') || crypto.randomUUID()
  const dados = { ...PLANO_VAZIO } as DadosPlano
  for (const chave of Object.keys(PLANO_VAZIO).filter(
    (k) => k !== 'rotinas',
  ) as (keyof Omit<DadosPlano, 'rotinas'>)[])
    dados[chave] = txt(fd, chave)
  try {
    const rotinas = JSON.parse(txt(fd, 'rotinas'))
    if (
      !Array.isArray(rotinas) ||
      rotinas.some(
        (r) =>
          !r ||
          ['id', 'aplicacao', 'atividade', 'periodicidade'].some(
            (k) => typeof r[k] !== 'string',
          ),
      )
    )
      throw new Error()
    dados.rotinas = rotinas.map((r) => ({
      id: r.id.trim(),
      aplicacao: r.aplicacao.trim(),
      atividade: r.atividade.trim(),
      periodicidade: r.periodicidade.trim(),
    }))
  } catch {
    return { ok: false, msg: 'Confira a lista de atividades do plano.' }
  }
  if (!dados.titulo || dados.titulo.length > 180)
    return { ok: false, msg: 'Informe um título com até 180 caracteres.' }
  if (
    dados.rotinas.length > 100 ||
    dados.rotinas.some(
      (r) =>
        !r.id ||
        r.id.length > 80 ||
        !r.atividade ||
        r.atividade.length > 1500 ||
        !r.aplicacao ||
        r.aplicacao.length > 300 ||
        r.periodicidade.length > 200,
    )
  )
    return {
      ok: false,
      msg: 'Preencha aplicação e atividade em cada linha; use até 100 atividades.',
    }
  for (const valor of [dados.inicio, dados.revisao_em])
    if (valor && !dataReal(valor))
      return { ok: false, msg: 'Confira as datas do plano.' }
  if (dados.inicio && dados.revisao_em && dados.revisao_em < dados.inicio)
    return {
      ok: false,
      msg: 'A próxima revisão deve ser igual ou posterior ao início do plano.',
    }
  const { data: atual, error: erroAtual } = await supabase
    .from('pmoc_planos')
    .select('dados')
    .eq('empresa_id', ctx.empresa.id)
    .eq('id', id)
    .maybeSingle()
  if (erroAtual)
    return {
      ok: false,
      msg: 'Não foi possível abrir o plano. Confira a atualização do banco.',
    }
  dados.projeto_path = atual?.dados?.projeto_path ?? null
  const projeto = fd.get('projeto')
  if (projeto instanceof File && projeto.size) {
    if (projeto.size > 10 * 1024 * 1024)
      return { ok: false, msg: 'Envie um projeto PDF de até 10 MB.' }
    try {
      const bytes = new Uint8Array(await projeto.arrayBuffer())
      await PDFDocument.load(bytes, { ignoreEncryption: false })
      const path = `${ctx.empresa.id}/projetos/${crypto.randomUUID()}.pdf`
      const { error } = await supabase.storage
        .from('documentos')
        .upload(path, bytes, { contentType: 'application/pdf', upsert: false })
      if (error) throw new Error()
      dados.projeto_path = path
    } catch {
      return {
        ok: false,
        msg: 'Não foi possível enviar o projeto. Use um PDF válido, sem senha, e tente novamente.',
      }
    }
  }
  const { data, error } = await supabase.rpc('salvar_pmoc', {
    p_id: id,
    p_unidade: txt(fd, 'unidade_id'),
    p_dados: dados,
  })
  if (error)
    return {
      ok: false,
      msg:
        error.code === 'P0001'
          ? error.message
          : 'Não foi possível salvar o plano. Confira os dados e tente novamente.',
    }
  revalidatePath('/pmoc')
  revalidatePath(`/pmoc/${data}`)
  redirect(
    `/pmoc/${data}?${qsToast('Plano salvo', 'Os PDFs já emitidos mantêm os dados da versão original.')}`,
  )
}
export async function registrarExecucao(
  _prev: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const ctx = await exigirEmpresa(),
    supabase = await createClient(),
    id = txt(fd, 'plano_id')
  if (!dataReal(txt(fd, 'data_execucao')))
    return { ok: false, msg: 'Informe uma data de execução válida.' }
  const { error } = await supabase.rpc('registrar_execucao_pmoc', {
    p_plano: id,
    p_rotina: txt(fd, 'rotina_id'),
    p_equipamento: txt(fd, 'equipamento_id') || null,
    p_data: txt(fd, 'data_execucao'),
    p_executado: txt(fd, 'executado_por'),
    p_aprovado: txt(fd, 'aprovado_por'),
    p_relato: txt(fd, 'relato'),
  })
  if (error)
    return {
      ok: false,
      msg:
        error.code === 'P0001'
          ? error.message
          : 'Não foi possível registrar a execução. Confira os campos e tente novamente.',
    }
  revalidatePath(`/pmoc/${id}`)
  return {
    ok: true,
    msg: 'Execução registrada. Ela será incluída nas próximas versões do PDF.',
  }
}
export async function emitirPmoc(
  _prev: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const ctx = await exigirEmpresa(),
    supabase = await createClient(),
    id = txt(fd, 'plano_id'),
    estado = txt(fd, 'estado')
  const { data: reserva, error } = await supabase.rpc('reservar_pmoc_pdf', {
    p_plano: id,
    p_estado: estado,
    p_revisado: fd.get('revisado') === 'on',
  })
  if (error)
    return {
      ok: false,
      msg:
        error.code === 'P0001'
          ? error.message
          : 'Não foi possível preparar esta versão do PDF. Confira a atualização do banco.',
    }
  const versao = Array.isArray(reserva) ? reserva[0] : reserva
  try {
    if (!versao || versao.empresa_id !== ctx.empresa.id)
      throw new Error('reserva inválida')
    const s = versao.snapshot as SnapshotPmoc
    const baixar = async (bucket: string, path: string | null | undefined) => {
      if (!path) return undefined
      if (!path.startsWith(`${ctx.empresa.id}/`))
        throw new Error('anexo inválido')
      const { data, error } = await supabase.storage.from(bucket).download(path)
      if (error || !data) throw new Error('anexo indisponível')
      return new Uint8Array(await data.arrayBuffer())
    }
    const [logo, projeto] = await Promise.all([
      baixar('identidades', s.identidade.logo_path),
      baixar('documentos', s.plano.projeto_path),
    ])
    const bytes = await gerarPdfPmoc(s, logo, projeto)
    const { error: upload } = await supabase.storage
      .from('documentos')
      .upload(versao.arquivo_path, bytes, {
        contentType: 'application/pdf',
        upsert: false,
      })
    if (upload) throw upload
    const { error: finalizacao } = await supabase.rpc('finalizar_pmoc_pdf', {
      p_versao: versao.id,
      p_sha256: createHash('sha256').update(bytes).digest('hex'),
    })
    if (finalizacao) throw finalizacao
  } catch {
    if (versao?.id)
      await supabase.rpc('finalizar_pmoc_pdf', {
        p_versao: versao.id,
        p_sha256: null,
      })
    revalidatePath(`/pmoc/${id}`)
    return {
      ok: false,
      msg: 'A geração não foi concluída. Confira o logo, o anexo do projeto e o armazenamento; tente gerar uma nova versão.',
    }
  }
  revalidatePath(`/pmoc/${id}`)
  redirect(
    `/pmoc/${id}?${qsToast('PDF gerado', `Versão ${versao.numero} disponível para baixar.`)}`,
  )
}
