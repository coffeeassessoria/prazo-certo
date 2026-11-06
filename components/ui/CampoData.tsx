'use client'

import { useEffect, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'

const ISO = /^\d{4}-\d{2}-\d{2}$/

function paraBR(iso: string) {
  return ISO.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : ''
}

/** Aplica a máscara dd/mm/aaaa enquanto digita (aceita colar "06112026" ou "6/11/2026"). */
function mascarar(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** "06/11/2026" -> "2026-11-06" (só datas que existem no calendário). */
export function brParaIso(br: string): string {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return ''
  const [, d, mes, a] = m
  const dt = new Date(Date.UTC(+a, +mes - 1, +d))
  if (dt.getUTCFullYear() !== +a || dt.getUTCMonth() !== +mes - 1 || dt.getUTCDate() !== +d) return ''
  return `${a}-${mes}-${d}`
}

/**
 * Data digitável (DS 2.0): o usuário escreve dd/mm/aaaa com teclado numérico ou abre o calendário pelo botão.
 * Envia o valor no formulário em AAAA-MM-DD (campo oculto `name`), igual ao input type="date".
 */
export function CampoData({
  id, name, value, defaultValue, onChange, min, max, required, disabled, invalido, describedBy,
}: {
  id: string
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (iso: string) => void
  min?: string
  max?: string
  required?: boolean
  disabled?: boolean
  invalido?: boolean
  describedBy?: string
}) {
  const controlado = value !== undefined
  const [iso, setIso] = useState(controlado ? value! : defaultValue ?? '')
  const [texto, setTexto] = useState(paraBR(controlado ? value! : defaultValue ?? ''))
  const [foraDoLimite, setForaDoLimite] = useState(false)
  const nativo = useRef<HTMLInputElement>(null)

  // Valor controlado de fora (ex.: modelo aplicado ou formulário restaurado)
  useEffect(() => {
    if (controlado && value !== iso) { setIso(value!); setTexto(paraBR(value!)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function aplicar(novo: string) {
    setIso(novo)
    setForaDoLimite(!!novo && ((!!min && novo < min) || (!!max && novo > max)))
    onChange?.(novo)
  }

  function digitar(v: string) {
    const t = mascarar(v)
    setTexto(t)
    const conv = t.length === 10 ? brParaIso(t) : ''
    if (conv !== iso) aplicar(conv)
  }

  function abrirCalendario() {
    const el = nativo.current
    if (!el) return
    try { el.showPicker() } catch { el.focus(); el.click() }
  }

  const incompleto = texto.length === 10 && !iso
  return (
    <div className={`campo-data ${invalido || incompleto || foraDoLimite ? 'invalido' : ''}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        value={texto}
        disabled={disabled}
        required={required}
        aria-invalid={invalido || incompleto || foraDoLimite || undefined}
        aria-describedby={describedBy}
        pattern="\d{2}/\d{2}/\d{4}"
        onChange={(e) => digitar(e.target.value)}
        onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Digite a data no formato dd/mm/aaaa')}
        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
      />
      <button type="button" className="btn ghost icone peq" onClick={abrirCalendario} disabled={disabled} aria-label="Escolher no calendário">
        <Calendar size={18} aria-hidden />
      </button>
      <input
        ref={nativo}
        type="date"
        tabIndex={-1}
        aria-hidden
        className="campo-data-nativo"
        value={iso}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => { setTexto(paraBR(e.target.value)); aplicar(e.target.value) }}
      />
      {name && <input type="hidden" name={name} value={iso} />}
      {incompleto && <span className="erro-campo campo-data-msg">Essa data não existe. Confira o dia e o mês.</span>}
      {foraDoLimite && !incompleto && <span className="erro-campo campo-data-msg">{min && iso < min ? `Use uma data a partir de ${paraBR(min)}.` : `Use uma data até ${paraBR(max!)}.`}</span>}
    </div>
  )
}
