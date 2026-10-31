import Link from 'next/link'
import { BellRing, Plus } from 'lucide-react'
import { Casca } from '@/components/Casca'
import { ItemLinha } from '@/components/ItemLinha'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Metrica } from '@/components/ui/Metrica'
import { Aviso } from '@/components/ui/Aviso'
import { hojeISO, somarDias } from '@/lib/datas'

export const dynamic = 'force-dynamic'

export default function DemoDemandas() {
  const hoje = hojeISO()
  const base = { tipo: 'acompanhamento', antecedencia_dias: 0, status: 'ativo', recorrencia_meses: null, href: '/demo/acompanhamentos/retorno' }
  const itens = [
    { ...base, id: 'a', titulo: 'Aprovar troca do compressor da recepção', vencimento: somarDias(hoje, -2), cliente_nome: 'Hospital Santa Clara', etapa_demanda: 'aguardando_cliente' as const, categoria_demanda: 'orcamento' as const, responsavel_nome: 'Vanderlei', proxima_acao: 'Ligar para o João e confirmar aprovação do orçamento 123' },
    { ...base, id: 'b', titulo: 'Confirmar chegada do motor do ventilador', vencimento: hoje, cliente_nome: 'Mercado Central', etapa_demanda: 'aguardando_fornecedor' as const, categoria_demanda: 'peca' as const, responsavel_nome: 'Ana', proxima_acao: 'Consultar a previsão de entrega com a distribuidora' },
    { ...base, id: 'c', titulo: 'Agendar a próxima manutenção preventiva', vencimento: somarDias(hoje, 3), cliente_nome: 'Clínica Boa Vista', etapa_demanda: 'a_fazer' as const, categoria_demanda: 'agendamento' as const, responsavel_nome: 'Vanderlei', proxima_acao: 'Combinar a visita e confirmar a liberação de acesso' },
  ]
  return <Casca empresa="ClimaTech (demonstração)" email="admin@climatech.com" nome="Vanderlei" temEmpresa superadmin={false}>
    <Aviso titulo="Demonstração de demandas de climatização">Dados fictícios. Abra uma demanda para simular um contato ou <Link href="/demo/acompanhamentos/novo">experimente o cadastro</Link>.</Aviso>
    <Cabecalho titulo="Demandas e retornos" sub="Orçamentos, peças, visitas e retornos da sua empresa de climatização." subIcone={<BellRing size={14} aria-hidden />}
      acao={<Link href="/demo/acompanhamentos/novo" className="btn"><Plus size={16} />Nova demanda</Link>} />
    <div className="metricas">
      <Metrica tom="vencido" valor={1} rotulo="Atrasadas" apoio="na empresa" />
      <Metrica tom="atencao" valor={1} rotulo="Para hoje" apoio="retorno combinado" />
      <Metrica valor={1} rotulo="Meus retornos" apoio="hoje e atrasados" />
      <Metrica valor={3} rotulo="Em aberto" apoio="total na empresa" />
    </div>
    {itens.map((item,i) => <section key={item.id} className="demanda-grupo"><h2>{['Atrasadas','Para hoje','Próximas'][i]}</h2><div className="lista"><ItemLinha item={item} hoje={hoje} /></div></section>)}
  </Casca>
}
