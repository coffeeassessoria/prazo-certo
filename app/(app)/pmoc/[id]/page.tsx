import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download, FileText, Pencil } from 'lucide-react'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { fmtData, hojeISO, fmtInstante } from '@/lib/datas'
import { FONTE_PMOC, type DadosPlano } from '@/lib/pmoc'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { Selo } from '@/components/ui/Selo'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'
import { PmocForm } from '@/components/ui/PmocForm'
import { FormResultado } from '@/components/FormResultado'
import { emitirPmoc, registrarExecucao, salvarPlano } from '../actions'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export default async function Plano({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    editar?: string
    historico?: string
    execucoes?: string
  }>
}) {
  const ctx = await exigirEmpresa(),
    { id } = await params,
    sp = await searchParams,
    supabase = await createClient()
  const { data: p, error } = await supabase
    .from('pmoc_planos')
    .select('*')
    .eq('empresa_id', ctx.empresa.id)
    .eq('id', id)
    .maybeSingle()
  if (error)
    return (
      <Aviso tipo="erro" titulo="Não foi possível carregar o plano">
        Confira a atualização do banco.
      </Aviso>
    )
  if (!p) notFound()
  const pag = Math.max(
      1,
      Math.min(100000, Math.floor(Number(sp.historico) || 1)),
    ),
    pagExec = Math.max(
      1,
      Math.min(100000, Math.floor(Number(sp.execucoes) || 1)),
    )
  const [unidade, equipamentos, versoes, execucoes] = await Promise.all([
    supabase
      .from('unidades')
      .select('id,nome,cliente_id,endereco')
      .eq('empresa_id', ctx.empresa.id)
      .eq('id', p.unidade_id)
      .single(),
    supabase
      .from('equipamentos')
      .select('id,tag')
      .eq('empresa_id', ctx.empresa.id)
      .eq('unidade_id', p.unidade_id)
      .order('tag'),
    supabase
      .from('pmoc_versoes')
      .select('id,numero,estado,arquivo_status,created_at,snapshot', {
        count: 'exact',
      })
      .eq('empresa_id', ctx.empresa.id)
      .eq('plano_id', id)
      .order('numero', { ascending: false })
      .range((pag - 1) * 20, pag * 20 - 1),
    supabase
      .from('pmoc_execucoes')
      .select('*', { count: 'exact' })
      .eq('empresa_id', ctx.empresa.id)
      .eq('plano_id', id)
      .order('data_execucao', { ascending: false })
      .order('id')
      .range((pagExec - 1) * 20, pagExec * 20 - 1),
  ])
  const d = p.dados as DadosPlano
  if (sp.editar)
    return (
      <div className="documento-form-wrap">
        <Cabecalho
          titulo="Editar plano PMOC"
          voltar={{ href: `/pmoc/${id}`, rotulo: 'Cancelar edição' }}
        />
        <PmocForm
          acao={salvarPlano}
          plano={{ id, unidade_id: p.unidade_id, dados: d }}
          unidades={unidade.data ? [unidade.data] : []}
        />
      </div>
    )
  const ultima = versoes.data?.[0]
  return (
    <>
      <Cabecalho
        titulo={unidade.data?.nome ?? d.titulo}
        sub={d.titulo}
        voltar={{ href: '/pmoc', rotulo: 'Planos PMOC' }}
        acao={
          <Link className="btn sec" href={`/pmoc/${id}?editar=1`}>
            <Pencil size={16} />
            Editar plano
          </Link>
        }
      />
      {unidade.error ||
      equipamentos.error ||
      versoes.error ||
      execucoes.error ? (
        <Aviso tipo="erro" titulo="Parte dos dados não pôde ser carregada">
          Atualize a página antes de gerar um documento.
        </Aviso>
      ) : null}
      <div className="grade-2">
        <div className="card">
          <h2>Dados e inventário</h2>
          <dl className="detalhes">
            <dt>Unidade</dt>
            <dd>{unidade.data?.endereco || 'Endereço a completar'}</dd>
            <dt>Responsável técnico</dt>
            <dd>{d.tecnico_nome || 'A definir'}</dd>
            <dt>Atividades</dt>
            <dd>{d.rotinas.length} no plano</dd>
            <dt>Equipamentos</dt>
            <dd>{equipamentos.data?.length ?? 0} cadastrados</dd>
            <dt>Próxima revisão</dt>
            <dd>
              {d.revisao_em
                ? fmtData(d.revisao_em)
                : 'Não definida pelo responsável técnico'}
            </dd>
          </dl>
          <div className="acoes documento-secao">
            <Link className="btn sec" href={`/unidades/${p.unidade_id}`}>
              Conferir ambientes e equipamentos
            </Link>
            <Link className="btn sec" href="/config/documentos">
              Conferir logo e timbrado
            </Link>
            {unidade.data && (
              <Link
                className="btn sec"
                href={`/itens/novo?cliente=${unidade.data.cliente_id}`}
              >
                Cadastrar vencimento de revisão
              </Link>
            )}
          </div>
        </div>
        <FormResultado acao={emitirPmoc}>
          <h2 className="titulo-icone">
            <FileText size={18} />
            Gerar PDF em A4
          </h2>
          <input type="hidden" name="plano_id" value={id} />
          <p className="muted">
            Cada emissão guarda uma versão com os dados e o logo daquele
            momento. Editar o plano não altera PDFs anteriores.
          </p>
          <div className="campo">
            <label htmlFor="pdf-estado">Versão do documento</label>
            <select id="pdf-estado" name="estado" defaultValue="rascunho">
              <option value="rascunho">Rascunho para conferência</option>
              <option value="para_assinatura">Preparar para assinatura</option>
            </select>
          </div>
          <label className="check documento-secao">
            <input name="revisado" type="checkbox" />
            Confirmo que os dados, atividades e periodicidades foram revisados
            pelo responsável técnico informado.
          </label>
          <p className="dica">
            A confirmação é necessária para preparar para assinatura. A geração
            não assina o documento nem registra ART/TRT.
          </p>
          <BotaoEnviar className="btn grande">
            Gerar nova versão do PDF
          </BotaoEnviar>
        </FormResultado>
      </div>
      {ultima && (ultima.snapshot?.pendencias?.length ?? 0) > 0 && (
        <div className="card documento-secao">
          <h2>Pendências da versão {ultima.numero}</h2>
          <p className="muted">
            Confira os campos antes de preparar uma versão para assinatura.
          </p>
          <ul>
            {ultima.snapshot.pendencias.map((x: string, i: number) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      <section className="card documento-secao">
        <h2>Documentos emitidos</h2>
        <div className="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Versão</th>
                <th>Data</th>
                <th>Estado</th>
                <th>Arquivo</th>
              </tr>
            </thead>
            <tbody>
              {versoes.data?.map((v) => (
                <tr key={v.id}>
                  <td>{v.numero}</td>
                  <td>{fmtInstante(v.created_at)}</td>
                  <td>
                    <Selo peq>
                      {v.estado === 'rascunho' ? 'Rascunho' : 'Para assinatura'}
                    </Selo>
                  </td>
                  <td>
                    {v.arquivo_status === 'pronto' ? (
                      <a className="btn sec" href={`/api/documentos/${v.id}`}>
                        <Download size={16} />
                        Baixar PDF
                      </a>
                    ) : v.arquivo_status === 'falha' ? (
                      'Falha na geração. Gere uma nova versão.'
                    ) : (
                      'Geração não concluída. Tente uma nova versão.'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!versoes.data?.length && (
          <p className="muted">Nenhum PDF emitido ainda.</p>
        )}
        <div className="acoes demanda-paginacao">
          {pag > 1 && (
            <Link className="btn sec" href={`/pmoc/${id}?historico=${pag - 1}`}>
              Mais recentes
            </Link>
          )}
          {pag * 20 < (versoes.count ?? 0) && (
            <Link className="btn sec" href={`/pmoc/${id}?historico=${pag + 1}`}>
              Mais antigas
            </Link>
          )}
        </div>
      </section>
      <div className="grade-2 documento-secao">
        <FormResultado acao={registrarExecucao}>
          <h2>Registrar execução de manutenção</h2>
          <input name="plano_id" type="hidden" value={id} />
          <div className="campo">
            <label htmlFor="ex-rotina">Atividade executada</label>
            <select id="ex-rotina" name="rotina_id" required>
              <option value="">Escolher atividade</option>
              {d.rotinas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.aplicacao} - {r.atividade}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="ex-equipamento">Equipamento (opcional)</label>
            <select id="ex-equipamento" name="equipamento_id">
              <option value="">Conforme aplicação do plano</option>
              {equipamentos.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.tag}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="ex-data">Data da execução</label>
            <input
              id="ex-data"
              name="data_execucao"
              type="date"
              required
              max={hojeISO()}
              defaultValue={hojeISO()}
            />
          </div>
          <div className="campo">
            <label htmlFor="ex-executado">Executado por</label>
            <input
              id="ex-executado"
              name="executado_por"
              required
              maxLength={160}
            />
          </div>
          <div className="campo">
            <label htmlFor="ex-aprovado">
              Aprovado por (se já houve aprovação)
            </label>
            <input id="ex-aprovado" name="aprovado_por" maxLength={160} />
          </div>
          <div className="campo">
            <label htmlFor="ex-relato">O que foi realizado / resultados</label>
            <textarea id="ex-relato" name="relato" required maxLength={4000} />
          </div>
          <BotaoEnviar className="btn sec">Registrar execução</BotaoEnviar>
        </FormResultado>
        <section className="card">
          <h2>Execuções registradas</h2>
          <p className="muted">
            O nome informado não representa assinatura eletrônica. Os registros
            serão incluídos nas próximas emissões.
          </p>
          <ol className="demanda-eventos">
            {execucoes.data?.map((e) => (
              <li key={e.id}>
                <strong>
                  {fmtData(e.data_execucao)} ·{' '}
                  {e.equipamento_tag || 'Aplicação do plano'}
                </strong>
                <p>{e.atividade}</p>
                <p className="demanda-texto">{e.relato}</p>
                <span className="muted">
                  Executado por {e.executado_por}
                  {e.aprovado_por
                    ? ` · aprovação informada: ${e.aprovado_por}`
                    : ''}
                </span>
              </li>
            ))}
          </ol>
          {!execucoes.data?.length && <p>Nenhuma execução registrada.</p>}
          <div className="acoes demanda-paginacao">
            {pagExec > 1 && (
              <Link
                className="btn sec"
                href={`/pmoc/${id}?execucoes=${pagExec - 1}`}
              >
                Mais recentes
              </Link>
            )}
            {pagExec * 20 < (execucoes.count ?? 0) && (
              <Link
                className="btn sec"
                href={`/pmoc/${id}?execucoes=${pagExec + 1}`}
              >
                Mais antigas
              </Link>
            )}
          </div>
        </section>
      </div>
      <p className="muted">
        Estrutura inicial:{' '}
        <a href={FONTE_PMOC} target="_blank" rel="noreferrer">
          Portaria GM/MS nº 3.523/1998 e Anexo I
        </a>
        . O responsável técnico adapta as rotinas à instalação e às normas
        vigentes.
      </p>
    </>
  )
}
