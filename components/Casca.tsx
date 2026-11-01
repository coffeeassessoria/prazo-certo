import Link from 'next/link'
import { Suspense } from 'react'
import { Sair } from './ui/Sair'
import { Abas, Menu, MenuGaveta } from './Navegacao'
import { Logo } from './ui/Logo'
import { TemaToggle } from './ui/TemaToggle'
import { ToastDaUrl } from './ui/Toast'

function iniciais(nome: string) {
  return nome.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
}

/**
 * Estrutura do app (DS 2.0 · Layout):
 * header 64px fixo · sidebar 280px (>1024) · gaveta (≤1024) · abas 72px (<768)
 */
export function Casca({
  children, empresa, email, nome, temEmpresa, superadmin,
}: {
  children: React.ReactNode
  empresa?: string | null
  email?: string
  nome?: string
  temEmpresa: boolean
  superadmin: boolean
}) {
  const quem = nome || email || ''
  return (
    <>
      <header className="pc-header">
        <div className="pc-header-in">
          <div className="pc-header-esq">
            <Suspense><MenuGaveta temEmpresa={temEmpresa} superadmin={superadmin} /></Suspense>
            <Link href="/" className="marca" aria-label="Ir para o painel"><Logo sub={empresa} /></Link>
          </div>
          <div className="pc-header-acoes">
            <TemaToggle />
          </div>
        </div>
      </header>
      <div className="pc-corpo">
        <aside className="pc-sidebar">
          <Suspense><Menu temEmpresa={temEmpresa} superadmin={superadmin} /></Suspense>
          <div className="sidebar-rodape">
            <span className="avatar" aria-hidden>{iniciais(quem)}</span>
            <span className="sidebar-quem"><b>{quem}</b>{email && nome && <span>{email}</span>}</span>
            <Sair />
          </div>
        </aside>
        <main className="pc-main">
          <div className="conteudo">{children}</div>
        </main>
      </div>
      {temEmpresa && <Suspense><Abas superadmin={superadmin} /></Suspense>}
      <Suspense><ToastDaUrl /></Suspense>
    </>
  )
}
