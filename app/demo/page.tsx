import Link from 'next/link'
import { ItemLinha } from '@/components/ItemLinha'
import { Casca } from '@/components/Casca'

// Página de demonstração com dados fictícios (pode ser removida depois)
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
    <Casca empresa="Empresa demonstração" email="demo@prazocerto.app" temEmpresa superadmin={false}>
      <div className="aviso info">Demonstração com dados fictícios. <Link href="/login">Entrar no sistema</Link></div>
      <div className="cabecalho">
        <div><h1>Vencimentos</h1><div className="muted">Hoje, 29/10/2026</div></div>
        <Link href="/login" className="btn so-desktop">Novo vencimento</Link>
      </div>
      <div className="metricas">
        <a className="metrica vencido"><span className="r">Vencidos</span><span className="n">2</span><span className="d">precisam de ação agora</span></a>
        <a className="metrica atencao"><span className="r">Vencem logo</span><span className="n">2</span><span className="d">dentro do prazo de aviso</span></a>
        <a className="metrica ok"><span className="r">Em dia</span><span className="n">4</span><span className="d">sem ação no momento</span></a>
        <a className="metrica todos ativo"><span className="r">Ativos</span><span className="n">8</span><span className="d">vencimentos acompanhados</span></a>
      </div>
      <div className="lista">{itens.map((i) => <ItemLinha key={i.id} item={i} hoje={hoje} />)}</div>
    </Casca>
  )
}
