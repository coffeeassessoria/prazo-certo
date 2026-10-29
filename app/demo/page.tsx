import Link from 'next/link'
import { Suspense } from 'react'
import { ItemLinha } from '@/components/ItemLinha'
import { Abas, NavTopo } from '@/components/Navegacao'

const hoje = '2026-10-29'
const itens = [
  { id: '1', titulo: 'PMOC — Plano de manutenção', tipo: 'documento', vencimento: '2026-10-20', antecedencia_dias: 30, status: 'ativo', recorrencia_meses: 12, cliente_nome: 'Frigorífico Boi Bom' },
  { id: '2', titulo: 'Laudo de qualidade do ar', tipo: 'documento', vencimento: '2026-10-27', antecedencia_dias: 15, status: 'ativo', recorrencia_meses: 6, cliente_nome: 'Hospital Santa Clara' },
  { id: '3', titulo: 'Preventiva — 12 splits', tipo: 'manutencao', vencimento: '2026-11-03', antecedencia_dias: 7, status: 'ativo', recorrencia_meses: 3, cliente_nome: 'Supermercado Sinop' },
  { id: '4', titulo: 'Contrato de manutenção anual', tipo: 'contrato', vencimento: '2026-11-12', antecedencia_dias: 30, status: 'ativo', recorrencia_meses: 12, cliente_nome: 'Agro Cerrado Grãos' },
  { id: '5', titulo: 'Limpeza de chillers', tipo: 'manutencao', vencimento: '2027-01-15', antecedencia_dias: 15, status: 'ativo', recorrencia_meses: 6, cliente_nome: 'Frigorífico Boi Bom' },
]

export default function Demo() {
  return (
    <>
      <header className="topo">
        <Link href="/" className="marca">
          <img src="/icon-192.png" alt="" />
          <span className="textos"><span className="nome">Prazo Certo</span><span className="empresa">Arenales Climatização</span></span>
        </Link>
        <Suspense><NavTopo temEmpresa superadmin={false} /></Suspense>
        <form className="so-desktop"><button className="btn peq sec">Sair</button></form>
      </header>
      <main className="conteudo">
        <div className="cabecalho">
          <div><h1>Vencimentos</h1><div className="muted">Hoje, 29/10/2026</div></div>
          <Link href="#" className="btn so-desktop">Novo vencimento</Link>
        </div>
        <div className="status">
          <div className="proporcao"><span style={{ width: '25%', background: 'var(--vermelho)' }} /><span style={{ width: '25%', background: 'var(--ambar-vivo)' }} /><span style={{ width: '50%', background: 'var(--verde)' }} /></div>
          <div className="segmentos">
            <a className="segmento vencido ativo"><span className="n">2</span><span className="r">Vencidos</span></a>
            <a className="segmento atencao"><span className="n">2</span><span className="r">Vencem logo</span></a>
            <a className="segmento ok"><span className="n">4</span><span className="r">Em dia</span></a>
            <a className="segmento todos"><span className="n">8</span><span className="r">Todos</span></a>
          </div>
        </div>
        <div className="lista">{itens.map((i) => <ItemLinha key={i.id} item={i} hoje={hoje} />)}</div>
      </main>
      <Suspense><Abas superadmin={false} /></Suspense>
    </>
  )
}
