import { Casca } from '@/components/Casca'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { IdentidadeForm } from '@/components/ui/IdentidadeForm'
import { exemploPmoc } from '@/lib/pmoc-demo'
async function demonstrar() {
  'use server'
  return {
    ok: true,
    msg: 'Demonstração: nenhum arquivo foi armazenado. Na operação, o administrador salva o logo e o timbrado da empresa.',
  }
}
export const dynamic = 'force-dynamic'
export default function DemoIdentidade() {
  return (
    <Casca
      empresa="ClimaTech (demonstração)"
      email="contato@exemplo.invalid"
      temEmpresa
      superadmin={false}
    >
      <div className="demanda-form-wrap">
        <Aviso titulo="Identidade de demonstração">
          Você pode experimentar a prévia de um logo. Nenhum arquivo será
          armazenado.
        </Aviso>
        <Cabecalho
          titulo="Logo e timbrado em A4"
          voltar={{ href: '/demo/pmoc', rotulo: 'PMOC e documentos' }}
        />
        <IdentidadeForm
          acao={demonstrar}
          identidade={exemploPmoc().identidade}
          logoUrl="/demo/logo-climatech.png"
        />
      </div>
    </Casca>
  )
}
