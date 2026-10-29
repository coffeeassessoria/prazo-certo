import { diasAte, fmtData, TIPOS } from '@/lib/datas'

/**
 * Regras de quando avisar (cada marco é enviado uma única vez por item):
 *  - "antecedencia": ao entrar na janela de aviso escolhida (ex.: 30 dias antes)
 *  - "7d": 7 dias antes   - "1d": 1 dia antes   - "hoje": no dia
 *  - "atraso-N": depois de vencido, uma vez por semana (N = semana do atraso)
 */
export function marcoDoDia(dias: number, antecedencia: number): string | null {
  if (dias < 0) return `atraso-${Math.floor((-dias - 1) / 7)}`
  if (dias === 0) return 'hoje'
  if (dias === 1) return '1d'
  if (dias <= 7) return '7d'
  if (dias <= antecedencia) return 'antecedencia'
  return null
}

export type ItemLembrete = {
  id: string
  titulo: string
  tipo: string
  vencimento: string
  antecedencia_dias: number
  cliente_nome: string | null
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

function quando(d: number) {
  if (d < -1) return `venceu há ${-d} dias`
  if (d === -1) return 'venceu ontem'
  if (d === 0) return 'vence hoje'
  if (d === 1) return 'vence amanhã'
  return `vence em ${d} dias`
}

/** Monta assunto, texto e HTML do e-mail-resumo do dia para uma empresa. */
export function montarEmail(empresa: string, itens: ItemLembrete[], hoje: string, appUrl: string, appNome: string) {
  const ord = [...itens].sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  const vencidos = ord.filter((i) => diasAte(i.vencimento, hoje) < 0)
  const hojeL = ord.filter((i) => diasAte(i.vencimento, hoje) === 0)
  const proximos = ord.filter((i) => diasAte(i.vencimento, hoje) > 0)

  const partes: string[] = []
  if (vencidos.length) partes.push(`${vencidos.length} vencido${vencidos.length > 1 ? 's' : ''}`)
  if (hojeL.length) partes.push(`${hojeL.length} vence${hojeL.length > 1 ? 'm' : ''} hoje`)
  if (proximos.length) partes.push(`${proximos.length} vence${proximos.length > 1 ? 'm' : ''} em breve`)
  const assunto = `${partes.join(', ')}: ${ord[0].titulo}${ord.length > 1 ? ` e mais ${ord.length - 1}` : ''}`

  const cor: Record<string, string> = { v: '#c4321f', h: '#b26a00', p: '#155179' }
  const bloco = (titulo: string, lista: ItemLembrete[], k: string) =>
    !lista.length ? '' : `
      <h2 style="font-size:15px;margin:24px 0 8px;color:${cor[k]}">${titulo}</h2>
      ${lista.map((i) => {
        const d = diasAte(i.vencimento, hoje)
        return `<a href="${appUrl}/itens/${i.id}" style="display:block;text-decoration:none;color:#16181d;border:1px solid #dddfe4;border-left:4px solid ${cor[k]};border-radius:8px;padding:12px 14px;margin-bottom:8px">
          <div style="font-weight:600;font-size:15px">${esc(i.titulo)}</div>
          <div style="font-size:13px;color:#6a7181;margin-top:2px">${i.cliente_nome ? esc(i.cliente_nome) + ' · ' : ''}${TIPOS[i.tipo] ?? i.tipo} · ${fmtData(i.vencimento)} · <strong style="color:${cor[k]}">${quando(d)}</strong></div>
        </a>`
      }).join('')}`

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f3f5f6;font-family:'Work Sans',Segoe UI,Roboto,Arial,sans-serif;color:#16181d">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#fff;border:1px solid #dddfe4;border-radius:12px;padding:24px">
      <div style="font-size:13px;color:#6a7181">${esc(appNome)} · ${esc(empresa)}</div>
      <h1 style="font-size:20px;margin:6px 0 4px">Lembrete de vencimentos</h1>
      <p style="margin:0;color:#6a7181;font-size:14px">Estes itens precisam da sua atenção.</p>
      ${bloco('Vencidos', vencidos, 'v')}
      ${bloco('Vencem hoje', hojeL, 'h')}
      ${bloco('Vencem em breve', proximos, 'p')}
      <a href="${appUrl}" style="display:inline-block;margin-top:20px;background:#155179;color:#fafafa;text-decoration:none;font-weight:500;padding:12px 18px;border-radius:6px">Abrir o painel</a>
      <p style="font-size:12px;color:#6a7181;margin:20px 0 0">Depois de renovar, marque como renovado no sistema para parar os avisos deste item.</p>
    </div>
    <p style="font-size:12px;color:#6a7181;text-align:center;margin-top:16px">Você recebe este e-mail porque está cadastrado para lembretes da ${esc(empresa)}. Para mudar, acesse Configurações no sistema.</p>
  </div></body></html>`

  const texto = [
    `${appNome} · ${empresa}`, 'Lembrete de vencimentos', '',
    ...ord.map((i) => `- ${i.titulo}${i.cliente_nome ? ' (' + i.cliente_nome + ')' : ''}: ${fmtData(i.vencimento)}, ${quando(diasAte(i.vencimento, hoje))}`),
    '', `Abrir o painel: ${appUrl}`,
  ].join('\n')

  return { assunto, html, texto }
}
