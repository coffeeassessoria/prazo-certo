import { relatorioVazio } from "@/lib/relatorios/modelo";
import { hoje, vazio, type Base } from "./modelo";
export function baseDemo(): Base {
  const uid = "00000000-0000-4000-8000-000000000001",
    cid = "00000000-0000-4000-8000-000000000002";
  return {
    usuario: {
      id: uid,
      nome: "Carlos Silva",
      empresa_id: "demo",
      empresa: "ClimaTech · demonstração",
      admin: true,
    },
    clientes: [
      {
        id: cid,
        nome: "Hospital Santa Clara",
        documento: "00.000.000/0001-00",
      },
    ],
    equipe: [{ id: uid, nome: "Carlos Silva" }],
    armazenamento: { usado: 0, limite: 524288000 },
    campo: {
      unidades: [
        {
          id: "00000000-0000-4000-8000-000000000011",
          cliente_id: cid,
          nome: "Unidade Centro",
          endereco: "Rua de exemplo, 100 · endereço fictício",
        },
      ],
      equipamentos: [
        {
          id: "00000000-0000-4000-8000-000000000012",
          unidade_id: "00000000-0000-4000-8000-000000000011",
          tag: "AC-01",
          marca: "Marca de exemplo",
          modelo: "Split 12.000 BTU/h",
          ambiente: "Recepção",
        },
        {
          id: "00000000-0000-4000-8000-000000000013",
          unidade_id: "00000000-0000-4000-8000-000000000011",
          tag: "AC-02",
          marca: "Marca de exemplo",
          modelo: "Split 18.000 BTU/h",
          ambiente: "Administrativo",
        },
      ],
      planos: [
        {
          id: "00000000-0000-4000-8000-000000000014",
          unidade_id: "00000000-0000-4000-8000-000000000011",
          titulo: "PMOC · Unidade Centro",
          rotinas: [
            {
              id: "filtros",
              aplicacao: "Filtros",
              atividade: "Inspecionar filtros e registrar condições",
            },
            {
              id: "dreno",
              aplicacao: "Drenagem",
              atividade: "Conferir bandeja e escoamento",
            },
          ],
        },
      ],
    },
    sincronizado: new Date().toISOString(),
    registros: [
      {
        id: "00000000-0000-4000-8000-000000000003",
        tipo: "orcamento",
        versao: 1,
        dados: {
          ...vazio("orcamento", uid),
          titulo: "Higienização de 12 aparelhos split",
          cliente_id: cid,
          data: hoje(),
          estado: "enviado",
          itens: [
            {
              descricao: "Higienização de split até 12.000 BTU",
              tipo: "servico",
              quantidade_mil: 12000,
              preco_centavos: 18000,
            },
          ],
          total_centavos: 216000,
          condicoes: "50% na aprovação e 50% após o serviço.",
        },
      },
      {
        id: "00000000-0000-4000-8000-000000000004",
        tipo: "servico",
        versao: 1,
        dados: {
          ...vazio("servico", uid),
          titulo: "Manutenção preventiva · recepção",
          cliente_id: cid,
          estado: "em_andamento",
          relatorio: {
            ...relatorioVazio(hoje()),
            unidade_id: "00000000-0000-4000-8000-000000000011",
            equipamento_ids: ["00000000-0000-4000-8000-000000000012"],
            plano_id: "00000000-0000-4000-8000-000000000014",
          },
          checklist: [
            {
              descricao: "Inspecionar filtros e serpentinas",
              feito: true,
              rotina_id: "filtros",
            },
            {
              descricao: "Conferir drenagem e registrar o resultado",
              feito: false,
              rotina_id: "dreno",
            },
          ],
        },
      },
      {
        id: "00000000-0000-4000-8000-000000000005",
        tipo: "demanda",
        versao: 1,
        dados: {
          ...vazio("demanda", uid),
          titulo: "Confirmar orçamento com a administração",
          cliente_id: cid,
          estado: "aguardando_cliente",
          proxima_acao: "Ligar para Ana e combinar a aprovação.",
        },
      },
    ],
  };
}
