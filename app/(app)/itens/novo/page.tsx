import Link from 'next/link'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { ItemForm } from '@/components/ItemForm'
import { salvarItem } from '../actions'

export default async function NovoItem({ searchParams }: { searchParams: Promise<{ cliente?: string; primeiro?: string }> }) {
  const { cliente, primeiro } = await searchParams
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const { data: clientes } = await supabase
    .from('clientes').select('id, nome').eq('empresa_id', ctx.empresa.id).order('nome')

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>{primeiro ? 'Cadastre seu primeiro vencimento' : 'Novo vencimento'}</h1>
          <div className="muted">Responda as 4 perguntas abaixo. O sistema cuida dos lembretes.</div>
        </div>
        <Link href="/" className="btn sec so-desktop">Voltar</Link>
      </div>
      {primeiro && <div className="aviso ok">Configuração concluída. Agora cadastre um documento, contrato ou manutenção que você precisa acompanhar.</div>}
      <ItemForm acao={salvarItem} clientes={clientes ?? []} clientePadrao={cliente}
        modelos={ctx.empresa.modelos} antecedenciaPadrao={ctx.empresa.antecedencia_padrao} />
    </>
  )
}
