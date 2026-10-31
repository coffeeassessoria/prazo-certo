import Link from 'next/link'
import { CalendarDays, KeyRound, LogOut, Mail, MessageCircle, RotateCcw, Send, Settings, UserPlus, Users } from 'lucide-react'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { googleConfigurado } from '@/lib/google'
import { emailConfigurado } from '@/lib/email'
import { fmtData } from '@/lib/datas'
import { fmtTelefone } from '@/lib/telefone'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { Selo } from '@/components/ui/Selo'
import { Confirmar } from '@/components/ui/Confirmar'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'
import { TemaToggle } from '@/components/ui/TemaToggle'
import { FormResultado } from '@/components/FormResultado'
import { adicionarUsuario, desconectarGoogle, emailTeste, salvarLembretes, salvarWhatsapp, trocarSenha } from './actions'

export const dynamic = 'force-dynamic'

const ERROS: Record<string, string> = {
  'google-cancelado': 'A conexão com o Google foi cancelada. Tente de novo quando quiser.',
  'google-sem-token': 'O Google não devolveu a autorização completa. Remova o acesso em myaccount.google.com/permissions e conecte de novo.',
  'google-falhou': 'Não foi possível conectar ao Google. Tente novamente em alguns minutos.',
  'google-nao-configurado': 'A integração com o Google ainda não foi configurada no servidor.',
}

const rotuloMarco = (m: string) =>
  m === 'antecedencia' ? 'Primeiro aviso' : m === '7d' ? '7 dias antes' : m === '1d' ? '1 dia antes' : m === 'hoje' ? 'No dia' : 'Vencido'

