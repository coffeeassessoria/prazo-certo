import Link from 'next/link'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { hojeISO, situacao, TIPOS } from '@/lib/datas'
import { ItemLinha, type ItemLista } from '@/components/ItemLinha'

export const dynamic = 'force-dynamic'

type Busca = { f?: string; q?: string; cliente?: string; tipo?: string; ok?: string }

export default async function Painel({ searchParams }: { searchParams: Promise<Busca> }) {
  const sp = await searchParams
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const hoje = hojeISO()
  const filtro = sp.f || 'pendentes'
  const historico = filtro === 'historico'

  let q = supabase
    .from('itens')
    .select('id, titulo, tipo, vencimento, antecedencia_dias, status, recorrencia_meses, cliente_id, clientes(nome)')
    .eq('empresa_id', ctx.empresa.id)
    .in('status', historico ? ['renovado', 'concluido'] : ['ativo'])
    .order('vencimento', { ascending: !historico })
    .limit(historico ? 200 : 1000)
  if (sp.cliente) q = q.eq('cliente_id', sp.cliente)
  if (sp.tipo) q = q.eq('tipo', sp.tipo)

  const [{ data }, { data: clientes }] = await Promise.all([
    q,
    supabase.from('clientes').select('id, nome').eq('empresa_id', ctx.empresa.id).order('nome'),
  ])

  let itens: ItemLista[] = (data ?? []).map((i: any) => ({
    ...i,
    cliente_nome: (Array.isArray(i.clientes) ? i.clientes[0]?.nome : i.clientes?.nome) ?? null,
  }))
  if (sp.q) {
    const t = sp.q.toLowerCase()
    itens = itens.filter((i) => i.titulo.toLowerCase().includes(t) || (i.cliente_nome ?? '').toLowerCase().includes(t))
  }

  const cont = { vencido: 0, atencao: 0, ok: 0 }
  if (!historico) for (const i of itens) cont[situacao(i, hoje) as 'vencido' | 'atencao' | 'ok']++

  const visiveis = historico
    ? itens
    : itens.filter((i) => {
        const s = situacao(i, hoje)
        if (filtro === 'pendentes') return s === 'vencido' || s === 'atencao'
        if (filtro === 'todos') return true
        return s === filtro
      })

  const link = (f: string) => {
    const p = new URLSearchParams()
    p.set('f', f)
    if (sp.cliente) p.set('cliente', sp.cliente)
    if (sp.tipo) p.set('tipo', sp.tipo)
    return `/?${p}`
  }

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>{historico ? 'Histórico' : 'Vencimentos'}</h1>
          <div className="muted">
            {historico ? 'Itens renovados ou concluídos' : `Hoje, ${hoje.split('-').reverse().join('/')}`}
          </div>
        </div>
        <Link href="/itens/novo" className="btn so-desktop">Novo vencimento</Link>
      </div>

      {sp.ok && <div className="aviso ok">{sp.ok === 'renovado' ? 'Renovado! O próximo vencimento já foi criado.' : 'Salvo com sucesso.'}</div>}

      {!historico && (() => {
        const total = cont.vencido + cont.atencao + cont.ok
        const met = (f: string, n: number, rot: string, desc: string) => (
          <Link href={link(f)} className={`metrica ${f} ${filtro === f ? 'ativo' : ''}`}>
            <span className="r">{rot}</span>
            <span className="n">{n}</span>
            <span className="d">{desc}</span>
          </Link>
        )
        return (
          <div className="metricas">
            {met('vencido', cont.vencido, 'Vencidos', 'precisam de ação agora')}
            {met('atencao', cont.atencao, 'Vencem logo', 'dentro do prazo de aviso')}
            {met('ok', cont.ok, 'Em dia', 'sem ação no momento')}
            {met('todos', total, 'Ativos', 'vencimentos acompanhados')}
          </div>
        )
      })()}

      <form className="filtros" method="get">
        <input type="hidden" name="f" value={filtro} />
        <input name="q" placeholder="Buscar por título ou cliente…" defaultValue={sp.q ?? ''} />
        <select name="cliente" defaultValue={sp.cliente ?? ''}>
          <option value="">Todos os clientes</option>
          {(clientes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select name="tipo" defaultValue={sp.tipo ?? ''}>
          <option value="">Todos os tipos</option>
          {Object.entries(TIPOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <button className="btn sec">Filtrar</button>
      </form>

      {!historico && filtro === 'pendentes' && (
        <p className="muted">Mostrando o que está vencido ou vence em breve. <Link href={link('todos')}>Ver todos</Link> ou <Link href="/?f=historico">histórico</Link>.</p>
      )}

      {visiveis.length ? (
        <div className="lista">
          {visiveis.map((i) => <ItemLinha key={i.id} item={i} hoje={hoje} />)}
        </div>
      ) : (
        <div className="card vazio">
          {filtro === 'pendentes' && itens.length ? (
            <><h2>Tudo em dia</h2><p>Nada vencido nem vencendo nos próximos dias.</p></>
          ) : (
            <><h2>Nenhum vencimento aqui</h2><p>Cadastre o primeiro documento, contrato ou manutenção que precisa renovar.</p></>
          )}
          <Link href="/itens/novo" className="btn">Cadastrar vencimento</Link>
        </div>
      )}
    </>
  )
}
