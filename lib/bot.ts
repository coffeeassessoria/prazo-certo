import { diasAte, fmtData, hojeISO, TIPOS } from '@/lib/datas'

export type ItemBot = {
  titulo: string
  tipo: string
  vencimento: string
  antecedencia_dias: number
  cliente_nome: string | null
}

export type Comando =
  | { tipo: 'ajuda' }
  | { tipo: 'resumo' }
  | { tipo: 'vencidos' }
  | { tipo: 'periodo'; dias: number }
  | { tipo: 'cliente'; busca: string }

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Interpreta a mensagem. Retorna null quando não é um comando (o bot fica em silêncio). */
export function interpretar(texto: string): Comando | null {
  const t = semAcento(texto).replace(/^[\/!#]/, '')
  if (/^(ajuda|menu|comandos|\?)$/.test(t)) return { tipo: 'ajuda' }
  if (/^(vencimentos|resumo|prazos|status)$/.test(t)) return { tipo: 'resumo' }
  if (/^(vencidos|atrasados)$/.test(t)) return { tipo: 'vencidos' }
  if (/^(hoje)$/.test(t)) return { tipo: 'periodo', dias: 0 }
  if (/^(semana|7|7 dias)$/.test(t)) return { tipo: 'periodo', dias: 7 }
  if (/^(mes|30|30 dias)$/.test(t)) return { tipo: 'periodo', dias: 30 }
  if (/^(60|60 dias)$/.test(t)) return { tipo: 'periodo', dias: 60 }
  if (/^(90|90 dias)$/.test(t)) return { tipo: 'periodo', dias: 90 }
  const c = t.match(/^cliente\s+(.{2,})$/)
  if (c) return { tipo: 'cliente', busca: c[1] }
  return null
}

export function textoAjuda(app: string): string {
  return [
    `🗓️ *${app}* — consultas`,
    '',
    '• *vencimentos* — resumo: vencidos + próximos 30 dias',
    '• *vencidos* — só o que já venceu',
    '• *hoje* — o que vence hoje',
    '• *semana* — próximos 7 dias',
    '• *mes* — próximos 30 dias (também 60 ou 90)',
    '• *cliente nome* — tudo de um cliente (ex.: cliente frigorífico)',
  ].join('\n')
}

function linha(i: ItemBot, hoje: string): string {
  const d = diasAte(i.vencimento, hoje)
  const quando = d < 0 ? `há ${-d}d` : d === 0 ? 'HOJE' : `em ${d}d`
  const cliente = i.cliente_nome ? ` · ${i.cliente_nome}` : ''
  return `• ${fmtData(i.vencimento).slice(0, 5)} (${quando}) — ${i.titulo}${cliente} _[${TIPOS[i.tipo] ?? i.tipo}]_`
}

function bloco(titulo: string, itens: ItemBot[], hoje: string, max = 15): string[] {
  if (!itens.length) return []
  const out = [`${titulo} (${itens.length})`, ...itens.slice(0, max).map((i) => linha(i, hoje))]
  if (itens.length > max) out.push(`…e mais ${itens.length - max}. Veja tudo no sistema.`)
  return out
}

/** Monta a resposta a partir dos itens ATIVOS (já filtrados pela empresa). */
export function responder(cmd: Comando, itens: ItemBot[], app: string, hoje = hojeISO()): string {
  if (cmd.tipo === 'ajuda') return textoAjuda(app)
  const ord = [...itens].sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  const vencidos = ord.filter((i) => diasAte(i.vencimento, hoje) < 0)

  if (cmd.tipo === 'vencidos') {
    return vencidos.length ? bloco('🔴 *Vencidos*', vencidos, hoje).join('\n') : '✅ Nada vencido. Tudo em dia!'
  }
  if (cmd.tipo === 'periodo') {
    const prox = ord.filter((i) => {
      const d = diasAte(i.vencimento, hoje)
      return d >= 0 && d <= cmd.dias
    })
    const rotulo = cmd.dias === 0 ? 'hoje' : `nos próximos ${cmd.dias} dias`
    return prox.length ? bloco(`🟡 *Vence ${rotulo}*`, prox, hoje).join('\n') : `✅ Nada vence ${rotulo}.`
  }
  if (cmd.tipo === 'cliente') {
    if (!ord.length) return `Não encontrei pendências para "${cmd.busca}".`
    const nomes = [...new Set(ord.map((i) => i.cliente_nome).filter(Boolean))].join(', ')
    return [`🏭 *${nomes || cmd.busca}*`, '', ...ord.map((i) => linha(i, hoje))].join('\n')
  }
  // resumo
  const prox30 = ord.filter((i) => {
    const d = diasAte(i.vencimento, hoje)
    return d >= 0 && d <= 30
  })
  const partes = [
    ...bloco('🔴 *Vencidos*', vencidos, hoje),
    ...(vencidos.length && prox30.length ? [''] : []),
    ...bloco('🟡 *Próximos 30 dias*', prox30, hoje),
  ]
  if (!partes.length) return '✅ Tudo em dia! Nada vencido nem vencendo nos próximos 30 dias.'
  return partes.join('\n')
}
