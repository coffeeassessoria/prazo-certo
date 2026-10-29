import { Building2, Eye, KeyRound, LogOut, PauseCircle, PlayCircle, ShieldCheck, UserPlus } from 'lucide-react'
import { exigirSuperadmin } from '@/lib/contexto'
import { createAdminClient } from '@/lib/supabase/admin'
import { hojeISO } from '@/lib/datas'
import { FormResultado } from '@/components/FormResultado'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Metrica } from '@/components/ui/Metrica'
import { Selo } from '@/components/ui/Selo'
import { Confirmar } from '@/components/ui/Confirmar'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'
import { acessarEmpresa, adicionarUsuarioEmpresa, alternarAtivo, criarEmpresa, resetarSenha } from './actions'

export const dynamic = 'force-dynamic'

const brl = (v: number | null) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))

export default async function Admin() {
  const ctx = await exigirSuperadmin()
  const admin = createAdminClient()
  const hoje = hojeISO()

  const [{ data: empresas }, { data: perfis }, { data: itens }, { data: conexoes }] = await Promise.all([
    admin.from('empresas').select('*').order('created_at'),
    admin.from('perfis').select('user_id, empresa_id, nome, email, papel').eq('is_superadmin', false),
    admin.from('itens').select('empresa_id, vencimento').eq('status', 'ativo'),
    admin.from('google_conexoes').select('empresa_id'),
  ])

  const stats = new Map<string, { ativos: number; vencidos: number }>()
  for (const i of itens ?? []) {
    const s = stats.get(i.empresa_id) ?? { ativos: 0, vencidos: 0 }
    s.ativos++
    if (i.vencimento < hoje) s.vencidos++
    stats.set(i.empresa_id, s)
  }
  const comGoogle = new Set((conexoes ?? []).map((c) => c.empresa_id))
  const ativas = (empresas ?? []).filter((e) => e.ativo)
  const mrr = ativas.reduce((t, e) => t + Number(e.valor_mensal ?? 0), 0)
  const semEmpresas = !empresas?.length

  return (
    <>
      <Cabecalho
        titulo="Admin da plataforma"
        subIcone={<ShieldCheck size={14} aria-hidden />}
        sub="Empresas clientes, acessos e mensalidades"
        acao={ctx.empresa ? (
          <form action={acessarEmpresa}>
            <input type="hidden" name="id" value="" />
            <BotaoEnviar className="btn sec"><LogOut size={16} />Sair da visualização de {ctx.empresa.nome}</BotaoEnviar>
          </form>
        ) : undefined}
      />

      <div className="metricas">
        <Metrica valor={empresas?.length ?? 0} rotulo="Empresas" apoio="cadastradas" />
        <Metrica valor={ativas.length} rotulo="Ativas" tom="ok" apoio="com acesso liberado" />
        <Metrica valor={(perfis ?? []).filter((p) => p.empresa_id).length} rotulo="Usuários" apoio="em todas as empresas" />
        <Metrica valor={brl(mrr)} rotulo="Receita mensal" apoio="soma das empresas ativas" />
      </div>

      <div className="card">
        <div className="card-topo"><h2><Building2 size={18} aria-hidden />Empresas</h2></div>
        {semEmpresas ? (
          <ol className="checklist">
            {[
              'Preencha "Nova empresa" abaixo com o nome e o e-mail do responsável.',
              'Envie o acesso gerado pelo WhatsApp (o botão aparece depois de criar).',
              'No primeiro login, o responsável responde o quiz de configuração.',
              'Para configurar por ele, clique em "Visualizar" na empresa criada.',
            ].map((t, i) => <li key={i} className="checklist-item"><span className="checklist-caixa">{i + 1}</span>{t}</li>)}
          </ol>
        ) : (
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr><th>Empresa</th><th>Usuários</th><th>Itens</th><th>Agenda</th><th>Plano</th><th>Status</th><th><span className="sr-only">Ações</span></th></tr>
              </thead>
              <tbody>
                {empresas!.map((e) => {
                  const us = (perfis ?? []).filter((p) => p.empresa_id === e.id)
                  const s = stats.get(e.id)
                  return (
                    <tr key={e.id}>
                      <td><strong style={{ fontWeight: 500 }}>{e.nome}</strong>{e.documento && <div className="dica">{e.documento}</div>}</td>
                      <td>
                        {us.map((u) => (
                          <details key={u.user_id}>
                            <summary style={{ color: 'var(--pc-text)', fontWeight: 500, minHeight: 28 }}>{u.nome} <span className="dica">({u.papel})</span></summary>
                            <div className="dica">{u.email}</div>
                            <FormResultado acao={resetarSenha} className="">
                              <input type="hidden" name="user_id" value={u.user_id} />
                              <input type="hidden" name="email" value={u.email ?? ''} />
                              <button className="btn sec peq" style={{ margin: '6px 0' }}><KeyRound size={14} />Gerar nova senha</button>
                            </FormResultado>
                          </details>
                        ))}
                      </td>
                      <td>{s?.ativos ?? 0}{s?.vencidos ? <> <Selo peq tom="vencido">{s.vencidos} vencidos</Selo></> : null}</td>
                      <td className="sec">{comGoogle.has(e.id) ? 'Conectada' : '—'}</td>
                      <td className="sec">{e.valor_mensal != null ? `${brl(e.valor_mensal)}/mês` : '—'}</td>
                      <td><Selo peq tom={e.ativo ? 'ok' : 'vencido'}>{e.ativo ? 'Ativa' : 'Suspensa'}</Selo></td>
                      <td>
                        <div className="acoes" style={{ flexWrap: 'nowrap' }}>
                          <form action={acessarEmpresa}>
                            <input type="hidden" name="id" value={e.id} />
                            <button className="btn sec peq"><Eye size={14} />Visualizar</button>
                          </form>
                          <form action={alternarAtivo}>
                            <input type="hidden" name="id" value={e.id} />
                            <input type="hidden" name="ativo" value={String(!e.ativo)} />
                            {e.ativo ? (
                              <Confirmar className="btn ghost peq" titulo={`Suspender ${e.nome}?`}
                                texto="Os usuários dessa empresa perdem o acesso e os lembretes param até você reativar. Nenhum dado é apagado." confirmar="Suspender acesso">
                                <PauseCircle size={14} />Suspender
                              </Confirmar>
                            ) : (
                              <BotaoEnviar className="btn sec peq" carregando="Reativando…"><PlayCircle size={14} />Reativar</BotaoEnviar>
                            )}
                          </form>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grade-2" style={{ marginTop: 24 }}>
        <FormResultado acao={criarEmpresa}>
          <div className="card-topo"><h2><Building2 size={18} aria-hidden />Nova empresa</h2></div>
          <p className="muted" style={{ marginBottom: 16 }}>Crie o acesso do responsável. No primeiro login ele responde um quiz rápido que configura empresa, lembretes e clientes.</p>
          <div className="campo"><label htmlFor="a-emp">Nome da empresa</label><input id="a-emp" name="empresa" required placeholder="Ex.: ClimaTech Sul" /></div>
          <div className="linha">
            <div className="campo"><label htmlFor="a-resp">Responsável</label><input id="a-resp" name="responsavel" required /></div>
            <div className="campo"><label htmlFor="a-email">E-mail de acesso</label><input id="a-email" name="email" type="email" required /></div>
          </div>
          <div className="linha">
            <div className="campo"><label htmlFor="a-cnpj">CNPJ <span className="opcional">(opcional)</span></label><input id="a-cnpj" name="documento" inputMode="numeric" /></div>
            <div className="campo"><label htmlFor="a-valor">Mensalidade em R$ <span className="opcional">(opcional)</span></label><input id="a-valor" name="valor" inputMode="decimal" placeholder="97,00" /></div>
          </div>
          <div className="campo"><label htmlFor="a-whats">WhatsApp autorizado <span className="opcional">(opcional)</span></label><input id="a-whats" name="whatsapp" inputMode="tel" placeholder="(66) 99999-9999" /></div>
          <button className="btn">Criar empresa e acesso</button>
        </FormResultado>

        <FormResultado acao={adicionarUsuarioEmpresa}>
          <div className="card-topo"><h2><UserPlus size={18} aria-hidden />Usuário em empresa existente</h2></div>
          <div className="campo">
            <label htmlFor="a-e">Empresa</label>
            <select id="a-e" name="empresa_id" required disabled={semEmpresas}>
              {(empresas ?? []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            {semEmpresas && <span className="dica">Cadastre uma empresa primeiro.</span>}
          </div>
          <div className="linha">
            <div className="campo"><label htmlFor="a-n">Nome</label><input id="a-n" name="nome" required /></div>
            <div className="campo"><label htmlFor="a-m">E-mail</label><input id="a-m" name="email" type="email" required /></div>
          </div>
          <div className="campo">
            <label htmlFor="a-p">Papel</label>
            <select id="a-p" name="papel" defaultValue="membro">
              <option value="membro">Membro (usa o sistema)</option>
              <option value="admin">Administrador (gerencia usuários e integrações)</option>
            </select>
          </div>
          <button className="btn sec" disabled={semEmpresas}>Criar usuário</button>
        </FormResultado>
      </div>
    </>
  )
}
