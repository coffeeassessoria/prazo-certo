import { writeFile, mkdir } from 'node:fs/promises'
import sharp from 'sharp'
import { gerarPdfPmoc } from '../lib/documentos/pmoc'
import { exemploPmoc } from '../lib/pmoc-demo'

async function main() {
  const destino = process.argv[2]
  if (!destino) throw new Error('Informe o caminho de saída do PDF.')
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="170" viewBox="0 0 420 170"><rect x="8" y="8" width="145" height="145" rx="25" fill="#155179"/><path d="M39 80L66 106L119 51" fill="none" stroke="#fff" stroke-width="14"/><text x="175" y="77" font-family="Arial,sans-serif" font-size="36" font-weight="700" fill="#155179">ClimaTech</text><text x="175" y="108" font-family="Arial,sans-serif" font-size="18" fill="#4b5563">DEMONSTRAÇÃO</text></svg>'
  const logo = await sharp(Buffer.from(svg)).png().toBuffer()
  await mkdir('public/demo', { recursive: true })
  await writeFile('public/demo/logo-climatech.png', logo)
  const bytes = await gerarPdfPmoc(exemploPmoc(), logo)
  await writeFile(destino, bytes)
  console.log(`PDF de demonstração gerado (${bytes.length} bytes).`)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
