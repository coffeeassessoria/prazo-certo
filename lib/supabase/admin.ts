import 'server-only'
import { createClient } from '@supabase/supabase-js'

/** Cliente com service role: ignora RLS. Usar só no servidor e SEMPRE filtrando por empresa_id. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
