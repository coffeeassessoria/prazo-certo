'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/** Registra cada tela aberta para o painel de uso do Admin. Silencioso: falhas são ignoradas. */
export function RegistroUso() {
  const caminho = usePathname()
  const filtro = useSearchParams().get('f')
  useEffect(() => {
    const chave = `${caminho}|${filtro ?? ''}`
    try {
      const ultimo = sessionStorage.getItem('pc-uso')
      if (ultimo === chave) return
      sessionStorage.setItem('pc-uso', chave)
    } catch {}
    const corpo = JSON.stringify({ p: caminho, f: filtro })
    try {
      if (!navigator.sendBeacon?.('/api/uso', new Blob([corpo], { type: 'text/plain' }))) {
        fetch('/api/uso', { method: 'POST', body: corpo, keepalive: true }).catch(() => {})
      }
    } catch {}
  }, [caminho, filtro])
  return null
}
