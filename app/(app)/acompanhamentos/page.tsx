import Link from 'next/link'
import { BellRing, Plus } from 'lucide-react'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { ACOMPANHAMENTO, diasAte, hojeISO } from '@/lib/datas'
import { ItemLinha, type ItemLista } from '@/components/ItemLinha'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Vazio } from '@/components/ui/Vazio'

export const dynamic = 'force-dynamic'

export default async function Acompanhamentos() {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const hoje = hojeISO()

  const { data } = await supabase
    .from('itens')
    .select('id, titulo, tipo, vencimento, antecedencia_dias, status, recorrencia_meses, clientes(nome)')
    .eq('empresa_id', ctx.empresa.id).eq('tipo', ACOMPANHAMENTO).eq('status', 'ativo')
    .order('vencimento').limit(500)

  const itens: ItemLista[] = (data ?? []).map((i: any) => ({
    ...i, cliente_nome: (Array.isArray(i.clientes) ? i.clientes[0]?.nome : i.clientes?.nome) ?? null,
  }))
  const grupos = [
    { titulo: 'Atrasados', lista: itens.filter((i) => diasAte(i.vencimento, hoje) < 0) },
    { titulo: 'Para hoje', lista: itens.filter((i) => diasAte(i.vencimento, hoje) === 0) },
    { titulo: 'Próximos', lista: itens.filter((i) => diasAte(i.vencimento, hoje) > 0) },
  ].filter((g) => g.lista.length)
  const paraFazer = itens.filter((i) => i.vencimento <= hoje).length

  return (
    <>
      <Cabecalho
        titulo="Acompanhamentos"
        subIcone={<BellRing size={14} aria-hidden />}
        sub={itens.length
          ? `${paraFazer ? `${paraFazer} para fazer hoje • ` : ''}${itens.length} em aberto`
          : 'Retornos e cobranças que você não pode esquecer'}
        acao={itens.length ? <Link href="/acompanhamentos/novo" className="btn"><Plus size={16} />Novo acompanhamento</Link> : undefined}
      />

      {grupos.length ? grupos.map((g) => (
        <section key={g.titulo} style={{ marginBottom: 24 }}>
          <h2>{g.titulo} <span className="opcional">({g.lista.length})</span></h2>
          <div className="lista">{g.lista.map((i) => <ItemLinha key={i.id} item={i} hoje={hoje} />)}</div>
        </section>
      )) : (
        <Vazio icone={BellRing} titulo="Nenhum acompanhamento em aberto"
          texto='Use para lembrar de retornos curtos: "cobrar se compraram a peça em 3 dias" ou "voltar para ver se o ar foi arrumado".'>
          <Link href="/acompanhamentos/novo" className="btn"><Plus size={16} />Criar acompanhamento</Link>
        </Vazio>
      )}

      {itens.length > 0 && (
        <p className="muted">Os resolvidos ficam no <Link href="/?f=historico&tipo=acompanhamento">histórico</Link>.</p>
      )}
    </>
  )
}
