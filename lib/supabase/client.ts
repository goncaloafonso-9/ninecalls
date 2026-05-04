import { createBrowserClient } from '@supabase/ssr'

// Browser client — uses anon key + user JWT → RLS applied
// Use in Client Components and dashboard pages
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
