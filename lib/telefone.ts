/** Só dígitos; acrescenta 55 em números brasileiros sem DDI. */
export function normalizarTelefone(bruto: string): string {
  let n = (bruto || '').replace(/\D/g, '')
  if (n.length === 10 || n.length === 11) n = '55' + n
  return n
}

/**
 * Variações do mesmo número brasileiro com e sem o 9º dígito
 * (o WhatsApp às vezes entrega o número sem o 9).
 */
export function variantesTelefone(bruto: string): string[] {
  const n = normalizarTelefone(bruto)
  const set = new Set([n])
  if (n.startsWith('55')) {
    const ddd = n.slice(2, 4)
    const resto = n.slice(4)
    if (resto.length === 9 && resto.startsWith('9')) set.add('55' + ddd + resto.slice(1))
    if (resto.length === 8) set.add('55' + ddd + '9' + resto)
  }
  return [...set]
}

export function fmtTelefone(n: string): string {
  const d = n.replace(/\D/g, '')
  if (d.startsWith('55') && d.length === 13) return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  if (d.startsWith('55') && d.length === 12) return `(${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`
  return d
}
