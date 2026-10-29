import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/** Cabeçalho de página: título 30 bold, subtítulo com ícone, ação primária à direita (mobile: abaixo, largura total). */
export function Cabecalho({
  titulo, sub, subIcone, acao, voltar,
}: {
  titulo: string
  sub?: React.ReactNode
  subIcone?: React.ReactNode
  acao?: React.ReactNode
  voltar?: { href: string; rotulo: string }
}) {
  return (
    <>
      {voltar && (
        <Link href={voltar.href} className="voltar"><ArrowLeft size={16} aria-hidden /> {voltar.rotulo}</Link>
      )}
      <div className="cabecalho">
        <div>
          <h1>{titulo}</h1>
          {sub && <div className="cabecalho-sub">{subIcone}{sub}</div>}
        </div>
        {acao}
      </div>
    </>
  )
}
