/** Query string de toast para redirect() nas server actions (ver components/ui/Toast). */
export function qsToast(titulo: string, descricao?: string, tipo?: 'info') {
  const p = new URLSearchParams({ toast: titulo })
  if (descricao) p.set('toastd', descricao)
  if (tipo) p.set('toastt', tipo)
  return p.toString()
}
