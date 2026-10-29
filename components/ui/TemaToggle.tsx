'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

const CHAVE = 'pc-tema'

/** Script que roda antes da pintura (no <head>) para não piscar o tema errado. */
export const scriptTema = `(function(){try{var t=localStorage.getItem('${CHAVE}');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`

export function TemaToggle({ comTexto = false }: { comTexto?: boolean }) {
  const [tema, setTema] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    setTema((document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light')
  }, [])
  function alternar() {
    const novo = tema === 'dark' ? 'light' : 'dark'
    setTema(novo)
    document.documentElement.setAttribute('data-theme', novo)
    try { localStorage.setItem(CHAVE, novo) } catch {}
  }
  const rotulo = tema === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'
  return (
    <button type="button" onClick={alternar} className={`btn sec ${comTexto ? '' : 'icone'}`} aria-label={rotulo} title={rotulo}>
      {tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      {comTexto && <span>{tema === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>}
    </button>
  )
}
