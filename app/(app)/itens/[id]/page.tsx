import Link from 'next/link'
import { notFound } from 'next/navigation'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { Bell, BellRing, Building2, CalendarCheck, FileText, Pencil, Repeat, RotateCcw, Trash2 } from 'lucide-react'
import { ACOMPANHAMENTO, fmtData, hojeISO, ROTULO_TIPO, rotuloRecorrencia, situacao, somarMeses } from '@/lib/datas'
import { AcompanhamentoForm } from '@/components/AcompanhamentoForm'
import { ItemForm } from '@/components/ItemForm'
import { textoStatus } from '@/components/ItemLinha'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Selo } from '@/components/ui/Selo'
import { Confirmar } from '@/components/ui/Confirmar'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'
import { Upload } from '@/components/ui/Upload'
import { concluirItem, excluirItem, reabrirItem, renovarItem, salvarItem } from '../actions'
import { registrarContato, salvarDemanda } from '../../acompanhamentos/actions'
import { CATEGORIAS, ETAPAS, type Etapa } from '@/lib/demandas'
import { Aviso } from '@/components/ui/Aviso'

export const dynamic = 'force-dynamic'

export default async function DetalheItem({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ editar?: string; historico?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const hoje = hojeISO()

  const { data: item } = await supabase
    .from('itens').select('*, clientes(id, nome, telefone, contato)')
    .eq('id', id).eq('empresa_id', ctx.empresa.id).maybeSingle()
  if (!item) notFound()

  const cliente: any = Array.isArray(item.clientes) ? item.clientes[0] : item.clientes
  const acomp = item.tipo === ACOMPANHAMENTO

  if (acomp) {
    const paginaHistorico = Math.max(1, Math.min(100000, Math.floor(Number(sp.historico) || 1)))
    const [pessoas, clientes, vencimentos, eventos] = await Promise.all([
      supabase.from('perfis').select('user_id,nome,email').eq('empresa_id', ctx.empresa.id).order('nome'),
      supabase.from('clientes').select('id,nome').eq('empresa_id', ctx.empresa.id).order('nome'),
      supabase.from('itens').select('id,titulo,vencimento,cliente_id').eq('empresa_id', ctx.empresa.id).neq('tipo','acompanhamento').order('vencimento'),
      supabase.from('demanda_eventos').select('*', { count: 'exact' }).eq('empresa_id', ctx.empresa.id).eq('item_id', id).order('created_at', { ascending: false }).order('id').range((paginaHistorico - 1) * 30, paginaHistorico * 30 - 1),
    ])
    if (sp.editar) return <div className="demanda-form-wrap">
      <Cabecalho voltar={{ href: `/itens/${id}`, rotulo: 'Cancelar edição' }} titulo="Editar demanda" sub={item.titulo} />
      {pessoas.error || clientes.error || vencimentos.error ? <Aviso tipo="erro" titulo="Não foi possível carregar os dados">Atualize a página para tentar novamente.</Aviso> :
        <AcompanhamentoForm acao={salvarDemanda} clientes={clientes.data ?? []} responsaveis={pessoas.data ?? []} vinculos={vencimentos.data ?? []} item={item} />}
    </div>
    const responsavel = pessoas.data?.find(p => p.user_id === item.responsavel_id)
    const vinculo = vencimentos.data?.find(v => v.id === item.vinculo_item_id)
    const etapa = item.etapa_demanda as Etapa
    const s = situacao(item, hoje)
    const tom = s === 'concluido' || s === 'renovado' ? 'neutro' : s
    return <>
      <Cabecalho voltar={{ href: '/acompanhamentos', rotulo: 'Demandas e retornos' }} titulo={item.titulo}
        subIcone={<BellRing size={14} aria-hidden />} sub={cliente?.nome ?? 'Demanda interna'}
        acao={<Link className="btn sec" href={`/itens/${id}?editar=1`}><Pencil size={16} />Editar demanda</Link>} />
      <div className="grade-2">
        <div className="card">
          <div className="demanda-resumo"><Etiqueta data={item.vencimento} status={s} grande rotulo="Retorno em" />
            <div><span className="muted">Próximo retorno</span><div className="data-grande">{fmtData(item.vencimento)}</div>
              <Selo tom={tom}>{item.status === 'ativo' ? textoStatus(s,item.vencimento,hoje,item.tipo) : ETAPAS[etapa]}</Selo>
            </div>
          </div>
          <dl className="detalhes">
            <dt>Situação</dt><dd>{ETAPAS[etapa]}</dd>
            <dt>Tipo</dt><dd>{CATEGORIAS[item.categoria_demanda as keyof typeof CATEGORIAS]}</dd>
            <dt>Responsável</dt><dd>{responsavel?.nome || responsavel?.email || 'Definir responsável'}</dd>
            <dt>{item.status === 'ativo' ? 'Próxima ação' : 'Última ação prevista'}</dt><dd>{item.proxima_acao}</dd>
            {vinculo && <><dt>Vencimento relacionado</dt><dd><Link href={`/itens/${vinculo.id}`}>{vinculo.titulo}</Link><br />Prazo original: {fmtData(vinculo.vencimento)}. Independente da data deste retorno.</dd></>}
            {cliente && <><dt>Contato no cliente</dt><dd>{[cliente.contato,cliente.telefone].filter(Boolean).join(', ') || 'Não informado'}</dd></>}
            {item.descricao && <><dt>Observação</dt><dd className="demanda-texto">{item.descricao}</dd></>}
            <dt>Lembretes</dt><dd>{item.status === 'ativo' ? 'Incluída no resumo por e-mail conforme a configuração da empresa. Avisos continuam enquanto estiver pendente.' : 'Encerrada, sem novos lembretes.'}</dd>
          </dl>
          {item.status !== 'ativo' && <p className="muted">Para reabrir, registre o motivo e selecione uma situação em aberto com nova data de retorno.</p>}
          <form action={excluirItem}>
            <input type="hidden" name="id" value={id} />
            <Confirmar className="btn ghost" titulo="Excluir demanda?" texto="A demanda e seu histórico de contatos serão excluídos. O vencimento relacionado será preservado." destaque={item.titulo} confirmar="Excluir demanda"><Trash2 size={16} />Excluir demanda</Confirmar>
          </form>
        </div>
        <AcompanhamentoForm acao={registrarContato} clientes={[]} modo="contato" item={item} />
      </div>
      <section className="card demanda-historico">
        <h2>Histórico de contatos e alterações</h2>
        <p className="muted">Registros mais recentes primeiro. Demandas anteriores a esta atualização não têm os contatos antigos registrados.</p>
        {eventos.error ? <Aviso tipo="erro" titulo="Não foi possível carregar o histórico">Atualize a página para tentar novamente.</Aviso> : !eventos.data?.length ? <p>Ainda não há registros. Adicione o primeiro andamento.</p> : <ol className="demanda-eventos">
          {eventos.data.map(e => {
            const antes = e.dados?.anterior
            const atual = e.dados?.atual
            const nome = (uid: string) => pessoas.data?.find(p => p.user_id === uid)?.nome || pessoas.data?.find(p => p.user_id === uid)?.email || 'Responsável anterior'
            return <li key={e.id}>
              <strong>{e.tipo === 'contato' ? 'Contato ou andamento' : e.descricao}</strong>
              <div className="muted">{e.autor_nome} · {new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Cuiaba', dateStyle: 'short', timeStyle: 'short' }).format(new Date(e.created_at))}</div>
              {e.tipo === 'contato' && <p className="demanda-texto">{e.descricao}</p>}
              {atual && <ul>
                {(!antes || antes.etapa !== atual.etapa) && <li>Situação: {antes ? `${ETAPAS[antes.etapa as Etapa]} → ` : ''}{ETAPAS[atual.etapa as Etapa]}</li>}
                {(!antes || antes.retorno !== atual.retorno) && <li>Retorno: {antes ? `${fmtData(antes.retorno)} → ` : ''}{fmtData(atual.retorno)}</li>}
                {(!antes || antes.proxima_acao !== atual.proxima_acao) && <li>Próxima ação: {atual.proxima_acao}</li>}
                {(!antes || antes.responsavel_id !== atual.responsavel_id) && <li>Responsável: {nome(atual.responsavel_id)}</li>}
                {antes && antes.titulo !== atual.titulo && <li>Título: {atual.titulo}</li>}
                {antes && antes.descricao !== atual.descricao && <li>Observação: {atual.descricao || 'Removida'}</li>}
                {antes && antes.cliente_id !== atual.cliente_id && <li>Cliente: {clientes.data?.find(c => c.id === atual.cliente_id)?.nome || 'Sem cliente'}</li>}
                {antes && antes.categoria !== atual.categoria && <li>Tipo: {CATEGORIAS[atual.categoria as keyof typeof CATEGORIAS]}</li>}
                {antes && antes.vinculo_item_id !== atual.vinculo_item_id && <li>Vínculo: {vencimentos.data?.find(v => v.id === atual.vinculo_item_id)?.titulo || 'Sem vínculo'}</li>}
              </ul>}
            </li>
          })}
        </ol>}
        <div className="acoes demanda-paginacao">
          <span className="muted">{eventos.count ?? 0} registros · página {paginaHistorico}</span>
          {paginaHistorico > 1 && <Link className="btn sec" href={`/itens/${id}?historico=${paginaHistorico - 1}`}>Mais recentes</Link>}
          {paginaHistorico * 30 < (eventos.count ?? 0) && <Link className="btn sec" href={`/itens/${id}?historico=${paginaHistorico + 1}`}>Mais antigos</Link>}
        </div>
      </section>
    </>
  }

  if (sp.editar) {
    const { data: clientes } = await supabase
      .from('clientes').select('id, nome').eq('empresa_id', ctx.empresa.id).order('nome')
    return (
      <div style={{ maxWidth: 880 }}>
        <Cabecalho voltar={{ href: `/itens/${id}`, rotulo: 'Cancelar edição' }} titulo="Editar vencimento" sub={item.titulo} />
        <ItemForm acao={salvarItem} clientes={clientes ?? []} item={item} modelos={ctx.empresa.modelos} antecedenciaPadrao={ctx.empresa.antecedencia_padrao} />
      </div>
    )
  }

  const [{ data: historico }, anexoUrl] = await Promise.all([
    supabase
      .from('itens').select('id, vencimento, status, finalizado_em')
      .eq('empresa_id', ctx.empresa.id).eq('titulo', item.titulo)
      .eq(item.cliente_id ? 'cliente_id' : 'tipo', item.cliente_id ?? item.tipo)
      .neq('id', id).order('vencimento', { ascending: false }).limit(10),
    item.anexo_path
      ? supabase.storage.from('anexos').createSignedUrl(item.anexo_path, 3600).then((r) => r.data?.signedUrl ?? null)
      : Promise.resolve(null),
  ])

  const s = situacao(item, hoje)
  const { data: relacionadas } = await supabase.from('itens').select('id,titulo,status,vencimento')
    .eq('empresa_id', ctx.empresa.id).eq('tipo', ACOMPANHAMENTO).eq('vinculo_item_id', id).order('vencimento')
  const ativo = item.status === 'ativo'
  const sugestao = item.recorrencia_meses ? somarMeses(item.vencimento, item.recorrencia_meses) : ''

  const tom = s === 'renovado' || s === 'concluido' ? 'neutro' : s

  return (
    <div style={{ maxWidth: 960 }}>
      <Cabecalho
        voltar={{ href: '/', rotulo: 'Vencimentos' }}
        titulo={item.titulo}
        subIcone={<Building2 size={14} aria-hidden />}
        sub={<>{cliente ? <Link href={`/?f=todos&cliente=${cliente.id}`}>{cliente.nome}</Link> : 'Sem cliente'} • {ROTULO_TIPO[item.tipo]}</>}
        acao={<Link href={`/itens/${id}?editar=1`} className="btn sec"><Pencil size={16} />Editar</Link>}
      />

      <div className="grade-2">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Etiqueta data={item.vencimento} status={s} grande />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="muted">Vencimento</div>
              <div className="data-grande">{fmtData(item.vencimento)}</div>
              <div style={{ marginTop: 8 }}><Selo tom={tom}>{textoStatus(s, item.vencimento, hoje, item.tipo)}</Selo></div>
            </div>
          </div>
          <dl className="detalhes">
            <dt>Repetição</dt><dd style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Repeat size={14} aria-hidden />{rotuloRecorrencia(item.recorrencia_meses)}</dd>
            <dt>Primeiro aviso</dt><dd style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Bell size={14} aria-hidden />{item.antecedencia_dias} dias antes, por e-mail</dd>
            <dt>Google Agenda</dt><dd>{item.google_event_id ? 'Na agenda, com alerta' : 'Não conectada. Conecte em Ajustes.'}</dd>
            {item.descricao && (<><dt>Observações</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{item.descricao}</dd></>)}
            {cliente?.contato || cliente?.telefone ? (
              <><dt>Contato no cliente</dt><dd>{[cliente.contato, cliente.telefone].filter(Boolean).join(', ')}</dd></>
            ) : null}
            <dt>Documento</dt>
            <dd>{anexoUrl ? <a href={anexoUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><FileText size={14} aria-hidden />{item.anexo_nome}</a> : 'Nenhum anexo'}</dd>
          </dl>
          <hr className="separador" />
          <div className="acoes empilha">
            {ativo ? (
              <form action={concluirItem}>
                <input type="hidden" name="id" value={id} />
                <Confirmar className="btn sec" tom="info" titulo="Concluir sem renovar?"
                  texto="O item sai da lista de vencimentos e para de gerar lembretes. Você pode reabrir depois pelo histórico."
                  destaque={`${item.titulo} • vence em ${fmtData(item.vencimento)}`} confirmar="Concluir sem renovar">
                  <CalendarCheck size={16} />Concluir sem renovar
                </Confirmar>
              </form>
            ) : (
              <form action={reabrirItem}>
                <input type="hidden" name="id" value={id} />
                <BotaoEnviar className="btn sec" carregando="Reabrindo…"><RotateCcw size={16} />Reabrir vencimento</BotaoEnviar>
              </form>
            )}
            <form action={excluirItem}>
              <input type="hidden" name="id" value={id} />
              <Confirmar className="btn ghost" titulo="Excluir vencimento?"
                texto="Essa ação não pode ser desfeita. O documento anexado e o evento da agenda também serão removidos."
                destaque={`${item.titulo} • vence em ${fmtData(item.vencimento)}`} confirmar="Excluir vencimento">
                <Trash2 size={16} />Excluir
              </Confirmar>
            </form>
          </div>
        </div>

        {ativo ? (
          <form action={renovarItem} className="card">
            <h2>Renovar este vencimento</h2>
            <p className="muted">Fecha o vencimento atual e cria o próximo, com os lembretes já programados.</p>
            <input type="hidden" name="id" value={id} />
            <div className="campo" style={{ marginTop: 16 }}>
              <label htmlFor="novo_vencimento">Próximo vencimento</label>
              <input id="novo_vencimento" name="novo_vencimento" type="date" required defaultValue={sugestao} />
              <span className="dica">{sugestao ? `Sugerido pela repetição (${rotuloRecorrencia(item.recorrencia_meses).toLowerCase()}). Confira no documento novo.` : 'Informe a nova data que está no documento renovado.'}</span>
            </div>
            <div className="campo">
              <label>Documento renovado <span className="opcional">(opcional)</span></label>
              <Upload name="anexo" />
            </div>
            <BotaoEnviar className="btn grande cheio" carregando="Renovando…">Renovar e criar próximo vencimento</BotaoEnviar>
          </form>
        ) : <div />}
      </div>

      <section className="card demanda-historico">
        <h2>Demandas deste vencimento</h2>
        <p className="muted">Acompanhe aprovação, peças ou agendamento sem alterar o prazo original.</p>
        <Link className="btn sec" href={`/acompanhamentos/novo?vinculo=${id}`}><BellRing size={16} />Criar demanda relacionada</Link>
        {!!relacionadas?.length && <ul className="demanda-eventos">{relacionadas.map(d => <li key={d.id}><Link href={`/itens/${d.id}`}>{d.titulo}</Link> · {d.status === 'ativo' ? `retorno em ${fmtData(d.vencimento)}` : 'encerrada'}</li>)}</ul>}
      </section>

      {historico && historico.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h2>Histórico deste item</h2>
          <div className="tabela-wrap">
            <table>
              <thead><tr><th>Vencimento</th><th>Situação</th><th>Finalizado em</th></tr></thead>
              <tbody>
                {historico.map((h) => (
                  <tr key={h.id}>
                    <td><Link href={`/itens/${h.id}`}>{fmtData(h.vencimento)}</Link></td>
                    <td><Selo peq tom={h.status === 'ativo' ? 'info' : 'neutro'}>{h.status === 'ativo' ? 'Ativo' : h.status === 'renovado' ? 'Renovado' : 'Concluído'}</Selo></td>
                    <td className="sec">{h.finalizado_em ? fmtData(h.finalizado_em) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
