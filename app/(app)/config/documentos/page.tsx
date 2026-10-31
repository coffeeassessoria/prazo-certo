import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { Confirmar } from '@/components/ui/Confirmar'
import { IdentidadeForm } from '@/components/ui/IdentidadeForm'
import { FormResultado } from '@/components/FormResultado'
import { salvarIdentidade, removerLogo } from './actions'

export const dynamic = 'force-dynamic'
export default async function Identidade() {
  const ctx = await exigirEmpresa(),
    supabase = await createClient()
  const { data, error } = await supabase
    .from('documento_identidades')
    .select('*')
    .eq('empresa_id', ctx.empresa.id)
    .maybeSingle()
  const identidade = data ?? {
    nome: ctx.empresa.nome,
    documento: ctx.empresa.documento ?? '',
    endereco: '',
    telefone: '',
    email: '',
  }
  const { data: logo } = data?.logo_path
    ? await supabase.storage
        .from('identidades')
        .createSignedUrl(data.logo_path, 300)
    : { data: null }
  const admin = ctx.papel === 'admin' || ctx.superadmin
  return (
    <div className="demanda-form-wrap">
      <Cabecalho
        titulo="Timbrado e logo"
        sub="A identidade da sua empresa nos PDFs, com margens e paginação em A4."
        voltar={{ href: '/config', rotulo: 'Ajustes' }}
      />
      {error ? (
        <Aviso tipo="erro" titulo="Não foi possível carregar o timbrado">
          Confira a atualização do banco e tente novamente.
        </Aviso>
      ) : admin ? (
        <>
          <IdentidadeForm
            acao={salvarIdentidade}
            identidade={identidade}
            logoUrl={logo?.signedUrl}
          />
          {data?.logo_path && (
            <FormResultado acao={removerLogo}>
              <Confirmar
                className="btn ghost"
                titulo="Remover o logo dos próximos documentos?"
                texto="As versões já emitidas serão preservadas. Você poderá enviar um novo logo depois."
                confirmar="Remover logo"
              >
                Remover logo do timbrado
              </Confirmar>
            </FormResultado>
          )}
        </>
      ) : (
        <Aviso titulo="Timbrado da empresa">
          {identidade.nome}. Peça ao administrador para atualizar os dados e o
          logo.
        </Aviso>
      )}
    </div>
  )
}
