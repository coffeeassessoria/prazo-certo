import { MESES_CURTOS, hojeISO, type Situacao } from '@/lib/datas'

/** Componente-assinatura: data "carimbada" numa etiqueta com furo. Cor = status. */
export function Etiqueta({ data, status, grande = false, rotulo = 'Vence em' }: { data: string; status?: Situacao | 'neutro'; grande?: boolean; rotulo?: string }) {
  const [a, m, d] = data.slice(0, 10).split('-')
  const outroAno = a !== hojeISO().slice(0, 4)
  const st = status && status !== 'neutro' ? status : ''
  return (
    <span className={`etiqueta ${st} ${grande ? 'grande' : ''}`} aria-label={`${rotulo} ${d}/${m}/${a}`}>
      <span className="etiqueta-dia">{d}</span>
      <span className="etiqueta-mes">{MESES_CURTOS[Number(m) - 1]}{outroAno ? ` ${a.slice(2)}` : ''}</span>
    </span>
  )
}
