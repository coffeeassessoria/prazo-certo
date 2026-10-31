import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PDFDocument, PDFDict, PDFName } from 'pdf-lib'
import sharp from 'sharp'
import { normalizarLogo } from '../lib/documentos/logo'
import { gerarPdfPmoc } from '../lib/documentos/pmoc'
import { fmtInstante } from '../lib/datas'
import { exemploPmoc } from '../lib/pmoc-demo'

test('instantes respeitam a data local na virada UTC', () => {
  assert.match(fmtInstante('2026-10-31T01:00:00Z'), /30\/10\/2026/)
})

test('logo: valida conteúdo real e limita tamanho sem distorcer', async () => {
  const original = await sharp({
    create: { width: 1600, height: 400, channels: 3, background: '#155179' },
  })
    .jpeg()
    .toBuffer()
  const png = await normalizarLogo(original),
    m = await sharp(png).metadata()
  assert.equal(m.format, 'png')
  assert.equal(m.width, 1000)
  assert.equal(m.height, 250)
  await assert.rejects(
    normalizarLogo(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
      ),
    ),
    /PNG, JPG ou WebP/,
  )
  await assert.rejects(
    normalizarLogo(Buffer.alloc(2 * 1024 * 1024 + 1)),
    /2 MB/,
  )
  await assert.rejects(
    normalizarLogo(Buffer.from('não é uma imagem')),
    /PNG, JPG ou WebP/,
  )
})
test('PDF: timbrado A4, logo em todas as páginas e projeto anexado', async () => {
  const logo = await sharp({
    create: { width: 400, height: 100, channels: 3, background: '#155179' },
  })
    .png()
    .toBuffer()
  const projeto = await PDFDocument.create()
  projeto.addPage([1000, 700])
  const s = exemploPmoc()
  s.plano.observacoes =
    'Observação técnica longa para testar continuidade. '.repeat(250)
  const bytes = await gerarPdfPmoc(s, logo, await projeto.save()),
    pdf = await PDFDocument.load(bytes)
  assert.ok(pdf.getPageCount() >= 4)
  for (const p of pdf.getPages()) {
    const z = p.getSize()
    assert.ok(Math.abs(z.width - 595.28) < 0.01)
    assert.ok(Math.abs(z.height - 841.89) < 0.01)
    const imagens = p.node.Resources()?.lookup(PDFName.of('XObject'), PDFDict)
    assert.ok(imagens && imagens.keys().length > 0)
  }
  assert.equal(pdf.getAuthor(), s.identidade.nome)
  assert.ok(pdf.catalog.has(PDFName.of('Names')))
})
