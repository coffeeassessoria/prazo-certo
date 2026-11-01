import { MAX_FOTO_BYTES, MAX_ORIGINAL_BYTES } from "./modelo";
/** O canvas aplica a orientação da foto decodificada e remove seus metadados. */
export async function comprimirFoto(arquivo: File): Promise<Blob> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(arquivo.type) ||
    arquivo.size > MAX_ORIGINAL_BYTES
  )
    throw new Error(
      "Escolha JPG, PNG ou WebP de até 12 MB. Para HEIC, exporte em JPG.",
    );
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (img.naturalWidth * img.naturalHeight > 60_000_000)
      throw new Error("A imagem é grande demais. Exporte uma versão menor.");
    const c = document.createElement("canvas");
    const escala = Math.min(
      1,
      1600 / Math.max(img.naturalWidth, img.naturalHeight),
    );
    c.width = Math.max(1, Math.round(img.naturalWidth * escala));
    c.height = Math.max(1, Math.round(img.naturalHeight * escala));
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Não foi possível preparar esta foto.");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    for (const qualidade of [0.82, 0.7, 0.55, 0.4]) {
      const blob = await new Promise<Blob | null>((r) =>
        c.toBlob(r, "image/jpeg", qualidade),
      );
      if (blob && blob.size <= MAX_FOTO_BYTES) return blob;
    }
    throw new Error(
      "Não foi possível reduzir esta foto para 600 KB. Escolha uma versão menor.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
