import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { ItemForm } from '@/components/ItemForm'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { salvarItem } from '../actions'

export default async function NovoItem({ searchParams }: { searchParams: Promise<{ cliente?: string; primeiro?: string; modelo?: string }> }) {
  const { cliente, primeiro, modelo } = await searchParams
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const [{ data: clientes }, { data: colaboradores }] = await Promise.all([
    supabase.from('clientes').select('id, nome').eq('empresa_id', ctx.empresa.id).order('nome'),
    supabase.from('colaboradores').select('id, nome, funcao').eq('empresa_id', ctx.empresa.id).eq('ativo', true).order('nome'),
  ])

  return (
    <div style={{ maxWidth: 880 }}>
      <Cabecalho
        voltar={{ href: '/', rotulo: 'Vencimentos' }}
        titulo={primeiro ? 'Cadastre seu primeiro vencimento' : 'Novo vencimento'}
        sub="Responda as 4 perguntas. O sistema cuida dos lembretes."
      />
      {primeiro && (
        <Aviso tipo="ok" titulo="Configuração concluída">
          Agora cadastre um documento, contrato ou manutenção que você precisa acompanhar.
        </Aviso>
      )}
      <ItemForm acao={salvarItem} clientes={clientes ?? []} colaboradores={colaboradores ?? []} clientePadrao={cliente} modeloInicial={modelo}
        modelos={ctx.empresa.modelos} antecedenciaPadrao={ctx.empresa.antecedencia_padrao} />
    </div>
  )
}
