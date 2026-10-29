import Link from 'next/link'
import { notFound } from 'next/navigation'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { Bell, Building2, CalendarCheck, FileText, Pencil, Repeat, RotateCcw, Trash2 } from 'lucide-react'
import { fmtData, hojeISO, rotuloRecorrencia, situacao, somarMeses, TIPOS } from '@/lib/datas'
import { ItemForm } from '@/components/ItemForm'
import { textoStatus } from '@/components/ItemLinha'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Selo } from '@/components/ui/Selo'
import { Confirmar } from '@/components/ui/Confirmar'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'
import { Upload } from '@/components/ui/Upload'
import { concluirItem, excluirItem, reabrirItem, renovarItem, salvarItem } from '../actions'

export const dynamic = 'force-dynamic'

export default async function DetalheItem({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ editar?: string }>
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
  const ativo = item.status === 'ativo'
  const sugestao = item.recorrencia_meses ? somarMeses(item.vencimento, item.recorrencia_meses) : ''

  const tom = s === 'renovado' || s === 'concluido' ? 'neutro' : s

  return (
    <div style={{ maxWidth: 960 }}>
      <Cabecalho
        voltar={{ href: '/', rotulo: 'Vencimentos' }}
        titulo={item.titulo}
        subIcone={<Building2 size={14} aria-hidden />}
        sub={<>{cliente ? <Link href={`/?f=todos&cliente=${cliente.id}`}>{cliente.nome}</Link> : 'Sem cliente'} • {TIPOS[item.tipo]}</>}
        acao={<Link href={`/itens/${id}?editar=1`} className="btn sec"><Pencil size={16} />Editar</Link>}
      />

      <div className="grade-2">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Etiqueta data={item.vencimento} status={s} grande />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="muted">Vencimento</div>
              <div className="data-grande">{fmtData(item.vencimento)}</div>
              <div style={{ marginTop: 8 }}><Selo tom={tom}>{textoStatus(s, item.vencimento, hoje)}</Selo></div>
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
