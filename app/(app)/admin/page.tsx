import { exigirSuperadmin } from '@/lib/contexto'
import { createAdminClient } from '@/lib/supabase/admin'
import { hojeISO } from '@/lib/datas'
import { FormResultado } from '@/components/FormResultado'
import { BotaoConfirmar } from '@/components/BotaoConfirmar'
import { acessarEmpresa, adicionarUsuarioEmpresa, alternarAtivo, criarEmpresa, resetarSenha } from './actions'

export const dynamic = 'force-dynamic'

const brl = (v: number | null) => (v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))

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

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Admin da plataforma</h1>
          <div className="muted">Empresas clientes, acessos e mensalidades</div>
        </div>
        {ctx.empresa && (
          <form action={acessarEmpresa}>
            <input type="hidden" name="id" value="" />
            <button className="btn sec">Sair da visualização de {ctx.empresa.nome}</button>
          </form>
        )}
      </div>

      <div className="metricas">
        <div className="metrica"><span className="r">Empresas</span><span className="n">{empresas?.length ?? 0}</span><span className="d">cadastradas</span></div>
        <div className="metrica ok"><span className="r">Ativas</span><span className="n">{ativas.length}</span><span className="d">com acesso liberado</span></div>
        <div className="metrica"><span className="r">Usuários</span><span className="n">{(perfis ?? []).filter((p) => p.empresa_id).length}</span><span className="d">em todas as empresas</span></div>
        <div className="metrica ok"><span className="r">Receita mensal</span><span className="n" style={{ fontSize: 22 }}>{brl(mrr)}</span><span className="d">empresas ativas</span></div>
      </div>

      <div className="card">
        <h2>Empresas</h2>
        <div className="tabela-wrap">
          <table>
            <thead>
              <tr><th>Empresa</th><th>Usuários</th><th>Itens</th><th>Agenda</th><th>Mensal</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {(empresas ?? []).map((e) => {
                const us = (perfis ?? []).filter((p) => p.empresa_id === e.id)
                const s = stats.get(e.id)
                return (
                  <tr key={e.id}>
                    <td><strong>{e.nome}</strong><div className="muted">{e.documento}</div></td>
                    <td>
                      {us.map((u) => (
                        <div key={u.user_id} style={{ marginBottom: 4 }}>
                          {u.nome} <span className="muted">({u.papel})</span>
                          <details>
                            <summary className="muted" style={{ fontSize: 12 }}>{u.email}</summary>
                            <FormResultado acao={resetarSenha} className="">
                              <input type="hidden" name="user_id" value={u.user_id} />
                              <input type="hidden" name="email" value={u.email ?? ''} />
                              <button className="btn peq sec" style={{ marginTop: 4 }}>Gerar nova senha</button>
                            </FormResultado>
                          </details>
                        </div>
                      ))}
                    </td>
                    <td>{s?.ativos ?? 0}{s?.vencidos ? <span className="selo vencido" style={{ marginLeft: 6 }}>{s.vencidos} venc.</span> : null}</td>
                    <td>{comGoogle.has(e.id) ? 'Conectada' : '—'}</td>
                    <td>{brl(e.valor_mensal)}</td>
                    <td><span className={`selo ${e.ativo ? 'ok' : 'vencido'}`}>{e.ativo ? 'Ativa' : 'Suspensa'}</span></td>
                    <td>
                      <div className="acoes">
                        <form action={acessarEmpresa}>
                          <input type="hidden" name="id" value={e.id} />
                          <button className="btn peq sec">Visualizar</button>
                        </form>
                        <form action={alternarAtivo}>
                          <input type="hidden" name="id" value={e.id} />
                          <input type="hidden" name="ativo" value={String(!e.ativo)} />
                          <BotaoConfirmar className={`btn peq ${e.ativo ? 'perigo' : 'sucesso'}`}
                            mensagem={e.ativo ? `Suspender o acesso de ${e.nome}?` : undefined}>
                            {e.ativo ? 'Suspender' : 'Reativar'}
                          </BotaoConfirmar>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!empresas?.length && (
          <ol className="passos-inicio" style={{ marginTop: 8 }}>
            <li><span className="marca-passo">1</span>Preencha "Nova empresa" abaixo com o nome e o e-mail do responsável.</li>
            <li><span className="marca-passo">2</span>Envie o acesso gerado pelo WhatsApp (botão aparece após criar).</li>
            <li><span className="marca-passo">3</span>No primeiro login, o responsável responde o quiz de configuração.</li>
            <li><span className="marca-passo">4</span>Para configurar por ele, clique em "Visualizar" na empresa criada.</li>
          </ol>
        )}
      </div>

      <div className="grade" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginTop: 16 }}>
        <FormResultado acao={criarEmpresa}>
          <h2>Nova empresa</h2>
          <p className="muted">Crie o acesso do responsável. No primeiro login ele responde um quiz rápido que configura empresa, lembretes e clientes.</p>
          <div className="campo"><label>Nome da empresa *</label><input name="empresa" required /></div>
          <div className="linha">
            <div className="campo"><label>CNPJ</label><input name="documento" /></div>
            <div className="campo"><label>Mensalidade (R$)</label><input name="valor" inputMode="decimal" placeholder="97,00" /></div>
          </div>
          <div className="linha">
            <div className="campo"><label>Responsável *</label><input name="responsavel" required /></div>
            <div className="campo"><label>E-mail de acesso *</label><input name="email" type="email" required /></div>
          </div>
          <div className="campo"><label>WhatsApp autorizado</label><input name="whatsapp" inputMode="tel" placeholder="(66) 99999-9999" /></div>
          <button className="btn">Criar empresa e acesso</button>
        </FormResultado>

        <FormResultado acao={adicionarUsuarioEmpresa}>
          <h2>Usuário em empresa existente</h2>
          <div className="campo">
            <label>Empresa</label>
            <select name="empresa_id" required>
              {(empresas ?? []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="linha">
            <div className="campo"><label>Nome</label><input name="nome" required /></div>
            <div className="campo"><label>E-mail</label><input name="email" type="email" required /></div>
          </div>
          <div className="campo">
            <label>Papel</label>
            <select name="papel" defaultValue="membro">
              <option value="membro">Membro (usa o sistema)</option>
              <option value="admin">Administrador (gerencia usuários e integrações)</option>
            </select>
          </div>
          <button className="btn">Criar usuário</button>
        </FormResultado>
      </div>
    </>
  )
}
