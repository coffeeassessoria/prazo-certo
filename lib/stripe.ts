import 'server-only'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { criarUsuario } from '@/lib/usuarios'
import { emailConfigurado, enviarEmail } from '@/lib/email'

/**
 * Assinatura pela Stripe.
 * Planos em empresas.plano: 'assinatura' (Stripe controla o acesso), 'cortesia' (grátis, nunca bloqueia),
 * 'mensal' (cobrança combinada por fora; só o Admin suspende).
 * Variáveis: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET (segredos na Vercel).
 */
export const stripeConfigurado = () => !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID)

let cliente: Stripe | null = null
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe ainda não configurada no servidor.')
  if (!cliente) cliente = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
  return cliente
}

/** Status da Stripe que mantêm o acesso liberado. past_due = a Stripe ainda está tentando cobrar. */
export const STATUS_COM_ACESSO = ['active', 'trialing', 'past_due']

export const ROTULO_STATUS: Record<string, string> = {
  active: 'Em dia',
  trialing: 'Em teste',
  past_due: 'Pagamento atrasado',
  unpaid: 'Não pago',
  canceled: 'Cancelada',
  incomplete: 'Pagamento pendente',
  incomplete_expired: 'Pagamento não concluído',
  paused: 'Pausada',
}

const appUrl = () => process.env.APP_URL || 'https://prazo-certo-xi.vercel.app'
const idDe = (x: string | { id: string } | null | undefined) => (typeof x === 'string' ? x : x?.id ?? null)
export const codigoValido = (c?: string | null) => (c && /^[a-z0-9]{6,12}$/.test(c) ? c : null)

/** Atualiza a empresa a partir da assinatura. Só mexe no acesso de empresas no plano 'assinatura'. */
export async function sincronizarAssinatura(sub: Stripe.Subscription) {
  const admin = createAdminClient()
  const customer = idDe(sub.customer)
  const { data: emp } = await admin
    .from('empresas').select('id, plano')
    .or(`stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${customer}`)
    .limit(1).maybeSingle()
  if (!emp) return null
  const campos: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    stripe_customer_id: customer,
    assinatura_status: sub.status,
    assinatura_fim: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
  }
  if (emp.plano === 'assinatura') campos.ativo = STATUS_COM_ACESSO.includes(sub.status)
  await admin.from('empresas').update(campos).eq('id', emp.id)
  return emp.id
}

