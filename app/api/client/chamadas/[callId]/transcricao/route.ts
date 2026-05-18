import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  const { callId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'client') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // RLS policy rls_calls_select garante que o cliente só lê as chamadas das suas restaurantes
  const { data, error } = await supabase
    .from('calls')
    .select('transcript')
    .eq('id', callId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Chamada não encontrada' }, { status: 404 })
  }

  return NextResponse.json({ transcript: data.transcript ?? null })
}
