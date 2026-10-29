import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { somarDias } from '@/lib/datas'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://www.googleapis.com/calendar/v3'
const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events']

export const googleConfigurado = () =>
  !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.APP_URL)

const redirectUri = () => `${process.env.APP_URL}/api/google/callback`

export function urlAutorizacao(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `${AUTH_URL}?${p}`
}

export async function trocarCodigo(code: string) {
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(j.error_description || j.error || 'Falha ao trocar código do Google')
  let email: string | null = null
  if (j.id_token) {
    try {
      email = JSON.parse(Buffer.from(j.id_token.split('.')[1], 'base64url').toString()).email ?? null
    } catch {}
  }
  return { refreshToken: j.refresh_token as string | undefined, email }
}

async function accessToken(refreshToken: string): Promise<string> {
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`Google: ${j.error_description || j.error}`)
  return j.access_token
}

type Conexao = { token: string; calendarId: string }

async function conexao(empresaId: string): Promise<Conexao | null> {
  if (!googleConfigurado()) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('google_conexoes')
    .select('refresh_token, calendar_id')
    .eq('empresa_id', empresaId)
    .maybeSingle()
  if (!data) return null
  return { token: await accessToken(data.refresh_token), calendarId: data.calendar_id || 'primary' }
}

export type ItemAgenda = {
  titulo: string
  tipo: string
  vencimento: string
  antecedencia_dias: number
  descricao?: string | null
  cliente_nome?: string | null
  google_event_id?: string | null
  id: string
}

const EMOJI: Record<string, string> = { documento: '📄', manutencao: '🔧', contrato: '📝', outro: '📌' }
const MAX_MIN = 40320 // limite do Google: 4 semanas

function montarEvento(item: ItemAgenda) {
  const titulo = `${EMOJI[item.tipo] ?? '📌'} Vence: ${item.titulo}${item.cliente_nome ? ' — ' + item.cliente_nome : ''}`
  const minutosAviso = Math.min(Math.max(item.antecedencia_dias, 0) * 1440, MAX_MIN)
  const overrides = [{ method: 'popup', minutes: 0 }, { method: 'popup', minutes: 1440 }]
  if (minutosAviso > 1440) {
    overrides.push({ method: 'popup', minutes: minutosAviso }, { method: 'email', minutes: minutosAviso })
  }
  const link = process.env.APP_URL ? `\n\nAbrir no sistema: ${process.env.APP_URL}/itens/${item.id}` : ''
  return {
    summary: titulo,
    description: `${item.descricao ?? ''}${link}`.trim(),
    start: { date: item.vencimento },
    end: { date: somarDias(item.vencimento, 1) },
    transparency: 'transparent',
    reminders: { useDefault: false, overrides },
    extendedProperties: { private: { prazoCertoId: item.id } },
  }
}

/** Cria ou atualiza o evento. Retorna o id do evento (ou null se a empresa não conectou o Google). */
export async function sincronizarEvento(empresaId: string, item: ItemAgenda): Promise<string | null> {
  const c = await conexao(empresaId)
  if (!c) return null
  const base = `${API}/calendars/${encodeURIComponent(c.calendarId)}/events`
  const headers = { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' }
  const corpo = JSON.stringify(montarEvento(item))

  if (item.google_event_id) {
    const r = await fetch(`${base}/${item.google_event_id}`, { method: 'PATCH', headers, body: corpo })
    if (r.ok) return (await r.json()).id
    if (r.status !== 404 && r.status !== 410) throw new Error(`Google Calendar ${r.status}: ${await r.text()}`)
  }
  const r = await fetch(base, { method: 'POST', headers, body: corpo })
  if (!r.ok) throw new Error(`Google Calendar ${r.status}: ${await r.text()}`)
  return (await r.json()).id
}

/** Marca o evento como resolvido (sem alertas), mantendo histórico na agenda. */
export async function finalizarEvento(empresaId: string, eventId: string, rotulo: string, titulo: string) {
  const c = await conexao(empresaId)
  if (!c) return
  await fetch(`${API}/calendars/${encodeURIComponent(c.calendarId)}/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary: `✅ ${rotulo}: ${titulo}`, reminders: { useDefault: false, overrides: [] } }),
  })
}

export async function removerEvento(empresaId: string, eventId: string) {
  const c = await conexao(empresaId)
  if (!c) return
  await fetch(`${API}/calendars/${encodeURIComponent(c.calendarId)}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${c.token}` },
  })
}

/** Não deixa falha do Google impedir o salvamento. */
export async function semFalhar<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (e) {
    console.error('[google]', e)
    return null
  }
}
