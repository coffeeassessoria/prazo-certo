import Link from 'next/link'
import { notFound } from 'next/navigation'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { fmtData, hojeISO, rotuloRecorrencia, situacao, somarMeses, textoPrazo, TIPOS } from '@/lib/datas'
import { ItemForm } from '@/components/ItemForm'
import { BotaoConfirmar } from '@/components/BotaoConfirmar'
import { concluirItem, excluirItem, reabrirItem, renovarItem, salvarItem } from '../actions'

export const dynamic = 'force-dynamic'

export default async function DetalheItem({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ editar?: string; ok?: string }>
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

  if (sp.editar) {
    const { data: clientes } = await supabase
      .from('clientes').select('id, nome').eq('empresa_id', ctx.empresa.id).order('nome')
    return (
      <>
        <div className="cabecalho">
          <h1>Editar</h1>
          <Link href={`/itens/${id}`} className="btn sec">Cancelar</Link>
        </div>
        <ItemForm acao={salvarItem} clientes={clientes ?? []} item={item} />
      </>
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
  const ativo = item.status === 'ativo'
  const sugestao = item.recorrencia_meses ? somarMeses(item.vencimento, item.recorrencia_meses) : ''

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>{item.titulo}</h1>
          <div className="muted">
            {cliente ? <Link href={`/?f=todos&cliente=${cliente.id}`}>{cliente.nome}</Link> : 'Sem cliente'}, {TIPOS[item.tipo].toLowerCase()}
          </div>
        </div>
        <Link href="/" className="btn sec so-desktop">Voltar</Link>
      </div>

      {sp.ok && <div className="aviso ok">Salvo com sucesso.</div>}

      <div className="grade">
        <div className="card">
          <div className="acoes" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="muted">Vencimento</div>
              <div className="data-grande">{fmtData(item.vencimento)}</div>
            </div>
            <span className={`selo ${s}`} style={{ fontSize: 14 }}>
              {ativo ? textoPrazo(item.vencimento, hoje) : s === 'renovado' ? 'Renovado' : 'Concluído'}
            </span>
          </div>
          <dl className="detalhes">
            <dt>Repetição</dt><dd>{rotuloRecorrencia(item.recorrencia_meses)}</dd>
            <dt>Aviso</dt><dd>{item.antecedencia_dias} dias antes</dd>
            <dt>Google Agenda</dt><dd>{item.google_event_id ? 'Na agenda, com alerta' : 'Não sincronizada. Conecte em Configurações.'}</dd>
            {item.descricao && (<><dt>Observações</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{item.descricao}</dd></>)}
            {cliente?.contato || cliente?.telefone ? (
              <><dt>Contato no cliente</dt><dd>{[cliente.contato, cliente.telefone].filter(Boolean).join(', ')}</dd></>
            ) : null}
            <dt>Anexo</dt>
            <dd>{anexoUrl ? <a href={anexoUrl} target="_blank" rel="noreferrer">{item.anexo_nome}</a> : '—'}</dd>
          </dl>
          <div className="acoes empilha" style={{ marginTop: 18 }}>
            <Link href={`/itens/${id}?editar=1`} className="btn sec">Editar</Link>
            {ativo ? (
              <form action={concluirItem}>
                <input type="hidden" name="id" value={id} />
                <BotaoConfirmar className="btn sec" mensagem="Marcar como concluído (não vai mais repetir)?">Concluir sem renovar</BotaoConfirmar>
              </form>
            ) : (
              <form action={reabrirItem}>
                <input type="hidden" name="id" value={id} />
                <BotaoConfirmar className="btn sec">Reabrir</BotaoConfirmar>
              </form>
            )}
            <form action={excluirItem}>
              <input type="hidden" name="id" value={id} />
              <BotaoConfirmar className="btn perigo" mensagem="Excluir este item definitivamente?">Excluir</BotaoConfirmar>
            </form>
          </div>
        </div>

        {ativo && (
          <form action={renovarItem} className="card">
            <h2>Marcar como renovado</h2>
            <p className="muted">Fecha este vencimento e cria o próximo, já com aviso na agenda.</p>
            <input type="hidden" name="id" value={id} />
            <div className="linha">
              <div className="campo">
                <label htmlFor="novo_vencimento">Próximo vencimento *</label>
                <input id="novo_vencimento" name="novo_vencimento" type="date" required defaultValue={sugestao} />
                {sugestao && <span className="dica">Sugerido pela repetição ({rotuloRecorrencia(item.recorrencia_meses).toLowerCase()})</span>}
              </div>
              <div className="campo">
                <label htmlFor="anexo_r">Novo documento (opcional)</label>
                <input id="anexo_r" name="anexo" type="file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
              </div>
            </div>
            <BotaoConfirmar className="btn sucesso cheio">Renovar e criar próximo vencimento</BotaoConfirmar>
          </form>
        )}

        {historico && historico.length > 0 && (
          <div className="card">
            <h2>Histórico deste item</h2>
            <div className="tabela-wrap">
              <table>
                <thead><tr><th>Vencimento</th><th>Situação</th><th>Finalizado em</th></tr></thead>
                <tbody>
                  {historico.map((h) => (
                    <tr key={h.id}>
                      <td><Link href={`/itens/${h.id}`}>{fmtData(h.vencimento)}</Link></td>
                      <td>{h.status === 'ativo' ? 'Ativo' : h.status === 'renovado' ? 'Renovado' : 'Concluído'}</td>
                      <td>{h.finalizado_em ? fmtData(h.finalizado_em) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
