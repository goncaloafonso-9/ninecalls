import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { subDays, startOfDay } from 'date-fns'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { ChamadasTable } from '@/components/dashboard/chamadas-table'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ periodo?: string }>
}

export default async function ChamadasPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { periodo = '30d' } = await searchParams

  // Auth check via regular client (RLS)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'client') redirect('/login')

  // Verify restaurant belongs to this client
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, nome')
    .eq('slug', slug)
    .single()

  if (!restaurant) notFound()

  const startDate = periodo === 'hoje'
    ? startOfDay(new Date())
    : periodo === '7d' ? subDays(new Date(), 7) : subDays(new Date(), 30)

  // Use admin client for view queries (views may not have RLS)
  const db = createAdminClient()
  const { data: calls } = await db
    .from('v_calls_enriched')
    .select('id, criado_em, duration_seconds, caller_phone, nome_cliente, tipo_chamada, user_sentiment, lingua_detectada, call_summary')
    .eq('restaurant_id', restaurant.id)
    .gte('criado_em', startDate.toISOString())
    .order('criado_em', { ascending: false })
    .limit(200)

  const rows = calls ?? []

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Chamadas</h1>
          <p className="text-sm text-slate-500 mt-0.5">{rows.length} chamadas no período</p>
        </div>
        <PeriodFilter active={periodo} />
      </div>

      <ChamadasTable calls={rows} />
    </div>
  )
}
