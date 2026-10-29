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
import { gerarSenha } from '@/lib/usuarios'
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

      <FormResultado acao={criarEmpresa}>
        <div className="card-topo">
          <h2><UserPlus size={18} aria-hidden />Novo cliente do sistema</h2>
          <span className="dica">sem pagamento: você cria o acesso e envia</span>
        </div>
        <ol className="checklist duas" style={{ marginBottom: 20 }}>
          {['Você cria o acesso com e-mail e senha provisória', 'Envia o acesso pelo WhatsApp (botão aparece ao criar)', 'No 1º login ele troca a senha', 'Em seguida cai no cadastro da empresa (quiz)'].map((t, i) => (
            <li key={t} className="checklist-item"><span className="checklist-caixa">{i + 1}</span>{t}</li>
          ))}
        </ol>
        <div className="linha">
          <div className="campo"><label htmlFor="a-resp">Nome do cliente</label><input id="a-resp" name="responsavel" required placeholder="Ex.: João da Silva" /></div>
          <div className="campo"><label htmlFor="a-email">E-mail de acesso</label><input id="a-email" name="email" type="email" required placeholder="joao@empresa.com.br" /></div>
        </div>
        <div className="linha">
          <div className="campo">
            <label htmlFor="a-senha">Senha provisória</label>
            <input id="a-senha" name="senha" defaultValue={gerarSenha()} minLength={8} required autoComplete="off" spellCheck={false} />
            <span className="dica">Já sugerimos uma. Pode trocar. Ele vai criar a própria no primeiro acesso.</span>
          </div>
          <div className="campo"><label htmlFor="a-emp">Nome da empresa <span className="opcional">(opcional)</span></label><input id="a-emp" name="empresa" placeholder="Ele confirma no cadastro" /></div>
        </div>
        <details style={{ marginBottom: 12 }}>
          <summary>Mais dados (opcional)</summary>
          <div className="linha" style={{ marginTop: 8 }}>
            <div className="campo"><label htmlFor="a-valor">Mensalidade em R$</label><input id="a-valor" name="valor" inputMode="decimal" placeholder="97,00" /></div>
            <div className="campo"><label htmlFor="a-whats">WhatsApp do cliente</label><input id="a-whats" name="whatsapp" inputMode="tel" placeholder="(66) 99999-9999" /></div>
          </div>
          <div className="campo"><label htmlFor="a-cnpj">CNPJ</label><input id="a-cnpj" name="documento" inputMode="numeric" /></div>
        </details>
        <button className="btn grande"><UserPlus size={16} />Criar acesso do cliente</button>
      </FormResultado>

      <div className="card">
        <div className="card-topo"><h2><Building2 size={18} aria-hidden />Empresas</h2></div>
        {semEmpresas ? (
          <ol className="checklist">
            {[
              'Nenhuma empresa ainda. Crie o primeiro acesso no formulário acima.',
              'Para configurar por um cliente, clique em "Visualizar" na empresa dele.',
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

      <div style={{ marginTop: 24, maxWidth: 640 }}>

        <FormResultado acao={adicionarUsuarioEmpresa}>
          <div className="card-topo"><h2><UserPlus size={18} aria-hidden />Mais um usuário numa empresa existente</h2></div>
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
