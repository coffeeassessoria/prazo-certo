import { Casca } from '@/components/Casca'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { SimularContato } from './SimularContato'

export const dynamic = 'force-dynamic'

export default function DemoRetorno() {
  return <Casca empresa="ClimaTech (demonstração)" email="admin@climatech.com" nome="Vanderlei" temEmpresa superadmin={false}>
    <Aviso titulo="Simulação de atendimento">Dados fictícios, guardados apenas nesta tela. Atualizar a página reinicia a simulação.</Aviso>
    <Cabecalho voltar={{ href:'/demo/acompanhamentos',rotulo:'Demandas e retornos' }} titulo="Aprovar troca do compressor da recepção" sub="Hospital Santa Clara · Orçamento 123" />
    <SimularContato />
  </Casca>
}
