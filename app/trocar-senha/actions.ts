'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getContexto } from '@/lib/contexto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { qsToast } from '@/lib/toast'

export async function definirSenha(_prev: { erro?: string } | null, fd: FormData): Promise<{ erro?: string } | null> {
  const ctx = await getContexto()
  const senha = String(fd.get('senha') ?? '')
  const confirmar = String(fd.get('confirmar') ?? '')
  if (senha.length < 8) return { erro: 'A nova senha precisa ter pelo menos 8 caracteres.' }
  if (senha !== confirmar) return { erro: 'As duas senhas não são iguais. Digite de novo.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) {
    const igual = /different|same/i.test(error.message)
    return { erro: igual ? 'Escolha uma senha diferente da provisória.' : 'Não foi possível salvar a senha. Tente de novo.' }
  }
  await createAdminClient().from('perfis').update({ trocar_senha: false }).eq('user_id', ctx.userId)
  revalidatePath('/', 'layout')
  // Próximo passo: o quiz de cadastro da empresa (se já foi feito, /bem-vindo manda para o painel)
  redirect(ctx.empresa ? `/bem-vindo?${qsToast('Senha definida', 'Agora vamos configurar sua empresa.')}` : '/')
}
