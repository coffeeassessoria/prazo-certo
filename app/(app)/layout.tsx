import Link from 'next/link'
import { Suspense } from 'react'
import { getContexto } from '@/lib/contexto'
import { Abas, NavTopo } from '@/components/Navegacao'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContexto()
  const nome = process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'
  const temEmpresa = !!ctx.empresa?.ativo

  return (
    <>
      <header className="topo">
        <Link href="/" className="marca">
          <img src="/icon-192.png" alt="" />
          <span className="textos">
            <span className="nome">{nome}</span>
            {ctx.empresa && <span className="empresa">{ctx.empresa.nome}</span>}
          </span>
        </Link>
        <Suspense>
          <NavTopo temEmpresa={temEmpresa} superadmin={ctx.superadmin} />
        </Suspense>
        <form action="/sair" method="post" className="so-desktop">
          <button className="btn peq sec">Sair</button>
        </form>
      </header>
      <main className="conteudo">{children}</main>
      {temEmpresa && (
        <Suspense>
          <Abas superadmin={ctx.superadmin} />
        </Suspense>
      )}
    </>
  )
}
