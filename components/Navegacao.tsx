'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { IcoAdmin, IcoAjustes, IcoClientes, IcoHistorico, IcoMais, IcoPainel } from './Icones'

function useAtual() {
  const path = usePathname()
  const sp = useSearchParams()
  return (href: string) => {
    if (href === '/?f=historico') return path === '/' && sp.get('f') === 'historico'
    if (href === '/') return path === '/' && sp.get('f') !== 'historico'
    return path.startsWith(href)
  }
}

export function NavTopo({ temEmpresa, superadmin }: { temEmpresa: boolean; superadmin: boolean }) {
  const atual = useAtual()
  const a = (href: string) => (atual(href) ? { 'aria-current': 'page' as const } : {})
  return (
    <nav className="nav" aria-label="Principal">
      {temEmpresa && (
        <>
          <Link href="/" {...a('/')}>Painel</Link>
          <Link href="/clientes" {...a('/clientes')}>Clientes</Link>
          <Link href="/config" {...a('/config')}>Configurações</Link>
        </>
      )}
      {superadmin && <Link href="/admin" {...a('/admin')}>Admin</Link>}
    </nav>
  )
}

export function Abas({ superadmin }: { superadmin: boolean }) {
  const atual = useAtual()
  const a = (href: string) => (atual(href) ? { 'aria-current': 'page' as const } : {})
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
