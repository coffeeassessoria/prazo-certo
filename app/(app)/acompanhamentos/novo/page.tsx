import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { AcompanhamentoForm } from '@/components/AcompanhamentoForm'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { salvarDemanda } from '../actions'

export default async function NovaDemanda({ searchParams }: { searchParams: Promise<{ vinculo?: string }> }) {
  const ctx = await exigirEmpresa()
  const sp = await searchParams
  const supabase = await createClient()
  const [clientes, pessoas, vencimentos] = await Promise.all([
    supabase.from('clientes').select('id,nome').eq('empresa_id', ctx.empresa.id).order('nome'),
    supabase.from('perfis').select('user_id,nome,email').eq('empresa_id', ctx.empresa.id).order('nome'),
    supabase.from('itens').select('id,titulo,vencimento,cliente_id').eq('empresa_id', ctx.empresa.id).neq('tipo','acompanhamento').order('vencimento'),
  ])
  const vinculo = vencimentos.data?.find(v => v.id === sp.vinculo)
  return <div className="demanda-form-wrap">
    <Cabecalho voltar={{ href: '/acompanhamentos', rotulo: 'Demandas e retornos' }} titulo="Nova demanda"
      sub="Defina quem cuida, o próximo passo e quando retornar." />
    {clientes.error || pessoas.error || vencimentos.error ? <Aviso tipo="erro" titulo="Não foi possível carregar os dados">Atualize a página para tentar novamente.</Aviso> :
      <AcompanhamentoForm acao={salvarDemanda} clientes={clientes.data ?? []} responsaveis={pessoas.data ?? []}
        vinculos={vencimentos.data ?? []} responsavelPadrao={ctx.userId} item={vinculo ? {
          vinculo_item_id: vinculo.id, cliente_id: vinculo.cliente_id, titulo: `Acompanhar ${vinculo.titulo}`,
          categoria_demanda: 'agendamento', proxima_acao: 'Entrar em contato para combinar o atendimento',
        } : {}} />}
  </div>
}
