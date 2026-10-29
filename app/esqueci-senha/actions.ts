'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { emailConfigurado, enviarEmail } from '@/lib/email'
import { montarEmailRecuperacao } from '@/lib/email-recuperacao'

export type ResEsqueci = { ok?: boolean; erro?: string } | null

const valido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

/**
 * Gera o link de recuperação pelo Supabase e envia pelo nosso SMTP.
 * Sempre responde igual, exista ou não o e-mail (não revela quem tem conta).
 */
export async function enviarLink(_prev: ResEsqueci, fd: FormData): Promise<ResEsqueci> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase()
  if (!valido(email)) return { erro: 'Informe um e-mail válido para continuar.' }
  if (!emailConfigurado()) return { erro: 'O envio de e-mails está indisponível agora. Fale com o suporte para receber uma nova senha.' }

  const admin = createAdminClient()
  const { data: perfil } = await admin.from('perfis').select('nome').eq('email', email).maybeSingle()
  if (perfil) {
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email })
    const hash = data?.properties?.hashed_token
    if (!error && hash) {
      const link = `${process.env.APP_URL}/auth/confirmar?token_hash=${encodeURIComponent(hash)}&type=recovery`
      const appNome = process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'
      try {
        await enviarEmail({ para: [email], ...montarEmailRecuperacao(perfil.nome, link, appNome) })
      } catch (e) {
        console.error('[esqueci-senha]', e)
        return { erro: 'Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos.' }
      }
    } else if (error) {
      console.error('[esqueci-senha]', error)
    }
  }
  return { ok: true }
}
