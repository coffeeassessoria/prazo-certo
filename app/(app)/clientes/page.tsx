import Link from 'next/link'
import { Building2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { hojeISO, situacao } from '@/lib/datas'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Selo } from '@/components/ui/Selo'
import { Vazio } from '@/components/ui/Vazio'
import { Confirmar } from '@/components/ui/Confirmar'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'
import { excluirCliente, salvarCliente } from './actions'

export const dynamic = 'force-dynamic'

export default async function Clientes({ searchParams }: { searchParams: Promise<{ editar?: string; novo?: string }> }) {
  const sp = await searchParams
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const hoje = hojeISO()

  const [{ data: clientes }, { data: itens }] = await Promise.all([
    supabase.from('clientes').select('*').eq('empresa_id', ctx.empresa.id).order('nome'),
    supabase.from('itens').select('cliente_id, vencimento, antecedencia_dias, status')
      .eq('empresa_id', ctx.empresa.id).eq('status', 'ativo'),
  ])

  const resumo = new Map<string, { total: number; vencido: number; atencao: number }>()
  for (const i of itens ?? []) {
    if (!i.cliente_id) continue
    const r = resumo.get(i.cliente_id) ?? { total: 0, vencido: 0, atencao: 0 }
    r.total++
    const s = situacao(i, hoje)
    if (s === 'vencido') r.vencido++
    if (s === 'atencao') r.atencao++
    resumo.set(i.cliente_id, r)
  }

  const editando = sp.editar ? clientes?.find((c) => c.id === sp.editar) : null
  const mostrarForm = !!editando || !!sp.novo
  const total = clientes?.length ?? 0

  return (
    <>
      <Cabecalho
        titulo="Clientes"
        subIcone={<Users size={14} aria-hidden />}
        sub={`${total} ${total === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}`}
        acao={!mostrarForm && total > 0 ? <Link href="/clientes?novo=1" className="btn"><Plus size={16} />Novo cliente</Link> : undefined}
      />

      {mostrarForm && (
        <form action={salvarCliente} className="card" style={{ marginBottom: 24, maxWidth: 880 }}>
          <div className="card-topo"><h2>{editando ? `Editar ${editando.nome}` : 'Novo cliente'}</h2></div>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <div className="linha">
            <div className="campo"><label htmlFor="c-nome">Nome da empresa</label><input id="c-nome" name="nome" required autoFocus defaultValue={editando?.nome ?? ''} placeholder="Ex.: Hospital Santa Clara" /></div>
            <div className="campo"><label htmlFor="c-doc">CNPJ <span className="opcional">(opcional)</span></label><input id="c-doc" name="documento" inputMode="numeric" defaultValue={editando?.documento ?? ''} /></div>
          </div>
          <div className="linha">
            <div className="campo"><label htmlFor="c-contato">Pessoa de contato</label><input id="c-contato" name="contato" defaultValue={editando?.contato ?? ''} /></div>
            <div className="campo"><label htmlFor="c-tel">Telefone</label><input id="c-tel" name="telefone" inputMode="tel" defaultValue={editando?.telefone ?? ''} placeholder="(66) 99999-9999" /></div>
          </div>
          <div className="linha">
            <div className="campo"><label htmlFor="c-email">E-mail</label><input id="c-email" name="email" type="email" defaultValue={editando?.email ?? ''} /></div>
            <div className="campo"><label htmlFor="c-end">Endereço</label><input id="c-end" name="endereco" defaultValue={editando?.endereco ?? ''} /></div>
          </div>
          <div className="campo"><label htmlFor="c-obs">Observações</label><textarea id="c-obs" name="observacoes" defaultValue={editando?.observacoes ?? ''} placeholder="Horário de acesso, portaria, responsável pela manutenção" /></div>
          <div className="acoes empilha">
            <BotaoEnviar>{editando ? 'Salvar alterações' : 'Cadastrar cliente'}</BotaoEnviar>
            <Link href="/clientes" className="btn ghost">Cancelar</Link>
          </div>
        </form>
      )}

      {total > 0 ? (
        <div className="lista">
          {clientes!.map((c) => {
            const r = resumo.get(c.id)
            return (
              <div key={c.id} className="item" style={{ flexWrap: 'wrap' }}>
                <span className="vazio-icone" style={{ width: 52, height: 52, margin: 0, borderRadius: 8 }} aria-hidden><Building2 size={20} /></span>
                <div className="item-corpo">
                  <Link href={`/?f=todos&cliente=${c.id}`} className="item-titulo" style={{ color: 'var(--pc-text)' }}>{c.nome}</Link>
                  <span className="item-meta">{[c.contato, c.telefone, c.documento].filter(Boolean).join(' • ') || 'Sem contato cadastrado'}</span>
                  <span className="acoes" style={{ marginTop: 8 }}>
                    {r?.vencido ? <Selo peq tom="vencido">{r.vencido} vencido{r.vencido > 1 ? 's' : ''}</Selo> : null}
                    {r?.atencao ? <Selo peq tom="atencao">{r.atencao} vence{r.atencao > 1 ? 'm' : ''} logo</Selo> : null}
                    <Selo peq>{r?.total ?? 0} ativo{(r?.total ?? 0) === 1 ? '' : 's'}</Selo>
                  </span>
                </div>
                <div className="acoes">
                  <Link href={`/unidades?cliente=${c.id}`} className="btn sec">Unidades e equipamentos</Link>
                  <Link href={`/itens/novo?cliente=${c.id}`} className="btn sec peq"><Plus size={14} />Vencimento</Link>
                  <Link href={`/clientes?editar=${c.id}`} className="btn ghost icone peq" aria-label={`Editar ${c.nome}`}><Pencil size={16} /></Link>
                  <form action={excluirCliente}>
                    <input type="hidden" name="id" value={c.id} />
                    <Confirmar className="btn ghost icone peq" titulo="Excluir cliente?"
                      texto="Os vencimentos dele continuam no sistema, mas ficam sem cliente." destaque={c.nome} confirmar="Excluir cliente">
                      <Trash2 size={16} aria-label={`Excluir ${c.nome}`} />
                    </Confirmar>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        !mostrarForm && (
          <Vazio icone={Building2} titulo="Nenhum cliente ainda" texto="Cadastre as empresas que você atende para agrupar os vencimentos de cada uma.">
            <Link href="/clientes?novo=1" className="btn">Cadastrar primeiro cliente</Link>
          </Vazio>
        )
      )}
    </>
  )
}
