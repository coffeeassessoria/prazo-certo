import Link from 'next/link'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { hojeISO, situacao } from '@/lib/datas'
import { BotaoConfirmar } from '@/components/BotaoConfirmar'
import { excluirCliente, salvarCliente } from './actions'

export const dynamic = 'force-dynamic'

export default async function Clientes({ searchParams }: { searchParams: Promise<{ editar?: string; ok?: string; novo?: string }> }) {
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

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Clientes</h1>
          <div className="muted">{clientes?.length ?? 0} cadastrados</div>
        </div>
        {!mostrarForm && <Link href="/clientes?novo=1" className="btn">Novo cliente</Link>}
      </div>

      {sp.ok && <div className="aviso ok">Salvo com sucesso.</div>}

      {mostrarForm && (
        <form action={salvarCliente} className="card" style={{ marginBottom: 16 }}>
          <h2>{editando ? 'Editar cliente' : 'Novo cliente'}</h2>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <div className="linha">
            <div className="campo"><label>Nome *</label><input name="nome" required defaultValue={editando?.nome ?? ''} /></div>
            <div className="campo"><label>CNPJ / CPF</label><input name="documento" defaultValue={editando?.documento ?? ''} /></div>
          </div>
          <div className="linha">
            <div className="campo"><label>Pessoa de contato</label><input name="contato" defaultValue={editando?.contato ?? ''} /></div>
            <div className="campo"><label>Telefone</label><input name="telefone" inputMode="tel" defaultValue={editando?.telefone ?? ''} /></div>
          </div>
          <div className="linha">
            <div className="campo"><label>E-mail</label><input name="email" type="email" defaultValue={editando?.email ?? ''} /></div>
            <div className="campo"><label>Endereço</label><input name="endereco" defaultValue={editando?.endereco ?? ''} /></div>
          </div>
          <div className="campo"><label>Observações</label><textarea name="observacoes" defaultValue={editando?.observacoes ?? ''} /></div>
          <div className="acoes">
            <BotaoConfirmar>Salvar</BotaoConfirmar>
            <Link href="/clientes" className="btn sec">Cancelar</Link>
          </div>
        </form>
      )}

      {clientes?.length ? (
        <div className="lista">
          {clientes.map((c) => {
            const r = resumo.get(c.id)
            return (
              <div key={c.id} className="card" style={{ marginTop: 0 }}>
                <div className="acoes" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <Link href={`/?f=todos&cliente=${c.id}`} style={{ fontWeight: 600, fontSize: 16 }}>{c.nome}</Link>
                    <div className="muted">{[c.contato, c.telefone, c.documento].filter(Boolean).join(', ') || 'Sem contato cadastrado'}</div>
                  </div>
                  <div className="acoes">
                    {r?.vencido ? <span className="selo vencido">{r.vencido} vencido(s)</span> : null}
                    {r?.atencao ? <span className="selo atencao">{r.atencao} em breve</span> : null}
                    <span className="selo cinza">{r?.total ?? 0} ativo(s)</span>
                  </div>
                </div>
                <div className="acoes" style={{ marginTop: 10 }}>
                  <Link href={`/itens/novo?cliente=${c.id}`} className="btn peq">Novo vencimento</Link>
                  <Link href={`/clientes?editar=${c.id}`} className="btn peq sec">Editar</Link>
                  <form action={excluirCliente}>
                    <input type="hidden" name="id" value={c.id} />
                    <BotaoConfirmar className="btn peq perigo" mensagem="Excluir o cliente? Os vencimentos dele ficam sem cliente.">Excluir</BotaoConfirmar>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        !mostrarForm && <div className="card vazio"><h2>Nenhum cliente ainda</h2><p>Cadastre as empresas que você atende para agrupar os vencimentos de cada uma.</p><Link href="/clientes?novo=1" className="btn">Cadastrar cliente</Link></div>
      )}
    </>
  )
}
