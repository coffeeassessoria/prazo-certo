import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Envio por SMTP: funciona com o e-mail do domínio (Hostinger, Google Workspace, Zoho)
 * ou com um serviço transacional (Resend, Brevo) que também oferecem SMTP.
 */
export const emailConfigurado = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

let transporte: Transporter | null = null
function getTransporte() {
  if (!transporte) {
    const porta = Number(process.env.SMTP_PORT || 465)
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: porta,
      secure: porta === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return transporte
}

export async function enviarEmail(p: { para: string[]; assunto: string; html: string; texto: string }) {
  if (!emailConfigurado()) throw new Error('E-mail ainda não configurado no servidor (SMTP).')
  const remetente = process.env.EMAIL_FROM || `${process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'} <${process.env.SMTP_USER}>`
  await getTransporte().sendMail({
    from: remetente,
    to: p.para.join(', '),
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    subject: p.assunto,
    html: p.html,
    text: p.texto,
  })
}
