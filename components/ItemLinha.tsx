import Link from 'next/link'
import { diasAte, situacao, TIPOS, type Situacao } from '@/lib/datas'

export type ItemLista = {
  id: string
  titulo: string
  tipo: string
  vencimento: string
  antecedencia_dias: number
  status: string
  recorrencia_meses: number | null
  cliente_nome: string | null
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function prazo(s: Situacao, venc: string, hoje: string): [string, string] {
  if (s === 'renovado') return ['Renovado', '']
  if (s === 'concluido') return ['Concluído', '']
  const d = diasAte(venc, hoje)
  if (d === 0) return ['Vence hoje', '']
  if (d === 1) return ['Amanhã', '']
  if (d > 1) return [`${d} dias`, 'para vencer']
  if (d === -1) return ['Ontem', 'venceu']
  return [`${-d} dias`, 'vencido']
}

export function ItemLinha({ item, hoje }: { item: ItemLista; hoje: string }) {
  const s = situacao(item, hoje)
  const [a, m, d] = item.vencimento.split('-')
  const anoDiferente = a !== hoje.slice(0, 4)
  const [principal, apoio] = prazo(s, item.vencimento, hoje)
  return (
    <Link href={`/itens/${item.id}`} className="item">
      <span className={`carimbo ${s}`} aria-label={`Vence em ${d}/${m}/${a}`}>
        <span className="dia">{d}</span>
        <span className="mes">{MESES[Number(m) - 1]}{anoDiferente ? ` ${a.slice(2)}` : ''}</span>
      </span>
      <span>
        <span className="titulo" style={{ display: 'block' }}>{item.titulo}</span>
        <span className="meta">
          {item.cliente_nome && <span>{item.cliente_nome}</span>}
          <span>{TIPOS[item.tipo] ?? item.tipo}{item.recorrencia_meses ? ', repete' : ''}</span>
        </span>
      </span>
      <span className={`prazo ${s}`}>
        {principal}
        {apoio && <small>{apoio}</small>}
      </span>
    </Link>
  )
}
