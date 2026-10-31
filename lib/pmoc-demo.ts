import { ROTINAS_INICIAIS, type SnapshotPmoc } from './pmoc'
import { hojeISO, somarDias } from './datas'
export function exemploPmoc(): SnapshotPmoc {
  const hoje = hojeISO()
  return {
    identidade: {
      nome: 'ClimaTech | Demonstração',
      documento: '00.000.000/0000-00',
      endereco: 'Avenida de Exemplo, 100 - Centro - Cuiabá/MT',
      telefone: '(00) 00000-0000',
      email: 'contato@exemplo.invalid',
    },
    cliente: {
      nome: 'Clínica Boa Vista - dados fictícios',
      documento: '00.000.000/0000-00',
      contato: 'Pessoa de contato (exemplo)',
      telefone: '(00) 00000-0000',
      email: 'cliente@exemplo.invalid',
    },
    unidade: {
      nome: 'Unidade Centro',
      endereco: 'Rua de Exemplo, 200 - Centro - Cuiabá/MT',
      representante_nome: 'Representante de demonstração',
      representante_documento: 'Documento de exemplo',
      representante_papel: 'preposto',
      representante_endereco: 'Rua de Exemplo, 200 - Centro - Cuiabá/MT',
      representante_contato: 'cliente@exemplo.invalid',
    },
    ambientes: [
      {
        id: 'recepcao',
        nome: 'Recepção',
        atividade: 'Atendimento ao público',
        area_m2: 45,
        ocupantes_fixos: 3,
        ocupantes_flutuantes: 12,
      },
      {
        id: 'administrativo',
        nome: 'Administrativo',
        atividade: 'Atividades administrativas',
        area_m2: 25,
        ocupantes_fixos: 4,
        ocupantes_flutuantes: 2,
      },
    ],
    equipamentos: [
      {
        id: 'ac1',
        ambiente_id: 'recepcao',
        tag: 'AC-01',
        tipo: 'split',
        marca: 'Marca de exemplo',
        modelo: 'Modelo de demonstração',
        serie: 'DEMO-001',
        capacidade_btu: 24000,
      },
      {
        id: 'ac2',
        ambiente_id: 'recepcao',
        tag: 'AC-02',
        tipo: 'split',
        marca: 'Marca de exemplo',
        modelo: 'Modelo de demonstração',
        serie: 'DEMO-002',
        capacidade_btu: 18000,
      },
      {
        id: 'ac3',
        ambiente_id: 'administrativo',
        tag: 'AC-03',
        tipo: 'cassete',
        marca: 'Marca de exemplo',
        modelo: 'Modelo de demonstração',
        serie: 'DEMO-003',
        capacidade_btu: 18000,
      },
    ],
    plano: {
      titulo: 'Plano de Manutenção, Operação e Controle',
      inicio: hoje,
      revisao_em: somarDias(hoje, 90),
      tecnico_nome: 'Responsável técnico - demonstração',
      tecnico_documento: 'Documento de exemplo',
      tecnico_conselho: 'Conselho de exemplo',
      tecnico_registro: 'Sem registro real - demonstração',
      tecnico_endereco: 'Endereço profissional de demonstração',
      tecnico_contato: 'tecnico@exemplo.invalid',
      responsabilidade:
        'Referência fictícia para demonstrar o campo de ART/TRT.',
      rotinas: ROTINAS_INICIAIS.map((r) => ({
        ...r,
        aplicacao: `${r.aplicacao} - equipamentos da unidade`,
        periodicidade: '',
      })),
      recomendacoes:
        'Campo para as orientações específicas do responsável técnico sobre falhas, comunicação de ocorrências e situações de emergência desta unidade. Este exemplo não contém uma orientação operacional aprovada.',
      projeto_referencia:
        'Projeto fictício utilizado apenas para demonstrar a organização do documento.',
      observacoes:
        'Documento de demonstração do Prazo Certo. Dados, equipamentos e profissionais são fictícios.',
    },
    execucoes: [
      {
        data_execucao: hoje,
        atividade: 'Exemplo de verificação do filtro do AC-01',
        equipamento_tag: 'AC-01',
        executado_por: 'Técnico de demonstração',
        aprovado_por: null,
        relato:
          'Registro fictício para ilustrar o histórico. Em uso real, informar os procedimentos executados e seus resultados.',
      },
    ],
    versao: 1,
    estado: 'rascunho',
    emitido_em: new Date().toISOString(),
    emitido_por: 'Usuário de demonstração',
    pendencias: [
      'Exemplo com dados fictícios. Não utilizar como documento de um estabelecimento real.',
      'Definir e revisar as periodicidades de todas as atividades para a instalação atendida.',
    ],
  }
}
