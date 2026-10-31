import Link from 'next/link'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { PmocForm } from '@/components/ui/PmocForm'
import { salvarPlano } from '../actions'
export default async function NovoPmoc({
  searchParams,
}: {
  searchParams: Promise<{ unidade?: string }>
}) {
  const ctx = await exigirEmpresa(),
    sp = await searchParams,
    supabase = await createClient()
  const { data, error } = await supabase
    .from('unidades')
    .select('id,nome')
    .eq('empresa_id', ctx.empresa.id)
    .order('nome')
  return (
    <div className="documento-form-wrap">
      <Cabecalho
        titulo="Novo plano PMOC"
        sub="Estrutura inicial baseada no Anexo I da Portaria GM/MS nº 3.523/1998, com atividades e periodicidades editáveis."
        voltar={{ href: '/pmoc', rotulo: 'Planos PMOC' }}
      />
      {error ? (
        <Aviso tipo="erro" titulo="Não foi possível carregar as unidades">
          Confira a atualização do banco.
        </Aviso>
      ) : !data?.length ? (
        <Aviso titulo="Cadastre uma unidade antes do plano">
          <Link href="/unidades?novo=1">Cadastrar unidade atendida</Link>
        </Aviso>
      ) : (
        <PmocForm
          acao={salvarPlano}
          unidades={data}
          unidadePadrao={sp.unidade}
        />
      )}
    </div>
  )
}
