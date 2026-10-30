import { BellRing } from 'lucide-react'
import { Casca } from '@/components/Casca'
import { AcompanhamentoForm } from '@/components/AcompanhamentoForm'
import { ItemLinha } from '@/components/ItemLinha'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { hojeISO, somarDias } from '@/lib/datas'

async function nada() { 'use server' }

// Demonstração dos acompanhamentos (não salva nada)
export default function DemoAcompanhamentos() {
  const hoje = hojeISO()
  const base = { tipo: 'acompanhamento', antecedencia_dias: 0, status: 'ativo', recorrencia_meses: null }
  const itens = [
    { ...base, id: 'a', titulo: 'Cobrar se compraram a peça do orçamento', vencimento: somarDias(hoje, -2), cliente_nome: 'ADM do Brasil' },
    { ...base, id: 'b', titulo: 'Voltar para ver se o ar da sala 3 foi arrumado', vencimento: hoje, cliente_nome: 'Hospital Santa Clara' },
    { ...base, id: 'c', titulo: 'Ligar para confirmar a visita técnica', vencimento: somarDias(hoje, 3), cliente_nome: null },
  ]
  return (
    <Casca empresa="ClimaTech (demonstração)" email="admin@climatech.com" nome="ClimaTech Admin" temEmpresa superadmin={false}>
      <Cabecalho titulo="Acompanhamentos" subIcone={<BellRing size={14} aria-hidden />} sub="2 para fazer hoje • 3 em aberto" />
      <div className="grade-2">
        <div>
          <h2>Para fazer <span className="opcional">(2)</span></h2>
          <div className="lista" style={{ marginBottom: 24 }}>{itens.slice(0, 2).map((i) => <ItemLinha key={i.id} item={i} hoje={hoje} />)}</div>
          <h2>Próximos <span className="opcional">(1)</span></h2>
          <div className="lista">{itens.slice(2).map((i) => <ItemLinha key={i.id} item={i} hoje={hoje} />)}</div>
        </div>
        <AcompanhamentoForm acao={nada} compacto clientes={[{ id: '1', nome: 'ADM do Brasil' }, { id: '2', nome: 'Hospital Santa Clara' }]} />
      </div>
    </Casca>
  )
}
