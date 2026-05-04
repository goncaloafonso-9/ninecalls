import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** Verifies the caller is an authenticated admin. Returns { error } or { user }. */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user || user.app_metadata?.role !== 'admin') {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }),
    }
  }

  return { user, errorResponse: null }
}
