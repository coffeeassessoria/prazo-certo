import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { linhaRpc } from "./modelo";
export const caminhosFoto = (f: {
  empresa_id: string;
  servico_id: string;
  id: string;
}) => {
  const raiz = `${f.empresa_id}/${f.servico_id}/${f.id}`;
  return [`${raiz}.jpg`, `${raiz}-mini.jpg`];
};
/** Nunca exclui evidências referenciadas por uma OS, mesmo em rascunho. */
export async function excluirFotoSemUso(
  empresa: string,
  id: string,
  expirada = false,
) {
  const admin = createAdminClient();
  const { data: reserva, error } = await admin.rpc("descartar_foto_servico", {
    p_empresa: empresa,
    p_id: id,
    p_expirada: expirada,
  });
  if (error) throw new Error(error.message);
  const foto = linhaRpc(reserva);
  if (!foto?.id) return false;
  const { error: falha } = await admin.storage
    .from("evidencias")
    .remove(caminhosFoto(foto));
  if (falha)
    throw new Error("Não foi possível remover os arquivos. Tente novamente.");
  const { error: banco } = await admin
    .from("servico_fotos")
    .delete()
    .eq("empresa_id", empresa)
    .eq("id", id)
    .eq("estado", "excluindo");
  if (banco)
    throw new Error("Os arquivos foram removidos; a limpeza será retomada.");
  return true;
}
export async function limparFotosAbandonadas() {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("fotos_abandonadas");
  if (error) throw new Error("Limpeza de fotos indisponível.");
  let removidas = 0;
  const ate = Date.now() + 5000;
  for (const f of (data || []) as { id: string; empresa_id: string }[]) {
    if (Date.now() >= ate) break;
    try {
      if (await excluirFotoSemUso(f.empresa_id, f.id, true)) removidas++;
    } catch {
      /* Uma falha não bloqueia outros arquivos nem os lembretes. */
    }
  }
  return removidas;
}
