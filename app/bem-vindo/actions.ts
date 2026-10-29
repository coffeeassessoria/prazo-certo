'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { exigirEmpresa } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizarTelefone } from '@/lib/telefone'
import type { Modelo } from '@/lib/modelos'

export type DadosOnboarding = {
  nome: string
  documento: string
  cidade: string
  responsavel: string
  segmento: string
  modelos: Modelo[]
  antecedencia: number
  emails: string[]
  whatsapp: string
  clientes: string[]
}

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

export async function concluirOnboarding(d: DadosOnboarding): Promise<{ erro?: string }> {
  const ctx = await exigirEmpresa({ noOnboarding: true })
  if (ctx.papel !== 'admin' && !ctx.superadmin) return { erro: 'Só o administrador da empresa pode concluir a configuração.' }
  if (!d.nome.trim()) return { erro: 'Informe o nome da empresa.' }
  const emails = [...new Set(d.emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
  if (!emails.length) return { erro: 'Informe pelo menos um e-mail para receber os lembretes.' }
  const invalido = emails.find((e) => !emailValido(e))
  if (invalido) return { erro: `O e-mail "${invalido}" não parece válido.` }

  const whats = normalizarTelefone(d.whatsapp)
  const numeros = new Set(ctx.empresa.whatsapp_numeros)
  if (whats.length >= 12) numeros.add(whats)

  // empresas não tem policy de update para usuários: grava pelo servidor, na empresa do próprio usuário
  const { error } = await createAdminClient()
    .from('empresas')
    .update({
      nome: d.nome.trim(),
      documento: d.documento.trim() || null,
      cidade: d.cidade.trim() || null,
      responsavel: d.responsavel.trim() || null,
      segmento: d.segmento || 'outro',
      modelos: d.modelos.slice(0, 40),
      antecedencia_padrao: Math.min(Math.max(Number(d.antecedencia) || 30, 0), 365),
      emails_lembrete: emails,
      whatsapp_numeros: [...numeros],
      lembrete_email_ativo: true,
      onboarding_concluido: true,
    })
    .eq('id', ctx.empresa.id)
  if (error) return { erro: error.message }

  const nomes = [...new Set(d.clientes.map((c) => c.trim()).filter(Boolean))].slice(0, 50)
  if (nomes.length) {
    const supabase = await createClient()
    await supabase.from('clientes').insert(nomes.map((nome) => ({ empresa_id: ctx.empresa.id, nome })))
  }

  revalidatePath('/', 'layout')
  redirect('/itens/novo?primeiro=1')
}
