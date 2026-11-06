import Link from 'next/link'
import { IdCard, Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { fmtData, hojeISO, situacao } from '@/lib/datas'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Selo } from '@/components/ui/Selo'
import { Vazio } from '@/components/ui/Vazio'
import { Confirmar } from '@/components/ui/Confirmar'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'
import { CampoData } from '@/components/ui/CampoData'
import { ItemLinha } from '@/components/ItemLinha'
import { excluirColaborador, salvarColaborador } from './actions'

export const dynamic = 'force-dynamic'

function idade(nasc: string | null, hoje: string) {
  if (!nasc) return null
  const [a, m, d] = nasc.split('-').map(Number), [ha, hm, hd] = hoje.split('-').map(Number)
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0)
}

export default async function Colaboradores({ searchParams }: { searchParams: Promise<{ editar?: string; novo?: string; ver?: string }> }) {
  const sp = await searchParams
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const hoje = hojeISO()

  const [{ data: colaboradores }, { data: itens }] = await Promise.all([
    supabase.from('colaboradores').select('*').eq('empresa_id', ctx.empresa.id).order('nome'),
    supabase.from('itens').select('id, titulo, tipo, vencimento, antecedencia_dias, recorrencia_meses, status, colaborador_id, clientes(nome)')
      .eq('empresa_id', ctx.empresa.id).eq('status', 'ativo').not('colaborador_id', 'is', null).order('vencimento'),
  ])

  const porColab = new Map<string, any[]>()
  for (const i of itens ?? []) porColab.set(i.colaborador_id!, [...(porColab.get(i.colaborador_id!) ?? []), i])

  const editando = sp.editar ? colaboradores?.find((c) => c.id === sp.editar) : null
  const vendo = sp.ver ? colaboradores?.find((c) => c.id === sp.ver) : null
  const mostrarForm = !!editando || !!sp.novo
  const total = colaboradores?.length ?? 0

  return (
    <>
      <Cabecalho
        titulo="Colaboradores"
        subIcone={<UserRound size={14} aria-hidden />}
        sub={`${total} ${total === 1 ? 'colaborador cadastrado' : 'colaboradores cadastrados'} · para vincular documentos como seguro de vida, ASO e NRs`}
        acao={!mostrarForm && total > 0 ? <Link href="/colaboradores?novo=1" className="btn"><Plus size={16} />Novo colaborador</Link> : undefined}
      />

      {mostrarForm && (
        <form action={salvarColaborador} className="card" style={{ marginBottom: 24, maxWidth: 880 }}>
          <div className="card-topo"><h2>{editando ? `Editar ${editando.nome}` : 'Novo colaborador'}</h2></div>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <div className="linha">
            <div className="campo"><label htmlFor="co-nome">Nome completo</label><input id="co-nome" name="nome" required autoFocus defaultValue={editando?.nome ?? ''} /></div>
            <div className="campo"><label htmlFor="co-funcao">Função</label><input id="co-funcao" name="funcao" defaultValue={editando?.funcao ?? ''} placeholder="Ex.: técnico de refrigeração" /></div>
          </div>
          <div className="linha">
            <div className="campo"><label htmlFor="co-cpf">CPF <span className="opcional">(opcional)</span></label><input id="co-cpf" name="cpf" inputMode="numeric" defaultValue={editando?.cpf ?? ''} /></div>
            <div className="campo"><label htmlFor="co-rg">RG <span className="opcional">(opcional)</span></label><input id="co-rg" name="rg" defaultValue={editando?.rg ?? ''} /></div>
          </div>
          <div className="linha">
            <div className="campo"><label htmlFor="co-nasc">Data de nascimento <span className="opcional">(opcional)</span></label><CampoData id="co-nasc" name="data_nascimento" max={hoje} defaultValue={editando?.data_nascimento ?? ''} /></div>
            <div className="campo"><label htmlFor="co-adm">Data de admissão <span className="opcional">(opcional)</span></label><CampoData id="co-adm" name="data_admissao" defaultValue={editando?.data_admissao ?? ''} /></div>
          </div>
          <div className="linha">
            <div className="campo"><label htmlFor="co-tel">Telefone</label><input id="co-tel" name="telefone" inputMode="tel" defaultValue={editando?.telefone ?? ''} placeholder="(66) 99999-9999" /></div>
            <div className="campo"><label htmlFor="co-email">E-mail</label><input id="co-email" name="email" type="email" defaultValue={editando?.email ?? ''} /></div>
          </div>
          <div className="campo"><label htmlFor="co-obs">Observações</label><textarea id="co-obs" name="observacoes" defaultValue={editando?.observacoes ?? ''} placeholder="Ex.: número da CTPS, treinamentos feitos" /></div>
          <div className="acoes empilha">
            <BotaoEnviar>{editando ? 'Salvar alterações' : 'Cadastrar colaborador'}</BotaoEnviar>
            <Link href="/colaboradores" className="btn ghost">Cancelar</Link>
          </div>
        </form>
      )}

      {vendo && (
        <section className="card" style={{ marginBottom: 24 }}>
          <div className="card-topo"><h2>Documentos de {vendo.nome}</h2><Link href="/colaboradores" className="btn ghost peq">Fechar</Link></div>
          {porColab.get(vendo.id)?.length ? (
            <div className="lista">{porColab.get(vendo.id)!.map((i) => <ItemLinha key={i.id} item={{ ...i, cliente_nome: (Array.isArray(i.clientes) ? i.clientes[0]?.nome : i.clientes?.nome) ?? null }} hoje={hoje} />)}</div>
          ) : <p className="muted">Nenhum vencimento ativo vinculado a este colaborador.</p>}
        </section>
      )}

      {total > 0 ? (
        <div className="lista">
          {colaboradores!.map((c) => {
            const docs = porColab.get(c.id) ?? []
            const vencidos = docs.filter((i) => situacao(i, hoje) === 'vencido').length
            const logo = docs.filter((i) => situacao(i, hoje) === 'atencao').length
            const anos = idade(c.data_nascimento, hoje)
            return (
              <div key={c.id} className="item" style={{ flexWrap: 'wrap' }}>
                <span className="vazio-icone" style={{ width: 52, height: 52, margin: 0, borderRadius: 8 }} aria-hidden><IdCard size={20} /></span>
                <div className="item-corpo">
                  <Link href={`/colaboradores?ver=${c.id}`} className="item-titulo" style={{ color: 'var(--pc-text)' }}>{c.nome}</Link>
                  <span className="item-meta">{[c.funcao, anos !== null ? `${anos} anos` : null, c.cpf ? `CPF ${c.cpf}` : null, c.data_admissao ? `Admissão ${fmtData(c.data_admissao)}` : null].filter(Boolean).join(' • ') || 'Sem dados adicionais'}</span>
                  <span className="acoes" style={{ marginTop: 8 }}>
                    {vencidos ? <Selo peq tom="vencido">{vencidos} vencido{vencidos > 1 ? 's' : ''}</Selo> : null}
                    {logo ? <Selo peq tom="atencao">{logo} vence{logo > 1 ? 'm' : ''} logo</Selo> : null}
                    <Selo peq>{docs.length} documento{docs.length === 1 ? '' : 's'}</Selo>
                  </span>
                </div>
                <div className="acoes">
                  <Link href={`/colaboradores?editar=${c.id}`} className="btn ghost icone peq" aria-label={`Editar ${c.nome}`}><Pencil size={16} /></Link>
                  <form action={excluirColaborador}>
                    <input type="hidden" name="id" value={c.id} />
                    <Confirmar className="btn ghost icone peq" titulo="Excluir colaborador?"
                      texto="Os documentos dele continuam no sistema, mas ficam sem vínculo." destaque={c.nome} confirmar="Excluir colaborador">
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
          <Vazio icone={IdCard} titulo="Nenhum colaborador ainda" texto="Cadastre seus funcionários para vincular documentos nominais, como seguro de vida, ASO e certificados de NR.">
            <Link href="/colaboradores?novo=1" className="btn">Cadastrar primeiro colaborador</Link>
          </Vazio>
        )
      )}
    </>
  )
}
