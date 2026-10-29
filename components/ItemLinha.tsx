import Link from 'next/link'
import { Building2, Repeat } from 'lucide-react'
import { diasAte, situacao, TIPOS, type Situacao } from '@/lib/datas'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Selo } from '@/components/ui/Selo'

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

export function textoStatus(s: Situacao, venc: string, hoje: string): string {
  if (s === 'renovado') return 'renovado'
  if (s === 'concluido') return 'concluído'
  const d = diasAte(venc, hoje)
  if (d === 0) return 'vence hoje'
  if (d === 1) return 'vence amanhã'
  if (d === -1) return 'venceu ontem'
  if (d < 0) return `${-d} dias vencido`
  if (s === 'ok') return 'em dia'
  return `vence em ${d} dias`
}

/** Item da lista (DS 2.0): etiqueta + título 16 semibold + meta 13 com ícone + selo de status. */
export function ItemLinha({ item, hoje }: { item: ItemLista; hoje: string }) {
  const s = situacao(item, hoje)
  const tom = s === 'renovado' || s === 'concluido' ? 'neutro' : s
  const selo = <Selo tom={tom} peq>{textoStatus(s, item.vencimento, hoje)}</Selo>
  return (
    <Link href={`/itens/${item.id}`} className="item">
      <Etiqueta data={item.vencimento} status={s} />
      <span className="item-corpo">
        <span className="item-titulo">{item.titulo}</span>
        <span className="item-meta">
          <Building2 size={14} aria-hidden />
          <span>{item.cliente_nome ? `${item.cliente_nome} • ` : ''}{TIPOS[item.tipo] ?? item.tipo}</span>
          {item.recorrencia_meses ? <><Repeat size={13} aria-label="Repete" /></> : null}
        </span>
        <span className="item-selo-mobile">{selo}</span>
      </span>
      {selo}
    </Link>
  )
}
