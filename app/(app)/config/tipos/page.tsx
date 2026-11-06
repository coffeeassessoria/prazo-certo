import Link from 'next/link'
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { exigirEmpresa } from '@/lib/contexto'
import { rotuloRecorrencia, TIPOS } from '@/lib/datas'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { Selo } from '@/components/ui/Selo'
import { Vazio } from '@/components/ui/Vazio'
import { Confirmar } from '@/components/ui/Confirmar'
import { TipoDocumentoForm } from '@/components/ui/TipoDocumentoForm'
import { removerTipo, salvarTipo } from './actions'

export const dynamic = 'force-dynamic'

export default async function TiposDocumento({ searchParams }: { searchParams: Promise<{ novo?: string; editar?: string; volta?: string }> }) {
  const sp = await searchParams
  const ctx = await exigirEmpresa()
  const admin = ctx.papel === 'admin' || ctx.superadmin
  const modelos = ctx.empresa.modelos ?? []
  const editando = sp.editar ? modelos.find((m) => m.titulo === sp.editar) : undefined
  const mostrarForm = admin && (!!sp.novo || !!editando)
  const volta = sp.volta && sp.volta.startsWith('/itens/') ? sp.volta : undefined

  return (
    <div style={{ maxWidth: 960 }}>
      <Cabecalho
        titulo="Tipos de documento"
        sub="Os atalhos do cadastro de vencimento, com avisos padrão e perguntas próprias de cada tipo."
        voltar={volta ? { href: volta, rotulo: 'Voltar ao vencimento' } : { href: '/config', rotulo: 'Ajustes' }}
        acao={admin && !mostrarForm && modelos.length > 0 ? <Link href="/config/tipos?novo=1" className="btn"><Plus size={16} />Novo tipo</Link> : undefined}
      />
      {!admin && <Aviso tipo="info" titulo="Somente o administrador altera os tipos">Peça ao administrador da empresa para cadastrar o tipo que você precisa.</Aviso>}
      {mostrarForm && <TipoDocumentoForm acao={salvarTipo} inicial={editando} volta={volta} cancelar={volta ?? '/config/tipos'} />}

      {modelos.length ? (
        <div className="lista">
          {modelos.map((m) => (
            <div key={m.titulo} className="item" style={{ flexWrap: 'wrap' }}>
              <span className="vazio-icone" style={{ width: 52, height: 52, margin: 0, borderRadius: 8 }} aria-hidden><FileText size={20} /></span>
              <div className="item-corpo">
                <span className="item-titulo">{m.titulo}</span>
                <span className="item-meta">{[TIPOS[m.tipo], rotuloRecorrencia(m.recorrencia_meses), m.avisos?.length ? `Avisa ${m.avisos.join(', ')} dias antes` : null].filter(Boolean).join(' • ')}</span>
                {(m.colaborador || m.campos?.length) ? (
                  <span className="acoes" style={{ marginTop: 8 }}>
                    {m.colaborador && <Selo peq>De colaborador</Selo>}
                    {m.campos?.length ? <Selo peq>{m.campos.length} pergunta{m.campos.length > 1 ? 's' : ''}</Selo> : null}
                  </span>
                ) : null}
              </div>
              {admin && (
                <div className="acoes">
                  <Link href={`/config/tipos?editar=${encodeURIComponent(m.titulo)}`} className="btn ghost icone peq" aria-label={`Editar ${m.titulo}`}><Pencil size={16} /></Link>
                  <form action={removerTipo}>
                    <input type="hidden" name="titulo" value={m.titulo} />
                    <Confirmar className="btn ghost icone peq" titulo="Remover tipo?" texto="Ele deixa de aparecer como atalho. Os vencimentos já cadastrados continuam iguais." destaque={m.titulo} confirmar="Remover tipo">
                      <Trash2 size={16} aria-label={`Remover ${m.titulo}`} />
                    </Confirmar>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !mostrarForm && (
        <Vazio icone={FileText} titulo="Nenhum tipo cadastrado" texto="Cadastre os documentos que você controla para cadastrar vencimentos com um toque.">
          {admin && <Link href="/config/tipos?novo=1" className="btn">Cadastrar primeiro tipo</Link>}
        </Vazio>
      )}
    </div>
  )
}
