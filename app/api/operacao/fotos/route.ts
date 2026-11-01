import { acesso, erroApi, Falha, json } from "@/lib/operacao/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { otimizarFoto } from "@/lib/relatorios/imagens";
import {
  caminhosFoto,
  excluirFotoSemUso,
} from "@/lib/relatorios/armazenamento";
import { MAX_FOTO_BYTES } from "@/lib/relatorios/modelo";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid = (s: string | null): s is string =>
  !!s &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export async function POST(request: Request) {
  try {
    const { usuario } = await acesso(request);
    if (
      request.headers.get("x-pc-usuario") !== usuario.id ||
      request.headers.get("x-pc-empresa") !== usuario.empresa_id
    )
      throw new Falha("Entre na conta de origem para enviar estas fotos.", 403);
    const q = new URL(request.url).searchParams,
      id = q.get("id"),
      servico = q.get("servico");
    if (!uuid(id) || !uuid(servico))
      throw new Falha("Identifique a foto e o serviço.");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        request.headers.get("content-type") || "",
      )
    )
      throw new Falha("Envie uma foto JPG, PNG ou WebP.", 415);
    const reader = request.body?.getReader();
    if (!reader) throw new Falha("Escolha uma foto.");
    let bytes = 0;
    const partes: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > MAX_FOTO_BYTES) {
        await reader.cancel();
        throw new Falha(
          "Foto acima de 600 KB. Escolha novamente para otimizar.",
          413,
        );
      }
      partes.push(value);
    }
    let imagem;
    try {
      imagem = await otimizarFoto(Buffer.concat(partes));
    } catch (e) {
      throw new Falha(e instanceof Error ? e.message : "Foto inválida.");
    }
    const admin = createAdminClient();
    const { data: foto, error } = await admin.rpc("reservar_foto_servico", {
      p_empresa: usuario.empresa_id,
      p_autor: usuario.id,
      p_servico: servico,
      p_id: id,
      p_sha: imagem.sha256,
      p_bytes: imagem.bytes,
      p_largura: imagem.largura,
      p_altura: imagem.altura,
    });
    if (error || !foto)
      throw new Falha(error?.message || "Não foi possível reservar espaço.");
    if (foto.estado === "pronta") return json({ id: foto.id });
    const caminhos = caminhosFoto(foto);
    for (const [i, arquivo] of [imagem.foto, imagem.miniatura].entries()) {
      const { error: falha } = await admin.storage
        .from("evidencias")
        .upload(caminhos[i], arquivo, {
          contentType: "image/jpeg",
          cacheControl: "0",
          upsert: false,
        });
      if (
        falha &&
        !["409", "Duplicate"].includes(String(falha.statusCode)) &&
        !/already exists/i.test(falha.message)
      )
        throw new Falha(
          "O envio foi interrompido. A foto continua no aparelho; tente sincronizar novamente.",
          503,
        );
    }
    const { error: falha } = await admin.rpc("finalizar_foto_servico", {
      p_empresa: usuario.empresa_id,
      p_id: id,
    });
    if (falha)
      throw new Falha(
        "Aguarde a confirmação do envio e tente sincronizar novamente.",
        503,
      );
    return json({ id: foto.id });
  } catch (e) {
    return erroApi(e);
  }
}
export async function GET(request: Request) {
  try {
    const { db, usuario } = await acesso();
    const q = new URL(request.url).searchParams,
      id = q.get("id");
    if (!uuid(id)) throw new Falha("Foto indisponível.", 404);
    const { data: foto } = await db
      .from("servico_fotos")
      .select("*")
      .eq("empresa_id", usuario.empresa_id)
      .eq("id", id)
      .eq("estado", "pronta")
      .single();
    if (!foto) throw new Falha("Foto não encontrada na sua empresa.", 404);
    const caminho = caminhosFoto(foto)[q.get("mini") === "1" ? 1 : 0];
    const { data, error } = await createAdminClient()
      .storage.from("evidencias")
      .download(caminho);
    if (error || !data)
      throw new Falha("Não foi possível carregar a foto.", 503);
    return new Response(data, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return erroApi(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const { usuario } = await acesso(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!uuid(id)) throw new Falha("Foto indisponível.");
    if (!(await excluirFotoSemUso(usuario.empresa_id, id)))
      throw new Falha(
        "A foto está vinculada a uma OS. Salve o rascunho sem esta foto antes de removê-la do servidor.",
      );
    return json({ removida: true });
  } catch (e) {
    return erroApi(e);
  }
}
