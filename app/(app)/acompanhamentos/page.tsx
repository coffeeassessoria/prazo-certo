import Link from 'next/link'
import { BellRing, Plus, Search } from 'lucide-react'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { ACOMPANHAMENTO, diasAte, hojeISO } from '@/lib/datas'
import { ETAPAS } from '@/lib/demandas'
import { ItemLinha, type ItemLista } from '@/components/ItemLinha'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Vazio } from '@/components/ui/Vazio'
import { Metrica } from '@/components/ui/Metrica'
import { Aviso } from '@/components/ui/Aviso'

export const dynamic = 'force-dynamic'
type Busca = { f?: string; responsavel?: string; etapa?: string; cliente?: string; q?: string; pagina?: string }

export default async function Acompanhamentos({ searchParams }: { searchParams: Promise<Busca> }) {
  const sp = await searchParams
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const hoje = hojeISO()
  const encerradas = sp.f === 'encerradas'
  const pagina = Math.max(1, Math.min(100000, Math.floor(Number(sp.pagina) || 1)))
  const base = () => supabase.from('itens').select('id', { count: 'exact', head: true })
    .eq('empresa_id', ctx.empresa.id).eq('tipo', ACOMPANHAMENTO).eq('status', 'ativo')
  let q = supabase.from('itens')
    .select('id,titulo,tipo,vencimento,antecedencia_dias,status,recorrencia_meses,cliente_id,proxima_acao,etapa_demanda,categoria_demanda,responsavel_id,clientes(nome)', { count: 'exact' })
    .eq('empresa_id', ctx.empresa.id).eq('tipo', ACOMPANHAMENTO)
    .eq('status', encerradas ? 'concluido' : 'ativo').order('vencimento', { ascending: !encerradas }).order('id')
  if (sp.f === 'hoje') q = q.lte('vencimento', hoje)
  if (sp.f === 'atrasadas') q = q.lt('vencimento', hoje)
  if (sp.responsavel) q = q.eq('responsavel_id', sp.responsavel === 'eu' ? ctx.userId : sp.responsavel)
  if (sp.cliente) q = q.eq('cliente_id', sp.cliente)
  if (sp.etapa && sp.etapa in ETAPAS) q = q.eq('etapa_demanda', sp.etapa)
  const termo = (sp.q ?? '').replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim().slice(0, 80)
  if (termo) q = q.or(`titulo.ilike.%${termo}%,proxima_acao.ilike.%${termo}%`)
  const [lista, pessoas, clientes, atrasadas, paraHoje, minhas, abertas] = await Promise.all([
    q.range((pagina - 1) * 50, pagina * 50 - 1),
    supabase.from('perfis').select('user_id,nome,email').eq('empresa_id', ctx.empresa.id).order('nome'),
    supabase.from('clientes').select('id,nome').eq('empresa_id', ctx.empresa.id).order('nome'),
    base().lt('vencimento', hoje), base().eq('vencimento', hoje),
    base().eq('responsavel_id', ctx.userId).lte('vencimento', hoje), base(),
  ])
  const itens: ItemLista[] = (lista.data ?? []).map((i: any) => ({ ...i,
    cliente_nome: (Array.isArray(i.clientes) ? i.clientes[0]?.nome : i.clientes?.nome) ?? null,
    responsavel_nome: pessoas.data?.find(p => p.user_id === i.responsavel_id)?.nome || pessoas.data?.find(p => p.user_id === i.responsavel_id)?.email || 'Definir responsável',
  }))
  const grupos = encerradas ? [{ titulo: 'Encerradas', lista: itens }] : [
    { titulo: 'Atrasadas', lista: itens.filter(i => diasAte(i.vencimento, hoje) < 0) },
    { titulo: 'Para hoje', lista: itens.filter(i => i.vencimento === hoje) },
    { titulo: 'Próximas', lista: itens.filter(i => i.vencimento > hoje) },
  ]
  const linkPagina = (p: number) => {
    const params = new URLSearchParams(Object.entries(sp).filter(([k,v]) => k !== 'pagina' && !!v) as [string,string][])
    params.set('pagina', String(p)); return `/acompanhamentos?${params}`
  }
  return <>
    <Cabecalho titulo="Demandas e retornos" subIcone={<BellRing size={14} aria-hidden />}
      sub="Orçamentos, peças, visitas e retornos da sua empresa de climatização."
      acao={<Link href="/acompanhamentos/novo" className="btn"><Plus size={16} />Nova demanda</Link>} />
    <div className="metricas">
      <Metrica href="/acompanhamentos?f=atrasadas" tom="vencido" valor={atrasadas.count ?? 0} rotulo="Atrasadas" apoio="na empresa" />
      <Metrica href="/acompanhamentos?f=hoje" tom="atencao" valor={paraHoje.count ?? 0} rotulo="Para hoje" apoio="mais as atrasadas ao abrir" />
      <Metrica href="/acompanhamentos?f=hoje&responsavel=eu" valor={minhas.count ?? 0} rotulo="Meus retornos" apoio="hoje e atrasados" />
      <Metrica href="/acompanhamentos" valor={abertas.count ?? 0} rotulo="Em aberto" apoio="total na empresa" />
    </div>
    <form className="filtros demanda-filtros" method="get" role="search">
      <div className="busca"><Search size={18} aria-hidden /><input name="q" aria-label="Buscar demanda ou próxima ação" placeholder="Buscar demanda ou próxima ação" defaultValue={sp.q ?? ''} /></div>
      <select name="f" aria-label="Período" defaultValue={sp.f ?? ''}>
        <option value="">Todas em aberto</option><option value="hoje">Hoje e atrasadas</option><option value="atrasadas">Só atrasadas</option><option value="encerradas">Encerradas</option>
      </select>
      <select name="responsavel" aria-label="Responsável" defaultValue={sp.responsavel ?? ''}>
        <option value="">Todos os responsáveis</option><option value="eu">Minhas demandas</option>
        {pessoas.data?.map(p => <option key={p.user_id} value={p.user_id}>{p.nome || p.email}</option>)}
      </select>
      <select name="cliente" aria-label="Cliente" defaultValue={sp.cliente ?? ''}>
        <option value="">Todos os clientes</option>{clientes.data?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <select name="etapa" aria-label="Situação" defaultValue={sp.etapa ?? ''}>
        <option value="">Todas as situações</option>{Object.entries(ETAPAS).map(([v,r]) => <option key={v} value={v}>{r}</option>)}
      </select>
      <button className="btn sec"><Search size={16} />Filtrar demandas</button>
      <Link href="/acompanhamentos" className="btn ghost">Limpar filtros</Link>
    </form>
    {lista.error ? <Aviso tipo="erro" titulo="Não foi possível carregar as demandas">Tente novamente. Se persistir, peça ao administrador para conferir a atualização do banco.</Aviso>
      : itens.length ? grupos.filter(g => g.lista.length).map(g => <section className="demanda-grupo" key={g.titulo}>
        <h2>{g.titulo} <span className="opcional">({g.lista.length} nesta página)</span></h2>
        <div className="lista">{g.lista.map(i => <ItemLinha key={i.id} item={i} hoje={hoje} />)}</div>
      </section>) : <Vazio icone={BellRing} titulo="Nenhuma demanda nesta seleção" texto="Ajuste os filtros ou registre um orçamento, uma visita ou um retorno ao cliente." />}
    {!lista.error && <div className="acoes demanda-paginacao">
      <span className="muted">{lista.count ?? 0} demandas encontradas · página {pagina}</span>
      {pagina > 1 && <Link className="btn sec" href={linkPagina(pagina - 1)}>Anterior</Link>}
      {pagina * 50 < (lista.count ?? 0) && <Link className="btn sec" href={linkPagina(pagina + 1)}>Próxima</Link>}
    </div>}
  </>
}
