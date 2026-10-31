import Link from 'next/link'
import { notFound } from 'next/navigation'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { InventarioUnidade } from '@/components/ui/InventarioUnidade'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { salvarAmbiente, salvarEquipamento } from '../actions'
export const dynamic = 'force-dynamic'
export default async function Unidade({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ambiente?: string; equipamento?: string }>
}) {
  const ctx = await exigirEmpresa(),
    { id } = await params,
    sp = await searchParams,
    supabase = await createClient()
  const [unidade, ambientes, equipamentos] = await Promise.all([
    supabase
      .from('unidades')
      .select('*')
      .eq('empresa_id', ctx.empresa.id)
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('ambientes')
      .select('*')
      .eq('empresa_id', ctx.empresa.id)
      .eq('unidade_id', id)
      .order('nome'),
    supabase
      .from('equipamentos')
      .select('*')
      .eq('empresa_id', ctx.empresa.id)
      .eq('unidade_id', id)
      .order('tag'),
  ])
  if (unidade.error)
    return (
      <Aviso tipo="erro" titulo="Não foi possível carregar a unidade">
        Confira a atualização do banco.
      </Aviso>
    )
  if (!unidade.data) notFound()
  return (
    <>
      <Cabecalho
        titulo={unidade.data.nome}
        sub={unidade.data.endereco || 'Complete o endereço da unidade.'}
        voltar={{ href: '/unidades', rotulo: 'Unidades' }}
        acao={
          <Link className="btn" href={`/pmoc/novo?unidade=${id}`}>
            Criar plano PMOC
          </Link>
        }
      />
      <Link className="btn sec" href={`/unidades?editar=${id}`}>
        Editar unidade e representante
      </Link>
      {ambientes.error || equipamentos.error ? (
        <Aviso tipo="erro" titulo="Não foi possível carregar o inventário">
          Atualize a página para tentar novamente.
        </Aviso>
      ) : (
        <>
          <InventarioUnidade
            id={id}
            ambientes={ambientes.data ?? []}
            equipamentos={equipamentos.data ?? []}
            ambienteEditando={sp.ambiente}
            equipamentoEditando={sp.equipamento}
            salvarAmbiente={salvarAmbiente}
            salvarEquipamento={salvarEquipamento}
          />
        </>
      )}
    </>
  )
}
