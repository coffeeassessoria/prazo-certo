import sharp from 'sharp'

/** Decodifica o conteúdo real, limita pixels e remove metadados; não aceita SVG. */
export async function normalizarLogo(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > 2 * 1024 * 1024)
    throw new Error('Envie um logo de até 2 MB.')
  try {
    const imagem = sharp(bytes, {
      limitInputPixels: 12_000_000,
      animated: false,
    })
    const info = await imagem.metadata()
    if (!['png', 'jpeg', 'webp'].includes(info.format ?? ''))
      throw new Error('formato')
    if (!info.width || !info.height || (info.pages ?? 1) > 1)
      throw new Error('dimensões')
    return await imagem
      .rotate()
      .resize({
        width: 1000,
        height: 400,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer()
  } catch {
    throw new Error(
      'Use um logo PNG, JPG ou WebP válido, com até 12 milhões de pixels.',
    )
  }
}
