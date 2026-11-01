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
          checklist: [
            { descricao: "Inspecionar filtros e serpentinas", feito: true },
            {
              descricao: "Conferir drenagem e registrar o resultado",
              feito: false,
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
