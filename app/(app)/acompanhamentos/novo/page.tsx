import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { AcompanhamentoForm } from '@/components/AcompanhamentoForm'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { salvarAcompanhamento } from '../../itens/actions'

export default async function NovoAcompanhamento() {
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const { data: clientes } = await supabase
    .from('clientes').select('id, nome').eq('empresa_id', ctx.empresa.id).order('nome')
  return (
    <div style={{ maxWidth: 720 }}>
      <Cabecalho voltar={{ href: '/acompanhamentos', rotulo: 'Acompanhamentos' }} titulo="Novo acompanhamento"
        sub="Um lembrete curto para cobrar ou conferir algo daqui a alguns dias." />
      <AcompanhamentoForm acao={salvarAcompanhamento} clientes={clientes ?? []} />
    </div>
  )
}
