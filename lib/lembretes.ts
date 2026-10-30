import { ACOMPANHAMENTO, diasAte, fmtData, ROTULO_TIPO } from '@/lib/datas'

/**
 * Regras de quando avisar (cada marco é enviado uma única vez por item):
 *  - "antecedencia": ao entrar na janela de aviso escolhida (ex.: 30 dias antes)
 *  - "7d": 7 dias antes   - "1d": 1 dia antes   - "hoje": no dia
 *  - "atraso-N": depois de vencido, uma vez por semana (N = semana do atraso)
 * Acompanhamentos só avisam no dia do retorno e, se ficarem sem resposta, a cada 2 dias.
 * O marco leva a data, para um acompanhamento adiado voltar a avisar na nova data.
 */
export function marcoDoDia(dias: number, antecedencia: number, tipo?: string, vencimento?: string): string | null {
  if (tipo === ACOMPANHAMENTO) {
    if (dias > 0) return null
    if (dias === 0) return `ret-${vencimento}`
    return `ret-${vencimento}-a${Math.floor((-dias - 1) / 2)}`
  }
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

function quandoRetorno(d: number) {
  if (d === 0) return 'retorno hoje'
  if (d === -1) return 'atrasado desde ontem'
  return `atrasado há ${-d} dias`
}

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
  const retornos = ord.filter((i) => i.tipo === ACOMPANHAMENTO)
  const venc = ord.filter((i) => i.tipo !== ACOMPANHAMENTO)
  const vencidos = venc.filter((i) => diasAte(i.vencimento, hoje) < 0)
  const hojeL = venc.filter((i) => diasAte(i.vencimento, hoje) === 0)
  const proximos = venc.filter((i) => diasAte(i.vencimento, hoje) > 0)

  const partes: string[] = []
  if (vencidos.length) partes.push(`${vencidos.length} vencido${vencidos.length > 1 ? 's' : ''}`)
  if (hojeL.length) partes.push(`${hojeL.length} vence${hojeL.length > 1 ? 'm' : ''} hoje`)
  if (proximos.length) partes.push(`${proximos.length} vence${proximos.length > 1 ? 'm' : ''} em breve`)
  if (retornos.length) partes.push(`${retornos.length} retorno${retornos.length > 1 ? 's' : ''} para fazer`)
  const primeiro = venc[0] ?? retornos[0]
  const assunto = `${partes.join(', ')}: ${primeiro.titulo}${ord.length > 1 ? ` e mais ${ord.length - 1}` : ''}`

  // Cores do DS 2.0 (claro): danger-text, warning-text, brand-700
  const cor: Record<string, string> = { v: '#b42318', h: '#92400e', p: '#155179' }
  const fundo: Record<string, string> = { v: '#fef3f2', h: '#fef3c7', p: '#f0f7fc' }
  const borda: Record<string, string> = { v: '#fecdca', h: '#fde68a', p: '#d8eaf5' }
  const bloco = (titulo: string, lista: ItemLembrete[], k: string) =>
    !lista.length ? '' : `
      <h2 style="font-size:15px;margin:24px 0 8px;color:${cor[k]}">${titulo}</h2>
      ${lista.map((i) => {
        const d = diasAte(i.vencimento, hoje)
        const prazo = i.tipo === ACOMPANHAMENTO ? quandoRetorno(d) : quando(d)
        return `<a href="${appUrl}/itens/${i.id}" style="display:block;text-decoration:none;color:#16181d;border:1px solid #dddfe4;border-radius:12px;padding:12px;margin-bottom:8px">
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>
          <td style="width:52px;height:52px;border-radius:8px;background:${fundo[k]};border:1px solid ${borda[k]};text-align:center;vertical-align:middle;color:${cor[k]};font-weight:700;line-height:1">
            <div style="font-size:20px">${i.vencimento.slice(8, 10)}</div><div style="font-size:10px;margin-top:2px">${['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][Number(i.vencimento.slice(5, 7)) - 1]}</div>
          </td><td style="padding-left:12px;vertical-align:middle">
          <div style="font-weight:600;font-size:15px">${esc(i.titulo)}</div>
          <div style="font-size:13px;color:#6a7181;margin-top:2px">${i.cliente_nome ? esc(i.cliente_nome) + ' · ' : ''}${ROTULO_TIPO[i.tipo] ?? i.tipo} · ${fmtData(i.vencimento)} · <strong style="color:${cor[k]}">${prazo}</strong></div>
          </td></tr></table>
        </a>`
      }).join('')}`

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f3f5f6;font-family:'Work Sans',Segoe UI,Roboto,Arial,sans-serif;color:#16181d">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#fff;border:1px solid #dddfe4;border-radius:16px;padding:24px">
      <div style="font-size:13px;color:#6a7181">${esc(appNome)} · ${esc(empresa)}</div>
      <h1 style="font-size:20px;margin:6px 0 4px">${venc.length ? 'Lembrete de vencimentos' : 'Retornos para fazer'}</h1>
      <p style="margin:0;color:#6a7181;font-size:14px">Estes itens precisam da sua atenção.</p>
      ${bloco('Vencidos', vencidos, 'v')}
      ${bloco('Vencem hoje', hojeL, 'h')}
      ${bloco('Vencem em breve', proximos, 'p')}
      ${bloco('Retornos e cobranças para fazer', retornos, 'h')}
      <a href="${appUrl}" style="display:inline-block;margin-top:20px;background:#155179;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:6px">Abrir o painel</a>
      <p style="font-size:12px;color:#6a7181;margin:20px 0 0">Depois de renovar, marque como renovado no sistema para parar os avisos deste item. Nos retornos, marque como resolvido ou adie para outro dia.</p>
    </div>
    <p style="font-size:12px;color:#6a7181;text-align:center;margin-top:16px">Você recebe este e-mail porque está cadastrado para lembretes da ${esc(empresa)}. Para mudar, acesse Configurações no sistema.</p>
  </div></body></html>`

  const texto = [
    `${appNome} · ${empresa}`, 'Lembrete de vencimentos', '',
    ...ord.map((i) => `- ${i.titulo}${i.cliente_nome ? ' (' + i.cliente_nome + ')' : ''}: ${fmtData(i.vencimento)}, ${i.tipo === ACOMPANHAMENTO ? quandoRetorno(diasAte(i.vencimento, hoje)) : quando(diasAte(i.vencimento, hoje))}`),
    '', `Abrir o painel: ${appUrl}`,
  ].join('\n')

  return { assunto, html, texto }
}
