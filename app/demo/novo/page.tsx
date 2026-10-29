import { Casca } from '@/components/Casca'
import { ItemForm } from '@/components/ItemForm'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { modelosPadrao } from '@/lib/modelos'

async function nada() { 'use server' }

// Demonstração do cadastro guiado (não salva nada)
export default function DemoNovo() {
  return (
    <Casca empresa="ClimaTech (demonstração)" email="admin@climatech.com" nome="ClimaTech Admin" temEmpresa superadmin={false}>
      <div style={{ maxWidth: 880 }}>
        <Cabecalho voltar={{ href: '/demo', rotulo: 'Vencimentos' }} titulo="Novo vencimento" sub="Responda as 4 perguntas. O sistema cuida dos lembretes." />
        <ItemForm acao={nada} clientes={[{ id: '1', nome: 'Frigorífico Boi Bom' }, { id: '2', nome: 'Hospital Santa Clara' }]} modelos={modelosPadrao('climatizacao')} antecedenciaPadrao={30} />
      </div>
    </Casca>
  )
}