function emailBoasVindas(p: { nome: string; email: string; senha: string | null; empresa: string }) {
  const login = `${appUrl()}/login`
  const guia = `${appUrl()}/guia`
  const primeiro = p.nome.split(' ')[0] || 'tudo bem'
  const texto = [
    `Olá, ${primeiro}!`, '',
    `Sua assinatura do Prazo Certo para ${p.empresa} está ativa.`, '',
    p.senha ? `Acesse: ${login}\nE-mail: ${p.email}\nSenha provisória: ${p.senha}\n\nNo primeiro acesso você cria a sua senha e responde 7 perguntas rápidas sobre a empresa.` : `Entre com o seu e-mail de sempre em ${login}.`,
    '', `Guia do usuário: ${guia}`, '', 'Qualquer dúvida, é só responder este e-mail.',
  ].join('\n')
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f3f5f6;font-family:'Work Sans',Segoe UI,Roboto,Arial,sans-serif;color:#16181d">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border:1px solid #dddfe4;border-radius:16px;padding:24px">
  <div style="font-size:13px;color:#6a7181">Prazo Certo</div>
  <h1 style="font-size:20px;margin:6px 0 12px">Sua assinatura está ativa</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 16px">Olá, ${primeiro}! O Prazo Certo de <b>${p.empresa}</b> já está liberado.</p>
  ${p.senha ? `<table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px;margin:0 0 16px;background:#f6f8f9;border-radius:12px">
    <tr><td style="padding:10px 14px;color:#6a7181">E-mail</td><td style="padding:10px 14px"><b>${p.email}</b></td></tr>
    <tr><td style="padding:10px 14px;color:#6a7181">Senha provisória</td><td style="padding:10px 14px;font-family:monospace;font-size:16px"><b>${p.senha}</b></td></tr></table>
  <p style="font-size:14px;color:#6a7181;line-height:1.6;margin:0 0 20px">No primeiro acesso você cria a sua senha e responde 7 perguntas rápidas sobre a empresa.</p>` : ''}
  <a href="${login}" style="display:inline-block;background:#b69a5b;color:#0f141a;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:6px">Entrar no Prazo Certo</a>
  <p style="font-size:14px;margin:20px 0 0">Primeira vez? Veja o <a href="${guia}" style="color:#155179">guia do usuário com as telas passo a passo</a>.</p>
  </div><p style="font-size:12px;color:#6a7181;text-align:center;margin-top:16px">Coffee Assessoria · lembretes@coffeeassessoria.com.br</p></div></body></html>`
  return { assunto: 'Seu acesso ao Prazo Certo', texto, html }
}

/**
 * Checkout concluído: liga a assinatura a uma empresa existente (client_reference_id ou e-mail já cadastrado)
 * ou cria a empresa e o acesso com senha provisória e envia por e-mail. Idempotente.
 */
export async function provisionarCheckout(s: Stripe.Checkout.Session) {
  const admin = createAdminClient()
  const customer = idDe(s.customer)
  const subscription = idDe(s.subscription)
  const email = (s.customer_details?.email || s.customer_email || '').toLowerCase()
  const nomePessoa = s.customer_details?.name?.trim() || email.split('@')[0]
  const nomeEmpresa = s.custom_fields?.find((f) => f.key === 'empresa')?.text?.value?.trim() || nomePessoa
  const valor = s.amount_total != null ? s.amount_total / 100 : null
  const assinatura = { plano: 'assinatura', stripe_customer_id: customer, stripe_subscription_id: subscription, assinatura_status: 'active', ativo: true, ...(valor ? { valor_mensal: valor } : {}) }

  // 1. Já processado
  const { data: jaTem } = await admin.from('empresas').select('id').eq('stripe_customer_id', customer).maybeSingle()
  if (jaTem) return { empresaId: jaTem.id, novo: false }

  // 2. Cliente existente assinando (veio de Ajustes, ou o e-mail já tem acesso)
  let empresaId: string | null = s.client_reference_id && /^[0-9a-f-]{36}$/.test(s.client_reference_id) ? s.client_reference_id : null
  if (!empresaId && email) {
    const { data: perfil } = await admin.from('perfis').select('empresa_id').eq('email', email).not('empresa_id', 'is', null).limit(1).maybeSingle()
    empresaId = perfil?.empresa_id ?? null
  }
  if (empresaId) {
    const { data: emp } = await admin.from('empresas').select('id, nome').eq('id', empresaId).maybeSingle()
    if (emp) {
      await admin.from('empresas').update(assinatura).eq('id', emp.id)
      if (emailConfigurado() && email) {
        await enviarEmail({ para: [email], ...emailBoasVindas({ nome: nomePessoa, email, senha: null, empresa: emp.nome }) }).catch((e) => console.error('[stripe] e-mail', e))
      }
      return { empresaId: emp.id, novo: false }
    }
  }

  // 3. Cliente novo
  const ref = codigoValido(s.metadata?.ref)
  let indicadoPor: string | null = null
  if (ref) {
    const { data: ind } = await admin.from('empresas').select('id').eq('codigo_indicacao', ref).maybeSingle()
    indicadoPor = ind?.id ?? null
  }
  const fone = (s.customer_details?.phone || '').replace(/\D/g, '')
  const { data: nova, error } = await admin.from('empresas').insert({
    nome: nomeEmpresa, responsavel: nomePessoa, indicado_por: indicadoPor,
    whatsapp_numeros: fone.length >= 12 ? [fone] : [], ...assinatura,
  }).select('id').single()
  if (error) {
    // corrida com outra entrega do mesmo evento: o cliente já foi criado
    const { data: outra } = await admin.from('empresas').select('id').eq('stripe_customer_id', customer).maybeSingle()
    if (outra) return { empresaId: outra.id, novo: false }
    throw new Error(error.message)
  }
  if (!email) return { empresaId: nova.id, novo: true }
  const senha = await criarUsuario({ email, nome: nomePessoa, empresaId: nova.id, papel: 'admin' })
  if (emailConfigurado()) {
    await enviarEmail({ para: [email], ...emailBoasVindas({ nome: nomePessoa, email, senha, empresa: nomeEmpresa }) }).catch((e) => console.error('[stripe] e-mail', e))
  }
  return { empresaId: nova.id, novo: true }
}

/** Abre o Checkout da assinatura. ref = código de indicação; empresa = cliente já cadastrado assinando. */
export async function criarCheckout(p: { ref?: string | null; empresaId?: string | null; email?: string | null }) {
  const ref = codigoValido(p.ref)
  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    locale: 'pt-BR',
    allow_promotion_codes: true,
    phone_number_collection: { enabled: true },
    ...(p.email ? { customer_email: p.email } : {}),
    ...(p.empresaId ? { client_reference_id: p.empresaId } : {
      custom_fields: [{ key: 'empresa', label: { type: 'custom', custom: 'Nome da empresa' }, type: 'text' }],
    }),
    metadata: ref ? { ref } : {},
    subscription_data: { metadata: { ...(ref ? { ref } : {}), ...(p.empresaId ? { empresa_id: p.empresaId } : {}) } },
    success_url: `${appUrl()}/assinar/obrigado?s={CHECKOUT_SESSION_ID}`,
    cancel_url: p.empresaId ? `${appUrl()}/config` : `${appUrl()}/inicio${ref ? `?ref=${ref}` : ''}#preco`,
  })
  return session.url!
}
