import { createClient } from '@supabase/supabase-js'

// Admin client — uses service_role key → bypasses RLS completely
// ONLY use in:
//   - /api/admin/* routes
//   - /api/confirm/* routes (public confirmation pages)
//   - /api/internal/* routes (called by n8n)
//   - /api/webhooks/* routes
// NEVER use in Client Components or dashboard pages
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
