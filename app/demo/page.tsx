import Link from 'next/link'
import { Calendar, Plus, Search } from 'lucide-react'
import { ItemLinha } from '@/components/ItemLinha'
import { Casca } from '@/components/Casca'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Metrica } from '@/components/ui/Metrica'
import { Aviso } from '@/components/ui/Aviso'
import { fmtDataExtenso, hojeISO, somarDias } from '@/lib/datas'

// Demonstração com dados fictícios (sem login). Datas relativas a hoje.
export default function Demo() {
  const hoje = hojeISO()
  const itens = [
    { id: '1', titulo: 'PMOC - Frigorífico Boi Bom', tipo: 'documento', vencimento: somarDias(hoje, -9), antecedencia_dias: 30, status: 'ativo', recorrencia_meses: 12, cliente_nome: 'Frigorífico Boi Bom' },
    { id: '2', titulo: 'Laudo de qualidade do ar', tipo: 'documento', vencimento: somarDias(hoje, -2), antecedencia_dias: 15, status: 'ativo', recorrencia_meses: 6, cliente_nome: 'Hospital Santa Clara' },
    { id: '3', titulo: 'Preventiva - 12 splits', tipo: 'manutencao', vencimento: somarDias(hoje, 3), antecedencia_dias: 7, status: 'ativo', recorrencia_meses: 3, cliente_nome: 'Supermercado Sinop' },
    { id: '4', titulo: 'Contrato de manutenção anual', tipo: 'contrato', vencimento: somarDias(hoje, 14), antecedencia_dias: 30, status: 'ativo', recorrencia_meses: 12, cliente_nome: 'Agro Cerrado Grãos' },
    { id: '5', titulo: 'ART - Shopping Center Norte', tipo: 'documento', vencimento: somarDias(hoje, 78), antecedencia_dias: 30, status: 'ativo', recorrencia_meses: 12, cliente_nome: 'Shopping Center Norte' },
  ]
  return (
    <Casca empresa="ClimaTech (demonstração)" email="admin@climatech.com" nome="ClimaTech Admin" temEmpresa superadmin={false}>
      <Aviso titulo="Você está no ambiente de demonstração">
        Todos os dados são fictícios. <Link href="/login">Entrar no sistema</Link>
      </Aviso>
      <Cabecalho titulo="Vencimentos" subIcone={<Calendar size={14} aria-hidden />} sub={`Hoje, ${fmtDataExtenso(hoje)} • 67 itens ativos`}
        acao={<Link href="/demo/novo" className="btn so-desktop"><Plus size={16} />Novo vencimento</Link>} />
      <div className="metricas">
        <Metrica ativo tom="vencido" valor={12} rotulo="Vencidos" apoio="3 clientes" />
        <Metrica tom="atencao" valor={8} rotulo="Vencem logo" apoio="em 7 dias" />
        <Metrica tom="ok" valor={47} rotulo="Em dia" apoio="tudo certo" />
        <Metrica valor={67} rotulo="Ativos" apoio="total" />
      </div>
      <div className="filtros">
        <div className="busca"><Search size={18} aria-hidden /><input aria-label="Buscar" placeholder="Buscar por título ou cliente" /></div>
        <select aria-label="Cliente"><option>Todos os clientes</option></select>
        <select aria-label="Tipo"><option>Todos os tipos</option></select>
      </div>
      <div className="lista">{itens.map((i) => <ItemLinha key={i.id} item={i} hoje={hoje} />)}</div>
    </Casca>
  )
}
