import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { googleConfigurado } from '@/lib/google'
import { fmtTelefone } from '@/lib/telefone'
import { BotaoConfirmar } from '@/components/BotaoConfirmar'
import { FormResultado } from '@/components/FormResultado'
import { emailConfigurado } from '@/lib/email'
import { fmtData } from '@/lib/datas'
import { adicionarUsuario, desconectarGoogle, emailTeste, salvarLembretes, salvarWhatsapp, trocarSenha } from './actions'

export const dynamic = 'force-dynamic'

const MSGS: Record<string, [string, string]> = {
  google: ['ok', 'Google Agenda conectada! Os vencimentos ativos foram enviados para a agenda.'],
  'google-desconectado': ['ok', 'Google Agenda desconectada.'],
  whatsapp: ['ok', 'Números do WhatsApp salvos.'],
  lembretes: ['ok', 'Lembretes por e-mail salvos.'],
  'google-cancelado': ['erro', 'A conexão com o Google foi cancelada.'],
  'google-sem-token': ['erro', 'O Google não devolveu a autorização completa. Remova o acesso em myaccount.google.com/permissions e tente de novo.'],
  'google-falhou': ['erro', 'Não foi possível conectar ao Google. Tente novamente.'],
  'google-nao-configurado': ['erro', 'A integração com o Google ainda não foi configurada no servidor.'],
}

