import Link from 'next/link'
import { Suspense } from 'react'
import { Abas, Menu } from './Navegacao'

/** Estrutura visual do app: sidebar no computador, topo + abas no celular. */
export function Casca({
  children, empresa, email, temEmpresa, superadmin,
}: {
  children: React.ReactNode
  empresa?: string | null
  email?: string
  temEmpresa: boolean
  superadmin: boolean
}) {
  const nome = process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'
  const marca = (
    <Link href="/" className="marca">
      <img src="/icon-192.png" alt="" />
      <span>
        <span className="nome">{nome}</span>
        {empresa && <span className="empresa">{empresa}</span>}
      </span>
    </Link>
  )
  return (
    <div className="app">
      <aside className="sidebar">
        {marca}
        <Suspense><Menu temEmpresa={temEmpresa} superadmin={superadmin} /></Suspense>
        <div className="rodape">
          {email && <div className="quem">{email}</div>}
          <form action="/sair" method="post"><button className="btn sec peq cheio">Sair</button></form>
        </div>
      </aside>
      <header className="topo-mobile">{marca}</header>
      <div className="principal">
        <main className="conteudo">{children}</main>
      </div>
      {temEmpresa && <Suspense><Abas superadmin={superadmin} /></Suspense>}
    </div>
  )
}