export default async function Config({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const sp = await searchParams
  const ctx = await exigirEmpresa()
  const supabase = await createClient()
  const ehAdmin = ctx.papel === 'admin' || ctx.superadmin
  const e = ctx.empresa

  const [{ data: conexao }, { data: usuarios }, { data: envios }] = await Promise.all([
    createAdminClient().from('google_conexoes').select('google_email, updated_at').eq('empresa_id', e.id).maybeSingle(),
    supabase.from('perfis').select('user_id, nome, email, papel').eq('empresa_id', e.id).eq('is_superadmin', false).order('nome'),
    supabase.from('lembretes_enviados').select('id, marco, enviado_em, itens(titulo)').eq('empresa_id', e.id).order('enviado_em', { ascending: false }).limit(8),
  ])
  const bot = process.env.NEXT_PUBLIC_WHATSAPP_BOT

  return (
    <div style={{ maxWidth: 960 }}>
      <Cabecalho
        titulo="Ajustes"
        subIcone={<Settings size={14} aria-hidden />}
        sub={`${e.nome} • acesso de ${ehAdmin ? 'administrador' : 'membro'}`}
        acao={ehAdmin ? <a href="/bem-vindo?refazer=1" className="btn sec"><RotateCcw size={16} />Refazer configuração inicial</a> : undefined}
      />
      {sp.erro && ERROS[sp.erro] && <Aviso tipo="erro" titulo="Google Agenda não conectada">{ERROS[sp.erro]}</Aviso>}

      <div className="card"><h2>Logo e timbrado dos documentos</h2><p className="muted">Cadastre a identidade da sua empresa para gerar PMOC e futuros documentos em A4.</p><Link className="btn sec" href="/config/documentos">Configurar logo e timbrado</Link></div>

      <div className="card">
        <div className="card-topo">
          <h2><Mail size={18} aria-hidden />Lembretes por e-mail</h2>
          <Selo peq tom={e.lembrete_email_ativo && e.emails_lembrete.length ? 'ok' : 'neutro'}>{e.lembrete_email_ativo && e.emails_lembrete.length ? 'Ativos' : 'Desligados'}</Selo>
        </div>
        <p className="muted">
          Todo dia de manhã sai um resumo, só quando há algo para resolver. Cada item é avisado no prazo dele,
          7 dias antes, 1 dia antes, no dia e, se vencer, uma vez por semana até ser renovado.
        </p>
        {!emailConfigurado() && <Aviso titulo="Envio em configuração">O servidor de e-mail ainda está sendo ligado. Suas preferências já ficam salvas.</Aviso>}
        {ehAdmin ? (
          <form action={salvarLembretes} style={{ marginTop: 16 }}>
            <div className="linha">
              <div className="campo">
                <label htmlFor="emails">Quem recebe <span className="opcional">(um e-mail por linha)</span></label>
                <textarea id="emails" name="emails" defaultValue={e.emails_lembrete.join('\n')} placeholder="voce@empresa.com.br" />
              </div>
              <div className="campo">
                <label htmlFor="antecedencia">Primeiro aviso padrão (dias antes)</label>
                <input id="antecedencia" name="antecedencia" type="number" min={0} max={365} defaultValue={e.antecedencia_padrao} />
                <span className="dica">Vale para novos cadastros. Cada vencimento pode ter o prazo dele.</span>
                <label className="check" style={{ marginTop: 8 }}>
                  <input type="checkbox" name="ativo" defaultChecked={e.lembrete_email_ativo} />
                  Enviar lembretes por e-mail
                </label>
              </div>
            </div>
            <BotaoEnviar>Salvar lembretes</BotaoEnviar>
          </form>
        ) : (
          <p>Recebem: {e.emails_lembrete.join(', ') || 'ninguém cadastrado'}</p>
        )}
        {ehAdmin && (
          <FormResultado acao={emailTeste} className="">
            <hr className="separador" />
            <div className="acoes" style={{ justifyContent: 'space-between' }}>
              <span className="muted">Confira se os e-mails estão chegando (e se não caem no spam).</span>
              <button className="btn sec"><Send size={16} />Enviar e-mail de teste</button>
            </div>
          </FormResultado>
        )}
        {envios && envios.length > 0 && (
          <>
            <hr className="separador" />
            <h3 style={{ marginBottom: 12 }}>Últimos avisos enviados</h3>
            <div className="tabela-wrap">
              <table>
                <thead><tr><th>Data</th><th>Item</th><th>Aviso</th></tr></thead>
                <tbody>
                  {envios.map((x: any) => (
                    <tr key={x.id}>
                      <td className="sec">{fmtData(x.enviado_em)}</td>
                      <td>{(Array.isArray(x.itens) ? x.itens[0]?.titulo : x.itens?.titulo) ?? '—'}</td>
                      <td><Selo peq tom={x.marco.startsWith('atraso') ? 'vencido' : 'neutro'}>{rotuloMarco(x.marco)}</Selo></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-topo">
          <h2><CalendarDays size={18} aria-hidden />Google Agenda</h2>
          <Selo peq tom={conexao ? 'ok' : 'neutro'}>{conexao ? 'Conectada' : 'Não conectada'}</Selo>
        </div>
        {conexao ? (
          <>
            <p>Conectada à conta <strong>{conexao.google_email ?? 'Google'}</strong>. Cada vencimento vira um evento com alerta no celular.</p>
            {ehAdmin && (
              <div className="acoes" style={{ marginTop: 12 }}>
                <a href="/api/google/connect" className="btn sec">Trocar conta</a>
                <form action={desconectarGoogle}>
                  <Confirmar className="btn ghost" tom="info" titulo="Desconectar a Google Agenda?"
                    texto="Os eventos já criados continuam na agenda, mas novos vencimentos não vão mais para lá." confirmar="Desconectar">Desconectar</Confirmar>
                </form>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="muted">Opcional. Conecte a agenda Google da empresa e todo vencimento vira um evento, com alerta no celular.</p>
            {googleConfigurado()
              ? <a href="/api/google/connect" className="btn sec" style={{ marginTop: 12 }}>Conectar Google Agenda</a>
              : <Aviso titulo="Integração em configuração">A conexão com o Google ainda está sendo ligada no servidor.</Aviso>}
          </>
        )}
      </div>

      <div className="card">
        <div className="card-topo">
          <h2><MessageCircle size={18} aria-hidden />Consultar pelo WhatsApp</h2>
          <Selo peq tom="info">Em breve</Selo>
        </div>
        <p className="muted">
          Mande uma mensagem {bot ? <>para <a href={`https://wa.me/${bot}?text=vencimentos`} target="_blank" rel="noreferrer"><strong>{fmtTelefone(bot)}</strong></a></> : 'para o número do sistema'} com um destes comandos:
        </p>
        <p className="acoes" style={{ margin: '8px 0 16px' }}>
          {['vencimentos', 'vencidos', 'hoje', 'semana', 'mes', 'cliente nome', 'ajuda'].map((c) => <code key={c} className="cmd">{c}</code>)}
        </p>
        {ehAdmin ? (
          <form action={salvarWhatsapp}>
            <div className="campo">
              <label htmlFor="numeros">Números autorizados <span className="opcional">(um por linha, com DDD)</span></label>
              <textarea id="numeros" name="numeros" defaultValue={e.whatsapp_numeros.map(fmtTelefone).join('\n')} placeholder="(66) 99999-9999" />
              <span className="dica">Só esses números recebem resposta. Os demais são ignorados.</span>
            </div>
            <BotaoEnviar className="btn sec">Salvar números</BotaoEnviar>
          </form>
        ) : (
          <p>{e.whatsapp_numeros.map(fmtTelefone).join(', ') || 'Nenhum número autorizado.'}</p>
        )}
      </div>

      <div className="card">
        <div className="card-topo"><h2><Users size={18} aria-hidden />Usuários da empresa</h2></div>
        <div className="tabela-wrap">
          <table>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th></tr></thead>
            <tbody>
              {(usuarios ?? []).map((u) => (
                <tr key={u.user_id}>
                  <td>{u.nome}</td><td className="sec">{u.email}</td>
                  <td><Selo peq tom={u.papel === 'admin' ? 'info' : 'neutro'}>{u.papel === 'admin' ? 'Administrador' : 'Membro'}</Selo></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ehAdmin && (
          <details style={{ marginTop: 16 }}>
            <summary><UserPlus size={16} aria-hidden />Adicionar funcionário</summary>
            <FormResultado acao={adicionarUsuario} className="">
              <div className="linha" style={{ marginTop: 12 }}>
                <div className="campo"><label htmlFor="u-nome">Nome</label><input id="u-nome" name="nome" required /></div>
                <div className="campo"><label htmlFor="u-email">E-mail</label><input id="u-email" name="email" type="email" required /></div>
              </div>
              <button className="btn sec">Criar acesso</button>
            </FormResultado>
          </details>
        )}
      </div>

      <div className="card">
        <div className="card-topo"><h2><KeyRound size={18} aria-hidden />Minha conta</h2></div>
        <p className="muted">{ctx.email}</p>
        <div className="acoes" style={{ margin: '12px 0' }}>
          <TemaToggle comTexto />
          <form action="/sair" method="post"><button className="btn ghost"><LogOut size={16} />Sair do sistema</button></form>
        </div>
        <details>
          <summary>Trocar minha senha</summary>
          <FormResultado acao={trocarSenha} className="">
            <div className="linha" style={{ marginTop: 12 }}>
              <div className="campo"><label htmlFor="s1">Nova senha</label><input id="s1" name="senha" type="password" minLength={8} required autoComplete="new-password" /><span className="dica">Pelo menos 8 caracteres.</span></div>
              <div className="campo"><label htmlFor="s2">Repita a nova senha</label><input id="s2" name="confirmar" type="password" minLength={8} required autoComplete="new-password" /></div>
            </div>
            <button className="btn sec">Salvar nova senha</button>
          </FormResultado>
        </details>
      </div>
    </div>
  )
}
