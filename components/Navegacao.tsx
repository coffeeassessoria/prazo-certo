'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { IcoAdmin, IcoAjustes, IcoClientes, IcoHistorico, IcoMais, IcoPainel } from './Icones'

function useAtual() {
  const path = usePathname()
  const sp = useSearchParams()
  return (href: string) => {
    let ativo = false
    if (href === '/?f=historico') ativo = path === '/' && sp.get('f') === 'historico'
    else if (href === '/') ativo = path === '/' && sp.get('f') !== 'historico'
    else ativo = path.startsWith(href)
    return ativo ? { 'aria-current': 'page' as const } : {}
  }
}

export function Menu({ temEmpresa, superadmin }: { temEmpresa: boolean; superadmin: boolean }) {
  const a = useAtual()
  return (
    <nav className="menu" aria-label="Principal">
      {temEmpresa && (
        <>
          <Link href="/" {...a('/')}><IcoPainel />Vencimentos</Link>
          <Link href="/itens/novo" {...a('/itens/novo')}><IcoMais />Novo vencimento</Link>
          <Link href="/clientes" {...a('/clientes')}><IcoClientes />Clientes</Link>
          <Link href="/?f=historico" {...a('/?f=historico')}><IcoHistorico />Histórico</Link>
          <Link href="/config" {...a('/config')}><IcoAjustes />Configurações</Link>
        </>
      )}
      {superadmin && <Link href="/admin" {...a('/admin')}><IcoAdmin />Admin da plataforma</Link>}
    </nav>
  )
}

export function Abas({ superadmin }: { superadmin: boolean }) {
  const a = useAtual()
  return (
    <nav className="abas" aria-label="Navegação">
      <Link href="/" {...a('/')}><IcoPainel />Painel</Link>
      <Link href="/clientes" {...a('/clientes')}><IcoClientes />Clientes</Link>
      <Link href="/itens/novo" className="novo" aria-label="Novo vencimento"><span className="circulo"><IcoMais /></span>Novo</Link>
      {superadmin
        ? <Link href="/admin" {...a('/admin')}><IcoAdmin />Admin</Link>
        : <Link href="/?f=historico" {...a('/?f=historico')}><IcoHistorico />Histórico</Link>}
      <Link href="/config" {...a('/config')}><IcoAjustes />Ajustes</Link>
    </nav>
  )
}
