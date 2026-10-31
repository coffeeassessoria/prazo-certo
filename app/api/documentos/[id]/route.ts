import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
export const runtime = 'nodejs'
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await exigirEmpresa(),
    supabase = await createClient(),
    { id } = await params
  const { data } = await supabase
    .from('pmoc_versoes')
    .select('arquivo_path,numero,snapshot')
    .eq('id', id)
    .eq('empresa_id', ctx.empresa.id)
    .eq('arquivo_status', 'pronto')
    .maybeSingle()
  if (!data)
    return Response.json({ erro: 'Documento não encontrado.' }, { status: 404 })
  if (!data.arquivo_path.startsWith(`${ctx.empresa.id}/`))
    return Response.json({ erro: 'Documento indisponível.' }, { status: 404 })
  const { data: arquivo, error } = await supabase.storage
    .from('documentos')
    .download(data.arquivo_path)
  if (error || !arquivo)
    return Response.json(
      { erro: 'Não foi possível baixar o documento. Tente novamente.' },
      { status: 503 },
    )
  return new Response(new Uint8Array(await arquivo.arrayBuffer()), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="PMOC-v${data.numero}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
