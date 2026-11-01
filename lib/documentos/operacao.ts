import { Timbrado } from "./timbrado";
import type { IdentidadeDocumento } from "@/lib/pmoc";
import { dinheiro, ESTADOS, type Registro } from "@/lib/operacao/modelo";
export async function gerarDocumentoOperacao(
  r: Registro,
  identidade: IdentidadeDocumento,
  cliente: { nome?: string; documento?: string; endereco?: string } | null,
  logo?: Uint8Array,
  fotos: { id: string; bytes: Uint8Array }[] = [],
) {
  const id = r.id,
    d = r.dados;
  const titulo =
    r.tipo === "orcamento"
      ? "Orçamento"
      : d.relatorio?.snapshot
        ? "Relatório de manutenção"
        : "Ordem de serviço";
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
    const rel = d.relatorio,
      snap = rel?.snapshot;
    if (rel) {
      t.secao(snap ? "Atendimento realizado" : "Relatório em preparação");
      t.campo(
        "Tipo",
        {
          preventiva: "Manutenção preventiva",
          corretiva: "Manutenção corretiva",
          inspecao: "Inspeção",
        }[rel.tipo_manutencao],
      );
      t.campo("Execução", rel.executada_em.split("-").reverse().join("/"));
      t.campo("Horários", [rel.inicio, rel.fim].filter(Boolean).join(" até "));
      t.campo("Unidade", snap?.unidade.nome);
      t.campo("Local do atendimento", snap?.unidade.endereco);
      t.campo("Técnico executor", snap?.tecnico);
      if (snap?.equipamentos.length) {
        t.secao("Equipamentos atendidos");
        t.tabela(
          [
            { titulo: "Identificação / ambiente", largura: 181.28 },
            { titulo: "Marca / modelo", largura: 170 },
            { titulo: "Série / capacidade", largura: 160 },
          ],
          snap.equipamentos.map((e) => [
            `${e.tag}\n${e.ambiente}`,
            `${e.marca}\n${e.modelo}`,
            `${e.serie || "Série não informada"}\n${e.capacidade_btu ? e.capacidade_btu + " BTU/h" : "Capacidade não informada"}`,
          ]),
        );
      }
    }
    t.secao("Etapas executadas");
    for (const c of d.checklist || [])
      t.paragrafo(`${c.feito ? "[Concluída]" : "[Pendente]"} ${c.descricao}`);
    t.secao("Resultado e recomendações");
    t.paragrafo(d.resultado || "Serviço ainda sem resultado registrado.");
    if (rel) {
      for (const [nome, valor] of [
        ["Peças e materiais", rel.pecas],
        ["Medições registradas", rel.medicoes],
        ["Pendências e recomendações", rel.recomendacoes],
      ]) {
        t.secao(nome);
        t.paragrafo(valor || "Não informado.");
      }
      if (rel.proxima_manutencao) {
        t.campo(
          "Próxima manutenção recomendada",
          rel.proxima_manutencao.split("-").reverse().join("/"),
        );
        t.paragrafo(
          snap?.retorno_id
            ? "Retorno cadastrado para combinar o próximo atendimento com o cliente."
            : "Data recomendada; o agendamento deve ser combinado com o cliente.",
          true,
        );
      }
      t.secao("Ciência do cliente");
      t.campo(
        "Acompanhamento",
        {
          presente:
            rel.assinatura && snap?.aceite
              ? "Representante assinou o aceite na tela"
              : "Representante tomou ciência, conforme declaração do técnico",
          ausente: "Sem representante disponível",
          recusou: "Representante não quis confirmar ciência",
        }[rel.ciencia.situacao],
      );
      if (rel.ciencia.situacao !== "ausente") {
        t.campo("Representante", rel.ciencia.nome);
        t.campo("Cargo / função", rel.ciencia.cargo);
      }
      if (rel.assinatura && snap?.aceite) {
        t.secao("Aceite do atendimento na tela");
        t.assinatura(rel.assinatura.tracos);
        t.campo("Representante que assinou", rel.ciencia.nome);
        t.campo("Cargo / função", rel.ciencia.cargo);
        t.paragrafo(rel.assinatura.termo);
        t.campo(
          "Coleta no aparelho (horário declarado)",
          new Date(rel.assinatura.capturada_em).toLocaleString("pt-BR", {
            timeZone: "America/Cuiaba",
          }),
        );
        t.campo(
          snap.aceite.demonstracao
            ? "Conclusão da demonstração (sem envio à plataforma)"
            : "Recebido pela plataforma",
          new Date(snap.aceite.recebido_em).toLocaleString("pt-BR", {
            timeZone: "America/Cuiaba",
          }),
        );
        t.campo("Fuso dos horários", "America/Cuiaba (UTC-4)");
        t.campo("OS / versão aceita", `${id} / ${snap.aceite.versao}`);
        t.campo("Registrado pela conta", snap.aceite.registrado_por);
        t.campo(
          "Registro SHA-256 do aceite e conteúdo preservado",
          snap.aceite.sha256,
        );
        const contexto = JSON.parse(rel.assinatura.conteudo).apresentado;
        t.campo(
          "Identificação apresentada na coleta",
          [
            contexto.empresa,
            contexto.cliente,
            contexto.unidade,
            contexto.unidade_endereco,
            contexto.tecnico,
            ...(contexto.equipamentos || []),
          ]
            .filter(Boolean)
            .join("; "),
        );
        t.paragrafo(
          "Assinatura desenhada na tela, sem certificado digital. A identidade do signatário foi informada na coleta e não foi verificada automaticamente. O registro SHA-256 identifica o conjunto preservado na plataforma; não é uma certificação digital do arquivo PDF.",
          true,
        );
      } else {
        t.paragrafo(
          "Registro informado pelo técnico. Não há assinatura do cliente neste relatório nem aprovação técnica das rotinas do PMOC.",
          true,
        );
      }
      if (snap)
        t.campo(
          "Registro na plataforma",
          new Date(snap.emitido_em).toLocaleString("pt-BR", {
            timeZone: "America/Cuiaba",
          }),
        );
      if (rel.fotos.length) {
        t.garantir(380);
        t.secao("Registro fotográfico");
        for (const [i, f] of rel.fotos.entries()) {
          const arquivo = fotos.find((a) => a.id === f.id);
          if (!arquivo)
            throw new Error(
              "Uma foto do relatório não pôde ser carregada. Tente gerar o PDF novamente.",
            );
          const equipamento = snap?.equipamentos.find(
            (e) => e.id === f.equipamento_id,
          );
          await t.fotografia(
            arquivo.bytes,
            `${i + 1}. ${{ antes: "Antes do serviço", depois: "Depois do serviço", evidencia: "Registro do atendimento" }[f.etapa]} · ${equipamento?.tag || "Visão geral"}${f.legenda ? " · " + f.legenda : ""}`,
          );
        }
      }
    }
    t.paragrafo(
      "Relatório operacional. Este documento não substitui o plano PMOC nem comprova responsabilidade técnica.",
      true,
    );
  }
  if (d.observacoes) {
    t.secao("Observações");
    t.paragrafo(d.observacoes);
  }

  return t.finalizar();
}
