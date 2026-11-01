import sharp from "sharp";
import { createHash } from "node:crypto";
import { MAX_FOTO_BYTES } from "./modelo";
/** Revalida o conteúdo; nunca conserva EXIF/GPS, SVG, animações ou o original. */
export async function otimizarFoto(entrada: Uint8Array) {
  if (!entrada.byteLength || entrada.byteLength > MAX_FOTO_BYTES)
    throw new Error("A foto deve ser otimizada antes do envio (até 600 KB).");
  const imagem = sharp(entrada, {
    limitInputPixels: 20_000_000,
    failOn: "warning",
  });
  const m = await imagem.metadata();
  if (!["jpeg", "png", "webp"].includes(m.format || "") || (m.pages || 1) !== 1)
    throw new Error("Use uma foto JPG, PNG ou WebP sem animação.");
  let foto = await imagem
    .autoOrient()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "white" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  if (foto.length > MAX_FOTO_BYTES)
    foto = await sharp(foto)
      .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 65, mozjpeg: true })
      .toBuffer();
  if (foto.length > MAX_FOTO_BYTES)
    throw new Error("Reduza a foto e tente novamente.");
  const miniatura = await sharp(foto)
    .resize(320, 320, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 65 })
    .toBuffer();
  const meta = await sharp(foto).metadata();
  return {
    foto,
    miniatura,
    sha256: createHash("sha256").update(foto).digest("hex"),
    bytes: foto.length + miniatura.length,
    largura: meta.width!,
    altura: meta.height!,
  };
}

/** Cópia para o A4: mantém o PDF abaixo do limite de resposta da hospedagem. A foto maior continua privada no bucket. */
export async function fotoParaPdf(entrada: Uint8Array) {
  for (const [tamanho, qualidade] of [
    [1000, 75],
    [850, 65],
    [700, 55],
    [550, 45],
  ]) {
    const imagem = await sharp(entrada, { limitInputPixels: 3_000_000 })
      .resize(tamanho, tamanho, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: qualidade, mozjpeg: true })
      .toBuffer();
    if (imagem.length <= 140000) return imagem;
  }
  throw new Error("Não foi possível preparar a imagem para o PDF.");
}