export default async function Config({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const ehAdmin = ctx.papel === 'admin' || ctx.superadmin

  const [{ data: conexao }, { data: usuarios }, { data: envios }] = await Promise.all([
    createAdminClient().from('google_conexoes').select('google_email, updated_at').eq('empresa_id', ctx.empresa.id).maybeSingle(),
    supabase.from('perfis').select('user_id, nome, email, papel').eq('empresa_id', ctx.empresa.id).eq('is_superadmin', false).order('nome'),
    supabase.from('lembretes_enviados').select('id, marco, enviado_em, itens(titulo)').eq('empresa_id', ctx.empresa.id).order('enviado_em', { ascending: false }).limit(8),
  ])
  const e = ctx.empresa
  const rotuloMarco = (m: string) =>
    m === 'antecedencia' ? 'Primeiro aviso' : m === '7d' ? '7 dias antes' : m === '1d' ? '1 dia antes' : m === 'hoje' ? 'No dia' : 'Vencido'

  const aviso = MSGS[sp.ok ?? sp.erro ?? '']
  const bot = process.env.NEXT_PUBLIC_WHATSAPP_BOT

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Configurações</h1>
          <div className="muted">{ctx.empresa.nome}, acesso de {ehAdmin ? 'administrador' : 'membro'}</div>
        </div>
        {ehAdmin && <a href="/bem-vindo?refazer=1" className="btn sec">Refazer configuração inicial</a>}
      </div>
      {aviso && <div className={`aviso ${aviso[0]}`}>{aviso[1]}</div>}

      <div className="card">
        <h2>Lembretes por e-mail</h2>
        <p className="muted">
          Todo dia de manhã o sistema envia um resumo só quando há algo para resolver. Cada item é avisado
          no prazo de antecedência dele, 7 dias antes, 1 dia antes, no dia e, se vencer, uma vez por semana até ser renovado.
        </p>
        {!emailConfigurado() && <div className="aviso info">O envio de e-mails ainda está sendo configurado. Seus dados já ficam salvos.</div>}
        {ehAdmin ? (
          <form action={salvarLembretes}>
            <div className="linha">
              <div className="campo">
                <label htmlFor="emails">Quem recebe (um e-mail por linha)</label>
                <textarea id="emails" name="emails" defaultValue={e.emails_lembrete.join('\n')} placeholder="voce@empresa.com.br" />
              </div>
              <div className="campo">
                <label htmlFor="antecedencia">Primeiro aviso padrão (dias antes)</label>
                <input id="antecedencia" name="antecedencia" type="number" min={0} max={365} defaultValue={e.antecedencia_padrao} />
                <span className="dica">Vale para novos cadastros. Cada vencimento pode ter o seu prazo próprio.</span>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontWeight: 400 }}>
                  <input type="checkbox" name="ativo" defaultChecked={e.lembrete_email_ativo} style={{ width: 20, minHeight: 20, appearance: 'auto' }} />
                  Enviar lembretes por e-mail
                </label>
              </div>
            </div>
            <div className="acoes">
              <BotaoConfirmar className="btn">Salvar lembretes</BotaoConfirmar>
            </div>
          </form>
        ) : (
          <p>Recebem: {e.emails_lembrete.join(', ') || 'ninguém cadastrado'}</p>
        )}
        {ehAdmin && (
          <FormResultado acao={emailTeste} className="">
            <button className="btn sec" style={{ marginTop: 10 }}>Enviar e-mail de teste agora</button>
          </FormResultado>
        )}
        {envios && envios.length > 0 && (
          <>
            <hr className="separador" />
            <h2 style={{ fontSize: 14 }}>Últimos avisos enviados</h2>
            <div className="tabela-wrap">
              <table>
                <thead><tr><th>Data</th><th>Item</th><th>Aviso</th></tr></thead>
                <tbody>
                  {envios.map((x: any) => (
                    <tr key={x.id}>
                      <td>{fmtData(x.enviado_em)}</td>
                      <td>{(Array.isArray(x.itens) ? x.itens[0]?.titulo : x.itens?.titulo) ?? '—'}</td>
                      <td>{rotuloMarco(x.marco)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Google Agenda</h2>
        {conexao ? (
          <>
            <p>Conectada à conta <strong>{conexao.google_email ?? 'Google'}</strong>. Cada vencimento vira um evento com alertas.</p>
            {ehAdmin && (
              <div className="acoes">
                <a href="/api/google/connect" className="btn sec">Reconectar / trocar conta</a>
                <form action={desconectarGoogle}>
                  <BotaoConfirmar className="btn perigo" mensagem="Desconectar a Google Agenda?">Desconectar</BotaoConfirmar>
                </form>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="muted">Conecte a agenda Google da empresa. Todo vencimento cadastrado vira um evento, com alerta no celular na antecedência escolhida.</p>
            {googleConfigurado()
              ? <a href="/api/google/connect" className="btn">Conectar Google Agenda</a>
              : <div className="aviso info">Integração pendente de configuração no servidor (GOOGLE_CLIENT_ID).</div>}
          </>
        )}
      </div>

      <div className="card">
        <h2>Consultar pelo WhatsApp <span className="selo cinza" style={{ marginLeft: 6, verticalAlign: 'middle' }}>em breve</span></h2>
        <p className="muted">
          Mande uma mensagem {bot ? <>para <a href={`https://wa.me/${bot}?text=vencimentos`} target="_blank" rel="noreferrer"><strong>{fmtTelefone(bot)}</strong></a></> : 'para o número do sistema'} com um destes comandos:
        </p>
        <p>
          <code className="cmd">vencimentos</code> <code className="cmd">vencidos</code> <code className="cmd">hoje</code>{' '}
          <code className="cmd">semana</code> <code className="cmd">mes</code> <code className="cmd">cliente nome</code>{' '}
          <code className="cmd">ajuda</code>
        </p>
        <p className="muted">Só os números autorizados abaixo recebem resposta.</p>
        {ehAdmin ? (
          <form action={salvarWhatsapp}>
            <div className="campo">
              <label htmlFor="numeros">Números autorizados (um por linha, com DDD)</label>
              <textarea id="numeros" name="numeros" defaultValue={ctx.empresa.whatsapp_numeros.map(fmtTelefone).join('\n')}
                placeholder="(66) 99999-9999" />
            </div>
            <BotaoConfirmar className="btn sec">Salvar números</BotaoConfirmar>
          </form>
        ) : (
          <p>{ctx.empresa.whatsapp_numeros.map(fmtTelefone).join(', ') || 'Nenhum número autorizado.'}</p>
        )}
      </div>

      <div className="card">
        <h2>Usuários da empresa</h2>
        <div className="tabela-wrap">
          <table>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th></tr></thead>
            <tbody>
              {(usuarios ?? []).map((u) => (
                <tr key={u.user_id}><td>{u.nome}</td><td>{u.email}</td><td>{u.papel === 'admin' ? 'Administrador' : 'Membro'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {ehAdmin && (
          <details style={{ marginTop: 14 }}>
            <summary>Adicionar funcionário</summary>
            <FormResultado acao={adicionarUsuario} className="">
              <div className="linha" style={{ marginTop: 12 }}>
                <div className="campo"><label>Nome</label><input name="nome" required /></div>
                <div className="campo"><label>E-mail</label><input name="email" type="email" required /></div>
              </div>
              <button className="btn">Criar acesso</button>
            </FormResultado>
          </details>
        )}
      </div>

      <div className="card">
        <h2>Minha conta</h2>
        <p className="muted">{ctx.email}</p>
        <details>
          <summary>Trocar minha senha</summary>
          <FormResultado acao={trocarSenha} className="">
            <div className="linha" style={{ marginTop: 12 }}>
              <div className="campo"><label>Nova senha</label><input name="senha" type="password" minLength={8} required autoComplete="new-password" /></div>
              <div className="campo"><label>Confirmar</label><input name="confirmar" type="password" minLength={8} required autoComplete="new-password" /></div>
            </div>
            <button className="btn">Salvar senha</button>
          </FormResultado>
        </details>
        <form action="/sair" method="post" style={{ marginTop: 14 }}>
          <button className="btn sec">Sair do sistema</button>
        </form>
      </div>
    </>
  )
}
