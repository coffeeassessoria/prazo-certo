'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useSearchParams } from 'next/navigation'
import { BellRing, History, LayoutDashboard, Menu as IcoMenu, Plus, Settings, ShieldCheck, Users, X, Palette } from 'lucide-react'

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

type Props = { temEmpresa: boolean; superadmin: boolean; aoNavegar?: () => void }

/** Itens do menu lateral (desktop e gaveta). Ícones Lucide 20px, sempre com rótulo. */
export function Menu({ temEmpresa, superadmin, aoNavegar }: Props) {
  const a = useAtual()
  const l = { onClick: aoNavegar }
  return (
    <nav className="menu" aria-label="Principal">
      {temEmpresa && (
        <>
          <Link href="/" {...a('/')} {...l}><LayoutDashboard size={20} />Painel</Link>
          <Link href="/itens/novo" {...a('/itens/novo')} {...l}><Plus size={20} />Novo vencimento</Link>
          <Link href="/acompanhamentos" {...a('/acompanhamentos')} {...l}><BellRing size={20} />Acompanhamentos</Link>
          <Link href="/clientes" {...a('/clientes')} {...l}><Users size={20} />Clientes</Link>
          <Link href="/?f=historico" {...a('/?f=historico')} {...l}><History size={20} />Histórico</Link>
          <Link href="/config" {...a('/config')} {...l}><Settings size={20} />Ajustes</Link>
        </>
      )}
      {superadmin && (
        <>
          <div className="menu-rotulo">Plataforma</div>
          <Link href="/admin" {...a('/admin')} {...l}><ShieldCheck size={20} />Admin</Link>
          <Link href="/design-system" {...a('/design-system')} {...l}><Palette size={20} />Design System</Link>
        </>
      )}
    </nav>
  )
}

/** Botão de menu (tablet/mobile) + gaveta lateral. */
export function MenuGaveta(props: Props) {
  const [aberto, setAberto] = useState(false)
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [aberto])
  return (
    <>
      <button type="button" className="btn sec icone btn-menu" aria-label="Abrir navegação" aria-expanded={aberto} onClick={() => setAberto(true)}>
        <IcoMenu size={18} />
      </button>
      {aberto && createPortal(
        <div className="gaveta-fundo" onClick={() => setAberto(false)}>
          <div className="gaveta" role="dialog" aria-label="Navegação" onClick={(e) => e.stopPropagation()}>
            <div className="gaveta-topo">
              <span>Navegação</span>
              <button type="button" className="btn ghost icone" aria-label="Fechar navegação" onClick={() => setAberto(false)}><X size={18} /></button>
            </div>
            <Menu {...props} aoNavegar={() => setAberto(false)} />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

/** Barra de abas mobile: 72px + safe-area, botão central "Novo" (FAB 56px). */
export function Abas({ superadmin }: { superadmin: boolean }) {
  const a = useAtual()
  return (
    <nav className="abas" aria-label="Navegação rápida">
      <Link href="/" {...a('/')}><LayoutDashboard size={24} />Painel</Link>
      <Link href="/clientes" {...a('/clientes')}><Users size={24} />Clientes</Link>
      <Link href="/novo" aria-label="Cadastrar vencimento ou acompanhamento"><span className="fab"><Plus size={24} /></span></Link>
      <Link href="/acompanhamentos" {...a('/acompanhamentos')}><BellRing size={24} />Retornos</Link>
      <Link href="/config" {...a('/config')}><Settings size={24} />Ajustes</Link>
    </nav>
  )
}
