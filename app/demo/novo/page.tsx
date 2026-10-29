import { Casca } from '@/components/Casca'
import { ItemForm } from '@/components/ItemForm'
import { modelosPadrao } from '@/lib/modelos'

async function nada() { 'use server' }

// Demonstração do cadastro guiado (não salva nada)
export default function DemoNovo() {
  return (
    <Casca empresa="Empresa demonstração" email="demo@prazocerto.app" temEmpresa superadmin={false}>
      <div className="cabecalho"><div><h1>Novo vencimento</h1><div className="muted">Responda as 4 perguntas abaixo. O sistema cuida dos lembretes.</div></div></div>
      <ItemForm acao={nada} clientes={[{ id: '1', nome: 'Frigorífico Boi Bom' }, { id: '2', nome: 'Hospital Santa Clara' }]} modelos={modelosPadrao('climatizacao')} antecedenciaPadrao={30} />
    </Casca>
  )
}
