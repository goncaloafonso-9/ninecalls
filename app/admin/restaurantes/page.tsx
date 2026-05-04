import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RestaurantStatusBadge } from '@/components/admin/restaurant-status-badge'
import { formatDate } from '@/lib/utils'
import type { Restaurant } from '@/types'
import { Store, ChevronRight } from 'lucide-react'

export default async function RestaurantesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('restaurants')
    .select('*, clients(nome_empresa)')
    .order('estado', { ascending: true })
    .order('nome', { ascending: true })

  const restaurants = data ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Restaurantes</h1>
          <p className="text-sm text-slate-500 mt-0.5">{restaurants.length} restaurantes</p>
        </div>
        <Link
          href="/admin/onboarding/restaurante"
          className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          + Novo Restaurante
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {restaurants.length === 0 ? (
          <div className="p-12 text-center">
            <Store className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Nenhum restaurante criado ainda</p>
          </div>
        ) : (
          restaurants.map((r: Restaurant & { clients: { nome_empresa: string } }) => (
            <Link
              key={r.id}
              href={`/admin/restaurantes/${r.slug}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.nome}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.clients?.nome_empresa} · /{r.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RestaurantStatusBadge estado={r.estado} />
                <span className="text-xs text-slate-400 hidden sm:block">{formatDate(r.criado_em)}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
