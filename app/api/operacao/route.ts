import { acesso, corpo, erroApi, Falha, json } from "@/lib/operacao/api";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { db, usuario } = await acesso();
    const resultados = await Promise.all([
      db
        .from("clientes")
        .select("id,nome,documento,telefone")
        .eq("empresa_id", usuario.empresa_id)
        .order("nome")
        .limit(2000),
      db
        .from("perfis")
        .select("user_id,nome,email")
        .eq("empresa_id", usuario.empresa_id),
      db
        .from("operacao_registros")
        .select("id,tipo,dados,versao,updated_at")
        .eq("empresa_id", usuario.empresa_id)
        .order("updated_at", { ascending: false })
        .limit(500),
      db
        .from("itens")
        .select(
          "id,titulo,cliente_id,responsavel_id,vencimento,etapa_demanda,proxima_acao,descricao,versao_sync,updated_at",
        )
        .eq("empresa_id", usuario.empresa_id)
        .eq("tipo", "acompanhamento")
        .order("updated_at", { ascending: false })
        .limit(500),
    ]);
    if (resultados.some((r) => r.error))
      throw new Falha(
        "O módulo não está disponível. Verifique se a migração da operação foi aplicada.",
        503,
      );
    const [clientes, equipe, registros, demandas] = resultados;
    return json({
      usuario,
      clientes: clientes.data,
      equipe: equipe.data?.map((p) => ({
        id: p.user_id,
        nome: p.nome || p.email,
      })),
      registros: [
        ...registros.data!,
        ...demandas.data!.map((d) => ({
          id: d.id,
          tipo: "demanda",
          versao: d.versao_sync,
          updated_at: d.updated_at,
          dados: {
            titulo: d.titulo,
            cliente_id: d.cliente_id,
            responsavel_id: d.responsavel_id,
            data: d.vencimento,
            estado: d.etapa_demanda,
            proxima_acao: d.proxima_acao,
            observacoes: d.descricao || "",
          },
        })),
      ],
      sincronizado: new Date().toISOString(),
    });
  } catch (e) {
    return erroApi(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, usuario } = await acesso(request);
    const o = await corpo(request);
    if (!o || typeof o !== "object") throw new Falha("Informe a operação.");
    if (o.empresa_id !== usuario.empresa_id || o.usuario_id !== usuario.id)
      throw new Falha(
        "Entre na conta de origem para enviar este trabalho.",
        403,
      );
    const { data, error } = await db.rpc("aplicar_operacao", {
      p_operacao: o.operacao,
      p_tipo: o.tipo,
      p_id: o.id,
      p_versao: o.versao,
      p_dados: o.dados,
    });
    if (error)
      throw new Falha(
        error.code === "23505"
          ? "Já existe um serviço ou recebível para esse orçamento. Atualize a lista."
          : error.message,
        error.code === "40001" ? 409 : error.code === "42501" ? 403 : 400,
      );
    return json(data);
  } catch (e) {
    return erroApi(e);
  }
}
