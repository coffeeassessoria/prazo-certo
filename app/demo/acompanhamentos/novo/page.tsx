import { Casca } from '@/components/Casca'
import { AcompanhamentoForm } from '@/components/AcompanhamentoForm'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { hojeISO, somarDias } from '@/lib/datas'

async function demonstrar() { 'use server'; return { erro: 'Este é um cadastro de demonstração. Nenhum dado foi salvo.' } }

export const dynamic = 'force-dynamic'

export default function DemoCadastro() {
  return <Casca empresa="ClimaTech (demonstração)" email="admin@climatech.com" nome="Vanderlei" temEmpresa superadmin={false}>
    <div className="demanda-form-wrap">
      <Aviso titulo="Cadastro de demonstração">Experimente os exemplos de climatização. Os dados não serão salvos.</Aviso>
      <Cabecalho voltar={{ href: '/demo/acompanhamentos', rotulo: 'Demandas e retornos' }} titulo="Nova demanda" sub="Defina quem cuida, o próximo passo e quando retornar." />
      <AcompanhamentoForm acao={demonstrar} clientes={[{ id:'cliente',nome:'Hospital Santa Clara' }]} responsaveis={[{ user_id:'vanderlei',nome:'Vanderlei' }, { user_id:'ana',nome:'Ana' }]} responsavelPadrao="vanderlei"
        vinculos={[{ id:'preventiva', titulo:'Preventiva dos aparelhos da recepção', vencimento:somarDias(hojeISO(),14),cliente_id:'cliente' }]} />
    </div>
  </Casca>
}
