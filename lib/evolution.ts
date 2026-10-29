import 'server-only'

export async function enviarTexto(destino: string, texto: string, instancia?: string) {
  const url = process.env.EVOLUTION_API_URL
  const key = process.env.EVOLUTION_API_KEY
  const inst = instancia || process.env.EVOLUTION_INSTANCE
  if (!url || !key || !inst) throw new Error('Evolution API não configurada')
  const r = await fetch(`${url.replace(/\/$/, '')}/message/sendText/${encodeURIComponent(inst)}`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    // formato Evolution API v2
    body: JSON.stringify({ number: destino, text: texto }),
  })
  if (!r.ok) throw new Error(`Evolution ${r.status}: ${await r.text()}`)
}

/** Extrai remetente e texto do payload do webhook (Evolution v2, evento messages.upsert). */
export function lerMensagem(body: any): { jid: string; numero: string; texto: string } | null {
  const evento = String(body?.event ?? '').toLowerCase().replace(/_/g, '.')
  if (evento && evento !== 'messages.upsert') return null
  const data = Array.isArray(body?.data) ? body.data[0] : body?.data
  const key = data?.key
  if (!key || key.fromMe) return null
  const jidOriginal: string = key.remoteJid ?? ''
  if (jidOriginal.endsWith('@g.us') || jidOriginal === 'status@broadcast') return null
  // Contas com LID: o número real vem em remoteJidAlt/senderPn
  const jidNumero: string = [key.remoteJidAlt, key.senderPn, data?.senderPn, jidOriginal].find(
    (j: unknown) => typeof j === 'string' && j.includes('@s.whatsapp.net')
  ) ?? ''
  const numero = jidNumero.split('@')[0].replace(/\D/g, '')
  const m = data?.message ?? {}
  const texto: string =
    m.conversation ?? m.extendedTextMessage?.text ?? m.imageMessage?.caption ?? ''
  if (!numero || !texto.trim()) return null
  return { jid: jidOriginal, numero, texto: texto.trim() }
}
