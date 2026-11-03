'use server'

import { getContexto } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailConfigurado, enviarEmail } from '@/lib/email'
import { ROTULO_FEEDBACK } from '@/lib/uso'

export type RespostaFeedback = { ok: boolean; msg: string } | null

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Sugestão, problema, reclamação ou elogio enviado pelo botão "Fale com a gente". */
export async function enviarFeedback(_prev: RespostaFeedback, fd: FormData): Promise<RespostaFeedback> {
  const tipo = String(fd.get('tipo') ?? '')
  const mensagem = String(fd.get('mensagem') ?? '').trim()
  const pagina = String(fd.get('pagina') ?? '').slice(0, 200) || null
  if (!ROTULO_FEEDBACK[tipo]) return { ok: false, msg: 'Escolha o tipo da mensagem para continuar.' }
  if (mensagem.length < 3) return { ok: false, msg: 'Escreva sua mensagem para continuar.' }
  if (mensagem.length > 4000) return { ok: false, msg: 'A mensagem passou de 4.000 caracteres. Resuma um pouco e envie de novo.' }
  try {
    const ctx = await getContexto()
    const supabase = await createClient()
    const { error } = await supabase.from('feedbacks').insert({ tipo, mensagem, pagina })
    if (error) throw new Error(error.message)

    // Aviso por e-mail para os donos da plataforma (não bloqueia o envio)
    if (emailConfigurado()) {
      const { data: donos } = await createAdminClient().from('perfis').select('email').eq('is_superadmin', true)
      const para = (donos ?? []).map((d) => d.email).filter(Boolean) as string[]
      if (para.length) {
        const quem = `${ctx.nome}${ctx.empresa ? ` (${ctx.empresa.nome})` : ''}`
        const app = process.env.APP_URL || ''
        await enviarEmail({
          para,
          assunto: `[Prazo Certo] ${ROTULO_FEEDBACK[tipo]} de ${quem}`,
          texto: `${ROTULO_FEEDBACK[tipo]} de ${quem} <${ctx.email}>\nTela: ${pagina ?? '—'}\n\n${mensagem}\n\nVer todas: ${app}/admin/mensagens`,
          html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#16181d;max-width:560px"><p style="color:#6a7181;font-size:13px;margin:0">${esc(ROTULO_FEEDBACK[tipo])} · tela ${esc(pagina ?? '—')}</p><p style="margin:8px 0"><b>${esc(quem)}</b> &lt;${esc(ctx.email)}&gt;</p><blockquote style="margin:16px 0;padding:12px 16px;background:#f6f8f9;border-left:3px solid #155179;white-space:pre-wrap">${esc(mensagem)}</blockquote><a href="${app}/admin/mensagens" style="color:#155179">Ver todas as mensagens</a></div>`,
        }).catch((e) => console.error('[feedback] e-mail', e))
      }
    }
    return { ok: true, msg: tipo === 'elogio' ? 'Obrigado pelo elogio! Ele vai direto para a equipe.' : 'Recebemos sua mensagem. A equipe lê todas e responde quando precisar de mais detalhes.' }
  } catch (e: any) {
    console.error('[feedback]', e)
    return { ok: false, msg: 'Não foi possível enviar agora. Tente de novo em alguns minutos.' }
  }
}
