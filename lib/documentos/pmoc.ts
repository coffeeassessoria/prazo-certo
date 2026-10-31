import { PDFDocument } from 'pdf-lib'
import { Timbrado } from './timbrado'
import {
  ANEXO_PMOC,
  FONTE_PMOC,
  TIPOS_EQUIPAMENTO,
  type SnapshotPmoc,
} from '@/lib/pmoc'
import { fmtData, fmtInstante } from '@/lib/datas'

export async function gerarPdfPmoc(
  s: SnapshotPmoc,
  logo?: Uint8Array,
  projeto?: Uint8Array,
) {
  const estado =
    s.estado === 'rascunho' ? 'Rascunho - revisão pendente' : 'Para assinatura'
  const t = await Timbrado.criar(
    s.identidade,
    `PMOC | ${s.unidade.nome} | v${s.versao} | ${estado}`,
    logo,
  )
  t.doc.setTitle(`PMOC - ${s.cliente.nome} - ${s.unidade.nome} - v${s.versao}`)
  t.doc.setAuthor(s.identidade.nome)
  t.doc.setSubject('Plano de Manutenção, Operação e Controle')
  t.doc.setCreator('Prazo Certo')
  t.titulo('PMOC')
  t.paragrafo(s.plano.titulo || 'Plano de Manutenção, Operação e Controle')
  t.paragrafo(
    `Versão ${s.versao} | ${estado} | Emissão ${fmtInstante(s.emitido_em)}`,
    true,
  )
  t.paragrafo(
    `Preparado por ${s.emitido_por}. ${s.estado === 'rascunho' ? 'Documento em elaboração; os campos pendentes estão relacionados ao final.' : 'Revisão técnica declarada pelo usuário emissor. Assinaturas devem ser coletadas no documento.'}`,
    true,
  )
  t.secao('1. Estabelecimento e unidade atendida')
  t.campo('Cliente', s.cliente.nome)
  t.campo('CNPJ/CPF', s.cliente.documento)
  t.campo('Unidade', s.unidade.nome)
  t.campo('Endereço', s.unidade.endereco)
  t.campo(
    'Contato do cliente',
    [s.cliente.contato, s.cliente.telefone, s.cliente.email]
      .filter(Boolean)
      .join(' | '),
  )
  t.campo('Início de referência do plano', fmtData(s.plano.inicio))
  t.campo(
    'Próxima revisão definida no plano',
    s.plano.revisao_em
      ? fmtData(s.plano.revisao_em)
      : 'Não definida pelo responsável técnico',
  )
  t.secao('2. Proprietário, locatário ou preposto')
  t.campo(
    'Condição',
    (
      {
        proprietario: 'Proprietário',
        locatario: 'Locatário',
        preposto: 'Preposto',
      } as Record<string, string>
    )[s.unidade.representante_papel],
  )
  t.campo('Nome / razão social', s.unidade.representante_nome)
  t.campo('CNPJ/CPF', s.unidade.representante_documento)
  t.campo('Endereço', s.unidade.representante_endereco)
  t.campo('Contato', s.unidade.representante_contato)
  t.secao('3. Responsável técnico')
  t.campo('Nome / razão social', s.plano.tecnico_nome)
  t.campo('CNPJ/CPF', s.plano.tecnico_documento)
  t.campo(
    'Conselho e registro',
    [s.plano.tecnico_conselho, s.plano.tecnico_registro]
      .filter(Boolean)
      .join(' | '),
  )
  t.campo('Endereço', s.plano.tecnico_endereco)
  t.campo('Contato', s.plano.tecnico_contato)
  t.campo('ART / TRT / referência ou justificativa', s.plano.responsabilidade)
  t.secao('4. Ambientes climatizados')
  const capacidades = new Map<string, number>()
  s.equipamentos.forEach((e) =>
    capacidades.set(
      e.ambiente_id,
      (capacidades.get(e.ambiente_id) ?? 0) + Number(e.capacidade_btu ?? 0),
    ),
  )
  if (s.ambientes.length)
    t.tabela(
      [
        { titulo: 'Ambiente / atividade', largura: 190 },
        { titulo: 'Ocupantes fixos / flutuantes', largura: 115 },
        { titulo: 'Área (m²)', largura: 80 },
        { titulo: 'Carga cadastrada (BTU/h)', largura: 126.28 },
      ],
      s.ambientes.map((a) => [
        `${a.nome}\n${a.atividade || 'Atividade não informada'}`,
        `${a.ocupantes_fixos ?? '-'} / ${a.ocupantes_flutuantes ?? '-'}`,
        a.area_m2 ?? '-',
        capacidades.has(a.id)
          ? capacidades.get(a.id)!.toLocaleString('pt-BR')
          : 'Não informada',
      ]),
    )
  else t.paragrafo('Nenhum ambiente cadastrado.')
  t.paragrafo(
    'Carga cadastrada: soma das capacidades informadas dos equipamentos; não substitui o dimensionamento térmico do ambiente.',
    true,
  )
  t.secao('5. Inventário de equipamentos')
  if (s.equipamentos.length)
    t.tabela(
      [
        { titulo: 'Identificação / ambiente', largura: 170 },
        { titulo: 'Tipo / marca / modelo', largura: 210 },
        { titulo: 'Capacidade / série', largura: 131.28 },
      ],
      s.equipamentos.map((e) => [
        `${e.tag}\n${s.ambientes.find((a) => a.id === e.ambiente_id)?.nome ?? '-'}`,
        `${TIPOS_EQUIPAMENTO[e.tipo as keyof typeof TIPOS_EQUIPAMENTO] ?? e.tipo}\n${[e.marca, e.modelo].filter(Boolean).join(' ') || 'Não informado'}`,
        `${e.capacidade_btu ? Number(e.capacidade_btu).toLocaleString('pt-BR') + ' BTU/h' : 'Não informada'}\nSérie: ${e.serie || '-'}`,
      ]),
    )
  else t.paragrafo('Nenhum equipamento cadastrado.')
  t.secao('6. Atividades de manutenção e controle')
  t.paragrafo(
    'Aplicação e periodicidade devem ser definidas pelo responsável técnico para os sistemas e ambientes atendidos.',
    true,
  )
  if (s.plano.rotinas.length)
    t.tabela(
      [
        { titulo: 'Aplicação / equipamento', largura: 130 },
        { titulo: 'Atividade', largura: 265 },
        { titulo: 'Periodicidade definida', largura: 116.28 },
      ],
      s.plano.rotinas.map((r) => [
        r.aplicacao,
        r.atividade,
        r.periodicidade || 'A definir pelo responsável técnico',
      ]),
    )
  else t.paragrafo('Atividades ainda não definidas.')
  t.secao('7. Registros de execução')
  t.paragrafo(
    'Somente serviços registrados no sistema constam nesta seção. A emissão deste plano não comprova a execução das atividades.',
    true,
  )
  if (s.execucoes.length)
    t.tabela(
      [
        { titulo: 'Data / equipamento', largura: 95 },
        { titulo: 'Atividade / relato', largura: 240 },
        { titulo: 'Executado / aprovado por (informados)', largura: 176.28 },
      ],
      s.execucoes.map((e) => [
        `${fmtData(e.data_execucao)}\n${e.equipamento_tag || 'Conforme aplicação do plano'}`,
        `${e.atividade}\n${e.relato}`,
        `${e.executado_por}\nAprovação: ${e.aprovado_por || 'Não registrada'}`,
      ]),
    )
  else
    t.paragrafo(
      'Nenhuma execução registrada nesta versão.\nData de execução: ____________________\nAtividade / equipamento: __________________________________________\nExecutado por: ____________________  Aprovado por: ____________________',
    )
  t.secao('8. Recomendações para falhas e emergências')
  t.paragrafo(s.plano.recomendacoes || 'A preencher pelo responsável técnico.')
  t.secao('9. Projeto de instalação e observações')
  t.campo('Referência do projeto / justificativa', s.plano.projeto_referencia)
  if (projeto) {
    await PDFDocument.load(projeto, { ignoreEncryption: false })
    await t.doc.attach(projeto, 'projeto-instalacao.pdf', {
      mimeType: 'application/pdf',
      description: 'Projeto de instalação informado pela empresa prestadora',
    })
    t.paragrafo(
      'Projeto de instalação anexado a este arquivo PDF. Consulte os anexos em um leitor compatível.',
      true,
    )
  }
  if (s.plano.observacoes) t.campo('Observações', s.plano.observacoes)
  if (s.pendencias.length) {
    t.secao('Pendências deste rascunho')
    s.pendencias.forEach((p) => t.paragrafo(`- ${p}`))
  }
  t.secao('Revisão e assinaturas')
  t.paragrafo(
    'Local e data: ___________________________________________________\n\nResponsável técnico: ___________________________________________\n\nProprietário / locatário / preposto: _________________________________',
  )
  t.paragrafo(
    'Os campos de assinatura não representam assinatura eletrônica ou certificação automática. O plano e as rotinas devem corresponder à instalação e às orientações técnicas aplicáveis.',
    true,
  )
  t.secao('Referências da estrutura do documento')
  t.paragrafo(
    'Estrutura inicial baseada no art. 6º e no Anexo I da Portaria GM/MS nº 3.523/1998. Os modelos de atividades são sugestões editáveis, sem periodicidade pré-fixada. A revisão técnica deve considerar as normas e recomendações vigentes aplicáveis ao sistema.',
    true,
  )
  t.paragrafo(FONTE_PMOC, true)
  t.paragrafo(ANEXO_PMOC, true)
  return t.finalizar()
}
