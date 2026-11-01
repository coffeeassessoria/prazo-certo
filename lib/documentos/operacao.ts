import { Timbrado } from "./timbrado";
import type { IdentidadeDocumento } from "@/lib/pmoc";
import { dinheiro, ESTADOS, type Registro } from "@/lib/operacao/modelo";
export async function gerarDocumentoOperacao(
  r: Registro,
  identidade: IdentidadeDocumento,
  cliente: { nome?: string; documento?: string; endereco?: string } | null,
  logo?: Uint8Array,
) {
  const id = r.id,
    d = r.dados;
  const titulo = r.tipo === "orcamento" ? "Orçamento" : "Ordem de serviço";
  const t = await Timbrado.criar(
    identidade,
    `${titulo} ${id.slice(0, 8)} · versão ${r.versao}`,
    logo,
  );
  t.titulo(titulo);
  t.campo("Referência", id.slice(0, 8).toUpperCase());
  t.campo("Situação", ESTADOS[r.tipo as "orcamento" | "servico"][d.estado]);
  t.campo("Serviço", d.titulo);
  t.campo("Cliente", cliente?.nome);
  t.campo("Documento do cliente", cliente?.documento);
  t.campo("Endereço", cliente?.endereco);
  t.campo(
    r.tipo === "orcamento" ? "Válido até" : "Agendamento",
    d.data.split("-").reverse().join("/"),
  );
  if (r.tipo === "orcamento") {
    t.secao("Serviços e materiais");
    t.tabela(
      [
        { titulo: "Descrição", largura: 250 },
        { titulo: "Quantidade", largura: 65 },
        { titulo: "Unitário", largura: 96 },
        { titulo: "Total", largura: 100.28 },
      ],
      (d.itens || []).map((i) => [
        `${i.descricao}\n${i.tipo === "servico" ? "Serviço" : "Material"}`,
        new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
          i.quantidade_mil / 1000,
        ),
        dinheiro(i.preco_centavos),
        dinheiro(
          Math.floor((i.quantidade_mil * i.preco_centavos + 500) / 1000),
        ),
      ]),
    );
    t.campo("Desconto", dinheiro(d.desconto_centavos));
    t.campo("Total da proposta", dinheiro(d.total_centavos));
    t.secao("Condições de pagamento");
    t.paragrafo(d.condicoes || "A combinar com o cliente.");
    t.paragrafo(
      "Este orçamento não comprova pagamento. A aprovação e os recebimentos são registrados separadamente.",
      true,
    );
  } else {
    t.secao("Etapas executadas");
    for (const c of d.checklist || [])
      t.paragrafo(`${c.feito ? "[Concluída]" : "[Pendente]"} ${c.descricao}`);
    t.secao("Resultado e recomendações");
    t.paragrafo(d.resultado || "Serviço ainda sem resultado registrado.");
    t.paragrafo(
      "Relatório operacional. Este documento não substitui o plano PMOC nem comprova assinatura ou responsabilidade técnica.",
      true,
    );
  }
  if (d.observacoes) {
    t.secao("Observações");
    t.paragrafo(d.observacoes);
  }

  return t.finalizar();
}
