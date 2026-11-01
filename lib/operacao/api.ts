import "server-only";
import { createClient } from "@/lib/supabase/server";
export class Falha extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const json = (dados: unknown, status = 200) =>
  Response.json(dados, { status, headers: { "Cache-Control": "no-store" } });
export async function acesso(request?: Request) {
  if (
    request &&
    !["GET", "HEAD"].includes(request.method) &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    throw new Falha("Reabra a página para continuar.", 403);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
    throw new Falha("Entre na sua conta para continuar.", 401);
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    throw new Falha(
      "Entre novamente na sua conta. Os envios pendentes continuam neste aparelho.",
      401,
    );
  const { data: perfil } = await db
    .from("perfis")
    .select("empresa_id,nome,papel,trocar_senha")
    .eq("user_id", user.id)
    .single();
  if (!perfil || perfil.trocar_senha || !perfil.empresa_id)
    throw new Falha("Conclua o acesso à sua empresa para continuar.", 403);
  const { data: empresa } = await db
    .from("empresas")
    .select("id,nome,ativo,onboarding_concluido")
    .eq("id", perfil.empresa_id)
    .single();
  if (!empresa?.ativo || !empresa.onboarding_concluido)
    throw new Falha(
      "Sua empresa precisa estar ativa e com o cadastro inicial concluído.",
      403,
    );
  return {
    db,
    usuario: {
      id: user.id,
      nome: perfil.nome || user.email || "Usuário",
      empresa_id: empresa.id as string,
      empresa: empresa.nome as string,
      admin: perfil.papel === "admin",
    },
  };
}
export function erroApi(e: unknown) {
  return json(
    {
      erro:
        e instanceof Falha
          ? e.message
          : "Não foi possível concluir. Tente novamente.",
    },
    e instanceof Falha ? e.status : 500,
  );
}
export async function corpo(request: Request, limite = 120_000) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Falha("Envie os dados no formato JSON.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new Falha("Informe os dados.");
  const partes: Uint8Array[] = [];
  let tamanho = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    tamanho += value.byteLength;
    if (tamanho > limite) {
      await reader.cancel();
      throw new Falha("Envio acima do limite permitido.", 413);
    }
    partes.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(partes).toString("utf8"));
  } catch {
    throw new Falha("Revise os dados enviados.");
  }
}
