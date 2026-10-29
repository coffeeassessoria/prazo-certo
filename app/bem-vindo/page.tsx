import { exigirEmpresa } from '@/lib/contexto'
import { redirect } from 'next/navigation'
import { Quiz } from './Quiz'
import { Suspense } from 'react'
import { ToastDaUrl } from '@/components/ui/Toast'

export const dynamic = 'force-dynamic'

export default async function BemVindo({ searchParams }: { searchParams: Promise<{ refazer?: string }> }) {
  const { refazer } = await searchParams
  const ctx = await exigirEmpresa({ noOnboarding: true })
  if (ctx.empresa.onboarding_concluido && !refazer) redirect('/')
  const e = ctx.empresa
  return (
    <>
    <Suspense><ToastDaUrl /></Suspense>
    <Quiz
      inicial={{
        nome: e.nome,
        documento: e.documento ?? '',
        cidade: e.cidade ?? '',
        responsavel: e.responsavel ?? ctx.nome ?? '',
        segmento: e.segmento ?? '',
        modelos: e.modelos ?? [],
        antecedencia: e.antecedencia_padrao ?? 30,
        emails: e.emails_lembrete?.length ? e.emails_lembrete : [ctx.email],
        whatsapp: e.whatsapp_numeros?.[0] ?? '',
        clientes: [],
      }}
      primeiroNome={(ctx.nome || '').split(/[\s@]/)[0]}
      podeConcluir={ctx.papel === 'admin' || ctx.superadmin}
    />
    </>
  )
}
