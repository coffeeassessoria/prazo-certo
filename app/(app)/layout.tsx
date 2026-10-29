import { redirect } from 'next/navigation'
import { getContexto } from '@/lib/contexto'
import { Casca } from '@/components/Casca'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContexto()
  if (ctx.trocarSenha) redirect('/trocar-senha')
  return (
    <Casca empresa={ctx.empresa?.nome} email={ctx.email} nome={ctx.nome !== ctx.email ? ctx.nome : undefined}
      temEmpresa={!!ctx.empresa?.ativo} superadmin={ctx.superadmin}>
      {children}
    </Casca>
  )
}
