import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gerarPdfPmoc } from '@/lib/documentos/pmoc'
import { exemploPmoc } from '@/lib/pmoc-demo'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  // Arquivo do próprio projeto; nunca recebe URL ou caminho do visitante.
  const logo = await readFile(
    join(process.cwd(), 'public', 'demo', 'logo-climatech.png'),
  )
  const pdf = await gerarPdfPmoc(exemploPmoc(), logo)
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="PMOC-demonstracao-A4.pdf"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
