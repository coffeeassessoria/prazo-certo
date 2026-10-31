import { Casca } from '@/components/Casca'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { PmocForm } from '@/components/ui/PmocForm'
import { exemploPmoc } from '@/lib/pmoc-demo'
async function demonstrar() {
  'use server'
  return {
    ok: true,
    msg: 'Demonstração: nenhum dado foi salvo. Na operação, o plano fica vinculado à unidade.',
  }
}
export const dynamic = 'force-dynamic'
export default function DemoPlano() {
  const s = exemploPmoc()
  return (
    <Casca
      empresa="ClimaTech (demonstração)"
      email="contato@exemplo.invalid"
      temEmpresa
      superadmin={false}
    >
      <div className="documento-form-wrap">
        <Aviso titulo="Formulário de demonstração">
          Experimente adicionar atividades. Nenhum dado será salvo.
        </Aviso>
        <Cabecalho
          titulo="Plano PMOC da unidade"
          voltar={{ href: '/demo/pmoc', rotulo: 'PMOC e documentos' }}
        />
        <PmocForm
          acao={demonstrar}
          plano={{ id: 'demo', unidade_id: 'demo', dados: s.plano }}
          unidades={[{ id: 'demo', nome: s.unidade.nome }]}
        />
      </div>
    </Casca>
  )
}
