import Link from 'next/link'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { ItemForm } from '@/components/ItemForm'
import { salvarItem } from '../actions'

export default async function NovoItem({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const { data: clientes } = await supabase
    .from('clientes').select('id, nome').eq('empresa_id', ctx.empresa.id).order('nome')

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Novo vencimento</h1>
          <div className="muted">Documento, contrato ou manutenção que precisa ser renovado</div>
        </div>
        <Link href="/" className="btn sec so-desktop">Voltar</Link>
      </div>
      <ItemForm acao={salvarItem} clientes={clientes ?? []} clientePadrao={cliente} />
    </>
  )
}
