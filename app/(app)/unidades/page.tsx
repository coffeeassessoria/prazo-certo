import Link from 'next/link'
import { Plus, Building2, Pencil } from 'lucide-react'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { Vazio } from '@/components/ui/Vazio'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'
import { FormResultado } from '@/components/FormResultado'
import { salvarUnidade } from './actions'
export const dynamic = 'force-dynamic'
export default async function Unidades({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; novo?: string; editar?: string }>
}) {
  const ctx = await exigirEmpresa(),
    sp = await searchParams,
    supabase = await createClient()
  let q = supabase
    .from('unidades')
    .select('*')
    .eq('empresa_id', ctx.empresa.id)
    .order('nome')
  if (sp.cliente) q = q.eq('cliente_id', sp.cliente)
  const [unidades, clientes] = await Promise.all([
    q,
    supabase
      .from('clientes')
      .select('id,nome')
      .eq('empresa_id', ctx.empresa.id)
      .order('nome'),
  ])
  const editando = unidades.data?.find((u) => u.id === sp.editar),
    form = !!sp.novo || !!editando
  const campo = (chave: string, rotulo: string, max = 300) => (
    <div className="campo">
      <label htmlFor={`un-${chave}`}>{rotulo}</label>
      <input
        id={`un-${chave}`}
        name={chave}
        defaultValue={editando?.[chave] ?? ''}
        maxLength={max}
        required={chave === 'nome'}
      />
    </div>
  )
  return (
    <>
      <Cabecalho
        titulo="Unidades e equipamentos"
        sub="Organize os locais atendidos, seus ambientes e os aparelhos de ar-condicionado."
        acao={
          !form ? (
            <Link
              className="btn"
              href={`/unidades?novo=1${sp.cliente ? `&cliente=${sp.cliente}` : ''}`}
            >
              <Plus size={16} />
              Nova unidade
            </Link>
          ) : undefined
        }
      />
      <div className="acoes documento-secao">
        <Link className="btn sec" href="/clientes">
          Ver clientes
        </Link>
        <Link className="btn sec" href="/pmoc">
          Ver planos PMOC
        </Link>
      </div>
      {unidades.error || clientes.error ? (
        <Aviso tipo="erro" titulo="Não foi possível carregar as unidades">
          Confira a atualização do banco e tente novamente.
        </Aviso>
      ) : (
        <>
          {form && (
            <FormResultado acao={salvarUnidade}>
              <h2>
                {editando ? 'Editar unidade' : 'Cadastrar unidade atendida'}
              </h2>
              {editando && (
                <input type="hidden" name="id" value={editando.id} />
              )}
              <div className="campo">
                <label htmlFor="un-cliente">Cliente</label>
                <select
                  id="un-cliente"
                  name="cliente_id"
                  required
                  defaultValue={editando?.cliente_id ?? sp.cliente ?? ''}
                >
                  <option value="">Escolher cliente</option>
                  {clientes.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                <span className="dica">
                  <Link href="/clientes?novo=1">Cadastrar um cliente</Link> se
                  ele ainda não estiver na lista.
                </span>
              </div>
              {campo('nome', 'Nome da unidade / estabelecimento', 160)}
              {campo('endereco', 'Endereço completo da unidade', 500)}
              <h3 className="documento-secao">
                Proprietário, locatário ou preposto
              </h3>
              <div className="campo">
                <label htmlFor="un-papel">Condição do representante</label>
                <select
                  id="un-papel"
                  name="representante_papel"
                  defaultValue={editando?.representante_papel ?? 'preposto'}
                >
                  <option value="proprietario">Proprietário</option>
                  <option value="locatario">Locatário</option>
                  <option value="preposto">Preposto</option>
                </select>
              </div>
              <div className="linha">
                {campo('representante_nome', 'Nome / razão social', 160)}
                {campo('representante_documento', 'CNPJ / CPF', 40)}
              </div>
              {campo(
                'representante_endereco',
                'Endereço do representante',
                500,
              )}
              {campo(
                'representante_contato',
                'Telefone / e-mail do representante',
                200,
              )}
              <div className="acoes">
                <BotaoEnviar>Salvar unidade</BotaoEnviar>
                <Link className="btn ghost" href="/unidades">
                  Cancelar
                </Link>
              </div>
            </FormResultado>
          )}
          {unidades.data?.length ? (
            <div className="lista documento-secao">
              {unidades.data.map((u) => (
                <div className="item" key={u.id}>
                  <Building2 size={20} />
                  <div className="item-corpo">
                    <Link className="item-titulo" href={`/unidades/${u.id}`}>
                      {u.nome}
                    </Link>
                    <span className="item-meta">
                      {clientes.data?.find((c) => c.id === u.cliente_id)?.nome}{' '}
                      · {u.endereco || 'Endereço a completar'}
                    </span>
                  </div>
                  <Link className="btn sec" href={`/unidades?editar=${u.id}`}>
                    <Pencil size={16} />
                    Editar
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            !form && (
              <Vazio
                titulo="Cadastre os locais que sua empresa atende"
                texto="Cada unidade reúne ambientes, equipamentos e planos PMOC de um cliente."
              />
            )
          )}
        </>
      )}
    </>
  )
}
