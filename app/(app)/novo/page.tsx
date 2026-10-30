import Link from 'next/link'
import { BellRing, CalendarClock } from 'lucide-react'
import { exigirEmpresa } from '@/lib/contexto'
import { Cabecalho } from '@/components/ui/Cabecalho'

/** Escolha do botão "Novo" (barra de abas do celular): vencimento ou acompanhamento. */
export default async function Novo() {
  await exigirEmpresa()
  return (
    <div style={{ maxWidth: 720 }}>
      <Cabecalho voltar={{ href: '/', rotulo: 'Painel' }} titulo="O que você quer cadastrar?" />
      <div className="opcoes">
        <Link href="/itens/novo" className="opcao">
          <strong className="titulo-icone"><CalendarClock size={20} aria-hidden />Vencimento</strong>
          <span>PMOC, laudo, ART, contrato ou manutenção com data para vencer.</span>
        </Link>
        <Link href="/acompanhamentos/novo" className="opcao">
          <strong className="titulo-icone"><BellRing size={20} aria-hidden />Acompanhamento</strong>
          <span>Um retorno curto: cobrar um orçamento, voltar para conferir um conserto.</span>
        </Link>
      </div>
    </div>
  )
}
