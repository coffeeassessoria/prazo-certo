import { Casca } from '@/components/Casca'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { InventarioUnidade } from '@/components/ui/InventarioUnidade'
import { exemploPmoc } from '@/lib/pmoc-demo'
async function demonstrar() {
  'use server'
  return {
    ok: true,
    msg: 'Demonstração: nenhum cadastro foi salvo. Na operação, o inventário fica vinculado à unidade do cliente.',
  }
}
export const dynamic = 'force-dynamic'
export default async function DemoInventario({
  searchParams,
}: {
  searchParams: Promise<{ ambiente?: string; equipamento?: string }>
}) {
  const sp = await searchParams,
    s = exemploPmoc()
  return (
    <Casca
      empresa="ClimaTech (demonstração)"
      email="contato@exemplo.invalid"
      temEmpresa
      superadmin={false}
    >
      <Aviso titulo="Inventário de demonstração">
        Experimente os cadastros de ambiente e aparelho. Nenhum dado será salvo.
      </Aviso>
      <Cabecalho
        titulo="Unidade Centro"
        sub="Clínica Boa Vista · ambientes e equipamentos"
        voltar={{ href: '/demo/pmoc', rotulo: 'PMOC e documentos' }}
      />
      <InventarioUnidade
        id="demo"
        ambientes={s.ambientes}
        equipamentos={s.equipamentos}
        ambienteEditando={sp.ambiente}
        equipamentoEditando={sp.equipamento}
        salvarAmbiente={demonstrar}
        salvarEquipamento={demonstrar}
        baseHref="/demo/pmoc/unidade"
      />
    </Casca>
  )
}
