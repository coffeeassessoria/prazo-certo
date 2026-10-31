import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { Vazio } from '@/components/ui/Vazio'
import { fmtData, fmtInstante } from '@/lib/datas'
export const dynamic = 'force-dynamic'
export default async function Planos({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>
}) {
  const ctx = await exigirEmpresa(),
    supabase = await createClient(),
    sp = await searchParams
  const pagina = Math.max(
    1,
    Math.min(100000, Math.floor(Number(sp.pagina) || 1)),
  )
  const [planos, unidades, clientes] = await Promise.all([
    supabase
      .from('pmoc_planos')
      .select('id,unidade_id,dados,updated_at', { count: 'exact' })
      .eq('empresa_id', ctx.empresa.id)
      .order('updated_at', { ascending: false })
      .order('id')
      .range((pagina - 1) * 30, pagina * 30 - 1),
    supabase
      .from('unidades')
      .select('id,nome,cliente_id')
      .eq('empresa_id', ctx.empresa.id)
      .order('nome'),
    supabase
      .from('clientes')
      .select('id,nome')
      .eq('empresa_id', ctx.empresa.id)
      .order('nome'),
  ])
  return (
    <>
      <Cabecalho
        titulo="Planos PMOC"
        sub="Planos, registros de execução e PDFs com o timbrado da sua empresa."
        acao={
          <Link className="btn" href="/pmoc/novo">
            <Plus size={16} />
            Novo plano PMOC
          </Link>
        }
      />
      <div className="acoes documento-secao">
        <Link className="btn sec" href="/unidades">
          Unidades e equipamentos
        </Link>
        <Link className="btn sec" href="/config/documentos">
          Configurar logo e timbrado
        </Link>
      </div>
      {planos.error || unidades.error || clientes.error ? (
        <Aviso tipo="erro" titulo="Não foi possível carregar os planos">
          Confira a atualização do banco e tente novamente.
        </Aviso>
      ) : planos.data?.length ? (
        <div className="lista">
          {planos.data.map((p) => {
            const unidade = unidades.data?.find((u) => u.id === p.unidade_id)
            return (
              <Link key={p.id} className="item" href={`/pmoc/${p.id}`}>
                <FileText size={22} />
                <span className="item-corpo">
                  <span className="item-titulo">
                    {unidade?.nome} · {p.dados.titulo}
                  </span>
                  <span className="item-meta">
                    {
                      clientes.data?.find((c) => c.id === unidade?.cliente_id)
                        ?.nome
                    }{' '}
                    · atualizado em {fmtInstante(p.updated_at)}
                  </span>
                </span>
                <span>Abrir</span>
              </Link>
            )
          })}
        </div>
      ) : (
        <Vazio
          titulo="Crie o primeiro plano da sua empresa"
          texto="Cadastre a unidade, os ambientes e os equipamentos. Depois defina as atividades com o responsável técnico."
        />
      )}
      <div className="acoes demanda-paginacao">
        <span className="muted">
          {planos.count ?? 0} planos · página {pagina}
        </span>
        {pagina > 1 && (
          <Link className="btn sec" href={`/pmoc?pagina=${pagina - 1}`}>
            Anterior
          </Link>
        )}
        {pagina * 30 < (planos.count ?? 0) && (
          <Link className="btn sec" href={`/pmoc?pagina=${pagina + 1}`}>
            Próxima
          </Link>
        )}
      </div>
    </>
  )
}
