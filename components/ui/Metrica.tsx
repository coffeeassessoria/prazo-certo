import Link from 'next/link'

type Tom = 'vencido' | 'atencao' | 'ok' | 'neutro'

/** Card de métrica: número 28 bold, rótulo com ponto de status, apoio 12px. Selecionado = fundo brand-50 + anel. */
export function Metrica({ valor, rotulo, apoio, tom = 'neutro', href, ativo = false }: {
  valor: React.ReactNode; rotulo: string; apoio?: string; tom?: Tom; href?: string; ativo?: boolean
}) {
  const conteudo = (
    <>
      <span className="metrica-n">{valor}</span>
      <span className="metrica-r">{tom !== 'neutro' && <span className={`ponto ${tom}`} aria-hidden />}{rotulo}</span>
      {apoio && <span className="metrica-d">{apoio}</span>}
    </>
  )
  const cls = `metrica ${ativo ? 'ativo' : ''}`
  return href
    ? <Link href={href} className={cls} aria-current={ativo ? 'true' : undefined}>{conteudo}</Link>
    : <div className={cls}>{conteudo}</div>
}
