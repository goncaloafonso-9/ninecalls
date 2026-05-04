import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardRedirectPage() {
  const supabase = await createClient()

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('slug, estado')
    .not('estado', 'eq', 'rescindido')
    .order('ordem')
    .limit(1)

  if (!restaurants || restaurants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500 text-sm">Sem restaurantes activos.</p>
          <p className="text-slate-400 text-xs mt-1">Contacte o administrador.</p>
        </div>
      </div>
    )
  }

  redirect(`/dashboard/${restaurants[0].slug}`)
}
