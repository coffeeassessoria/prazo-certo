import { fotoParaPdf } from "@/lib/relatorios/imagens";
import { caminhosFoto } from "@/lib/relatorios/armazenamento";
import { createAdminClient } from "@/lib/supabase/admin";
import { acesso, erroApi, Falha } from "@/lib/operacao/api";
import { gerarDocumentoOperacao } from "@/lib/documentos/operacao";
import type { IdentidadeDocumento } from "@/lib/pmoc";
import { type Dados } from "@/lib/operacao/modelo";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const { db, usuario } = await acesso();
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id))
      throw new Falha("Documento indisponível.", 404);
    const { data: r, error } = await db
      .from("operacao_registros")
      .select("*")
      .eq("id", id)
      .eq("empresa_id", usuario.empresa_id)
      .in("tipo", ["orcamento", "servico"])
      .single();
    if (error || !r)
      throw new Falha("Documento não encontrado na sua empresa.", 404);
    const d = r.dados as Dados;
    const [{ data: identidade }, { data: cliente }] = await Promise.all([
      db
        .from("documento_identidades")
        .select("*")
        .eq("empresa_id", usuario.empresa_id)
        .maybeSingle(),
      db
        .from("clientes")
        .select("nome,documento,endereco,telefone,email")
        .eq("id", d.cliente_id)
        .eq("empresa_id", usuario.empresa_id)
        .single(),
    ]);
    const snap = d.relatorio?.snapshot;
    const identidadeDoc: IdentidadeDocumento = snap?.identidade ||
      identidade || {
        nome: usuario.empresa,
        documento: "",
        endereco: "",
        telefone: "",
        email: "",
      };
    let logo: Uint8Array | undefined;
    if (identidadeDoc.logo_path) {
      const { data, error } = await db.storage
        .from("identidades")
        .download(identidadeDoc.logo_path);
      if (error)
        throw new Falha(
          "Não foi possível carregar o logo da empresa. Tente novamente.",
          503,
        );
      logo = new Uint8Array(await data.arrayBuffer());
    }
    const fotos: { id: string; bytes: Uint8Array }[] = [];
    const admin = createAdminClient();
    for (const f of d.relatorio?.fotos || []) {
      const { data: registro } = await db
        .from("servico_fotos")
        .select("id,empresa_id,servico_id")
        .eq("id", f.id)
        .eq("empresa_id", usuario.empresa_id)
        .eq("servico_id", id)
        .eq("estado", "pronta")
        .single();
      if (!registro)
        throw new Falha(
          "Uma foto do relatório está indisponível. Tente novamente.",
          503,
        );
      const { data, error } = await admin.storage
        .from("evidencias")
        .download(caminhosFoto(registro)[0]);
      if (error || !data)
        throw new Falha(
          "Não foi possível carregar todas as fotos. Tente novamente.",
          503,
        );
      fotos.push({
        id: f.id,
        bytes: await fotoParaPdf(new Uint8Array(await data.arrayBuffer())),
      });
    }
    return new Response(
      Buffer.from(
        await gerarDocumentoOperacao(
          r,
          identidadeDoc,
          snap?.cliente || cliente,
          logo,
          fotos,
        ),
      ),
      {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${r.tipo}-${id.slice(0, 8)}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (e) {
    return erroApi(e);
  }
}
