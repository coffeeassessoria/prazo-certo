import Link from 'next/link'
import { Check, Inbox, MessageSquareText } from 'lucide-react'
import { exigirSuperadmin } from '@/lib/contexto'
import { createAdminClient } from '@/lib/supabase/admin'
import { TZ } from '@/lib/datas'
import { ROTULO_FEEDBACK, TIPOS_FEEDBACK } from '@/lib/uso'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Selo } from '@/components/ui/Selo'
import { Vazio } from '@/components/ui/Vazio'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'
import { marcarMensagem } from '../actions'

export const dynamic = 'force-dynamic'

const quando = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const TOM: Record<string, any> = { sugestao: 'info', problema: 'info', reclamacao: 'info', elogio: 'info' }

export default async function Mensagens({ searchParams }: { searchParams: Promise<{ tipo?: string; ver?: string }> }) {
  await exigirSuperadmin()
  const sp = await searchParams
  const ver = sp.ver === 'todas' ? 'todas' : 'abertas'
  const admin = createAdminClient()
  let q = admin.from('feedbacks').select('id, tipo, mensagem, pagina, status, criado_em, user_id, empresa_id').order('criado_em', { ascending: false }).limit(300)
  if (sp.tipo && ROTULO_FEEDBACK[sp.tipo]) q = q.eq('tipo', sp.tipo)
  if (ver === 'abertas') q = q.neq('status', 'resolvido')
  const [{ data: msgs }, { data: perfis }, { data: empresas }] = await Promise.all([
    q,
    admin.from('perfis').select('user_id, nome, email'),
    admin.from('empresas').select('id, nome'),
  ])
  const pessoa = new Map((perfis ?? []).map((p) => [p.user_id, p]))
  const empresa = new Map((empresas ?? []).map((e) => [e.id, e.nome]))
  const link = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams()
    const tipo = 'tipo' in p ? p.tipo : sp.tipo
    if (tipo) u.set('tipo', tipo)
    if ((p.ver ?? ver) === 'todas') u.set('ver', 'todas')
    return `/admin/mensagens${u.size ? `?${u}` : ''}`
  }

  return (
    <>
      <Cabecalho voltar={{ href: '/admin', rotulo: 'Admin' }} titulo="Mensagens dos clientes"
        subIcone={<MessageSquareText size={14} aria-hidden />} sub="Sugestões, problemas, reclamações e elogios enviados pelo botão Fale com a gente" />
      <div className="chips compactos" style={{ marginBottom: 12 }}>
        <Link href={link({ tipo: undefined })} className="chip" aria-pressed={!sp.tipo}><span className="chip-titulo">Todos os tipos</span></Link>
        {TIPOS_FEEDBACK.map((t) => <Link key={t.valor} href={link({ tipo: t.valor })} className="chip" aria-pressed={sp.tipo === t.valor}><span className="chip-titulo">{t.rotulo}</span></Link>)}
      </div>
      <div className="chips compactos" style={{ marginBottom: 20 }}>
        <Link href={link({ ver: 'abertas' })} className="chip" aria-pressed={ver === 'abertas'}><span className="chip-titulo">Em aberto</span></Link>
        <Link href={link({ ver: 'todas' })} className="chip" aria-pressed={ver === 'todas'}><span className="chip-titulo">Todas, com resolvidas</span></Link>
      </div>

      {!msgs?.length ? (
        <Vazio icone={Inbox} titulo="Nenhuma mensagem por aqui" texto="Quando um cliente usar o botão Fale com a gente, a mensagem aparece aqui e você recebe um e-mail." />
      ) : (
        <div className="lista">
          {msgs.map((m) => {
            const p = pessoa.get(m.user_id ?? '')
            return (
              <article key={m.id} className={`card msg ${m.status === 'novo' ? 'msg-nova' : ''}`}>
                <div className="msg-topo">
                  <Selo peq tom={TOM[m.tipo]}>{ROTULO_FEEDBACK[m.tipo]}</Selo>
                  {m.status === 'novo' && <span className="msg-novo">Nova</span>}
                  {m.status === 'resolvido' && <Selo peq tom="neutro">Resolvida</Selo>}
                  <span className="dica" style={{ marginLeft: 'auto' }}>{quando(m.criado_em)}</span>
                </div>
                <p className="msg-texto">{m.mensagem}</p>
                <div className="msg-rodape">
                  <span className="dica">
                    <strong style={{ fontWeight: 500, color: 'var(--pc-text)' }}>{p?.nome ?? 'Usuário removido'}</strong>
                    {m.empresa_id ? ` · ${empresa.get(m.empresa_id) ?? ''}` : ''}{p?.email ? ` · ${p.email}` : ''}{m.pagina ? ` · tela ${m.pagina}` : ''}
                  </span>
                  <div className="acoes">
                    {p?.email && <a className="btn ghost peq" href={`mailto:${p.email}?subject=${encodeURIComponent('Sua mensagem no Prazo Certo')}`}>Responder por e-mail</a>}
                    {m.status === 'novo' && (
                      <form action={marcarMensagem}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value="lido" />
                        <BotaoEnviar className="btn sec peq" carregando="Salvando…">Marcar como lida</BotaoEnviar></form>
                    )}
                    {m.status !== 'resolvido' ? (
                      <form action={marcarMensagem}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value="resolvido" />
                        <BotaoEnviar className="btn sec peq" carregando="Salvando…"><Check size={14} />Resolver</BotaoEnviar></form>
                    ) : (
                      <form action={marcarMensagem}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value="lido" />
                        <BotaoEnviar className="btn ghost peq" carregando="Salvando…">Reabrir</BotaoEnviar></form>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
