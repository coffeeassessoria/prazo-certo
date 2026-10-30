import Link from 'next/link'
import { BellRing, Calendar, CalendarClock, Plus, Search } from 'lucide-react'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { ACOMPANHAMENTO, fmtDataExtenso, hojeISO, situacao, TIPOS } from '@/lib/datas'
import { ItemLinha, type ItemLista } from '@/components/ItemLinha'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Metrica } from '@/components/ui/Metrica'
import { Vazio } from '@/components/ui/Vazio'

export const dynamic = 'force-dynamic'

type Busca = { f?: string; q?: string; cliente?: string; tipo?: string }

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
  else if (!historico) q = q.neq('tipo', ACOMPANHAMENTO)

  const [{ data }, { data: clientes }, { count: retornos }] = await Promise.all([
    q,
    supabase.from('clientes').select('id, nome').eq('empresa_id', ctx.empresa.id).order('nome'),
    supabase.from('itens').select('id', { count: 'exact', head: true })
      .eq('empresa_id', ctx.empresa.id).eq('tipo', ACOMPANHAMENTO).eq('status', 'ativo').lte('vencimento', hoje),
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
  const totalAtivos = cont.vencido + cont.atencao + cont.ok

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

  const clientesVencidos = new Set(itens.filter((i) => situacao(i, hoje) === 'vencido').map((i) => i.cliente_nome).filter(Boolean)).size

  // Primeiros passos: aparece até a empresa ter 3 vencimentos cadastrados
  const mostrarPassos = !historico && !sp.q && !sp.cliente && !sp.tipo && totalAtivos < 3
  const passos = [
    { feito: true, texto: 'Configurar sua empresa e os lembretes', href: '/bem-vindo?refazer=1' },
    { feito: (clientes ?? []).length > 0, texto: 'Cadastrar seus clientes', href: '/clientes?novo=1' },
    { feito: totalAtivos > 0, texto: 'Cadastrar o primeiro vencimento', href: '/itens/novo' },
    { feito: totalAtivos >= 3, texto: 'Cadastrar pelo menos 3 vencimentos', href: '/itens/novo' },
    { feito: false, texto: 'Enviar um e-mail de teste para conferir os lembretes', href: '/config' },
  ]

  return (
    <>
      <Cabecalho
        titulo={historico ? 'Histórico' : 'Vencimentos'}
        subIcone={<Calendar size={14} aria-hidden />}
        sub={historico ? 'Itens renovados ou concluídos' : `Hoje, ${fmtDataExtenso(hoje)} • ${totalAtivos} ${totalAtivos === 1 ? 'item ativo' : 'itens ativos'}`}
        acao={totalAtivos > 0 || historico ? <Link href="/itens/novo" className="btn so-desktop"><Plus size={16} />Novo vencimento</Link> : undefined}
      />

      {mostrarPassos && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2>Primeiros passos</h2>
          <p className="muted">Siga esta lista para deixar o sistema trabalhando por você. Ela some quando você terminar.</p>
          <ol className="checklist duas" style={{ marginTop: 12 }}>
            {passos.map((p, i) => (
              <li key={i}>
                {p.feito ? (
                  <span className="checklist-item is-checked"><span className="checklist-caixa">✓</span>{p.texto}</span>
                ) : (
                  <Link href={p.href} className="checklist-item"><span className="checklist-caixa">{i + 1}</span>{p.texto}</Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {!historico && !!retornos && (
        <Link href="/acompanhamentos" className="aviso aviso-link" style={{ marginBottom: 24 }}>
          <BellRing size={18} aria-hidden />
          <div><b>{retornos === 1 ? '1 retorno para fazer hoje' : `${retornos} retornos para fazer hoje`}</b>Abra os acompanhamentos para resolver ou adiar.</div>
        </Link>
      )}

      {!historico && (
        <div className="metricas">
          <Metrica href={link('vencido')} ativo={filtro === 'vencido'} tom="vencido" valor={cont.vencido} rotulo="Vencidos"
            apoio={clientesVencidos ? `${clientesVencidos} ${clientesVencidos === 1 ? 'cliente' : 'clientes'}` : 'nenhum atrasado'} />
          <Metrica href={link('atencao')} ativo={filtro === 'atencao'} tom="atencao" valor={cont.atencao} rotulo="Vencem logo" apoio="dentro do prazo de aviso" />
          <Metrica href={link('ok')} ativo={filtro === 'ok'} tom="ok" valor={cont.ok} rotulo="Em dia" apoio="tudo certo" />
          <Metrica href={link('todos')} ativo={filtro === 'todos'} valor={totalAtivos} rotulo="Ativos" apoio="total acompanhado" />
        </div>
      )}

      <form className="filtros" method="get" role="search">
        <input type="hidden" name="f" value={filtro} />
        <div className="busca">
          <Search size={18} aria-hidden />
          <input name="q" aria-label="Buscar" placeholder="Buscar por título ou cliente" defaultValue={sp.q ?? ''} />
        </div>
        <select name="cliente" aria-label="Cliente" defaultValue={sp.cliente ?? ''}>
          <option value="">Todos os clientes</option>
          {(clientes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select name="tipo" aria-label="Tipo" defaultValue={sp.tipo ?? ''}>
          <option value="">Todos os tipos</option>
          {Object.entries(TIPOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          {historico && <option value={ACOMPANHAMENTO}>Acompanhamento</option>}
        </select>
        <button className="btn sec"><Search size={16} />Buscar vencimentos</button>
      </form>

      {!historico && filtro === 'pendentes' && visiveis.length > 0 && (
        <p className="muted">Mostrando o que está vencido ou vence logo. <Link href={link('todos')}>Ver todos</Link> ou <Link href="/?f=historico">ver histórico</Link>.</p>
      )}

      {visiveis.length ? (
        <div className="lista">
          {visiveis.map((i) => <ItemLinha key={i.id} item={i} hoje={hoje} />)}
        </div>
      ) : filtro === 'pendentes' && itens.length ? (
        <Vazio icone={CalendarClock} titulo="Nada vencido nem vencendo logo" texto="Que bom. Os próximos vencimentos aparecem aqui quando entrarem no prazo de aviso.">
          <Link href={link('todos')} className="btn sec">Ver todos os vencimentos</Link>
        </Vazio>
      ) : (
        <Vazio titulo="Nenhum vencimento por aqui" texto="Que bom — ou cadastre o primeiro para começar a controlar.">
          <Link href="/itens/novo" className="btn">Cadastrar primeiro vencimento</Link>
        </Vazio>
      )}
    </>
  )
}
