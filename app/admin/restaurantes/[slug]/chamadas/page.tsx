import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Phone } from 'lucide-react'

export const dynamic = 'force-dynamic'
import { EmptyState } from '@/components/ui/empty-state'
import { ChamadasAdminTable } from '@/components/admin/chamadas-admin-table'

export default async function ChamadasPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()
  const { data: rest } = await db.from('restaurants').select('id').eq('slug', slug).single()
  if (!rest) notFound()

  const { data } = await db
    .from('v_calls_enriched')
    .select('id, criado_em, duration_seconds, caller_phone, nome_cliente, tipo_chamada, user_sentiment, lingua_detectada, call_summary, appointment_booked, takeaway_order_placed, ultima_hora_solicitada')
    .eq('restaurant_id', rest.id)
    .order('criado_em', { ascending: false })
    .limit(100)

  const calls = data ?? []

  return (
    <div style={{ padding: 'var(--page-padding-y) var(--page-padding-x)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
        {calls.length} chamadas (últimas 100)
      </p>

      <div
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {calls.length === 0 ? (
          <EmptyState
            icon={<Phone style={{ width: '40px', height: '40px' }} />}
            title="Sem chamadas registadas"
            description="As chamadas aparecem aqui à medida que o agente atende."
          />
        ) : (
          <ChamadasAdminTable calls={calls as Record<string, unknown>[]} />
        )}
      </div>
    </div>
  )
}
