import { getContexto } from '@/lib/contexto'
import { Casca } from '@/components/Casca'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContexto()
  return (
    <Casca empresa={ctx.empresa?.nome} email={ctx.email} temEmpresa={!!ctx.empresa?.ativo} superadmin={ctx.superadmin}>
      {children}
    </Casca>
  )
}
