import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { RestaurantStatusBadge } from '@/components/admin/restaurant-status-badge'
import { RestaurantTabNav } from '@/components/admin/restaurant-tab-nav'
import { ChevronLeft } from 'lucide-react'
import type { Restaurant, ClientProfile } from '@/types'

export default async function RestaurantSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('restaurants')
    .select('*, clients(id, nome_empresa)')
    .eq('slug', slug)
    .single()

  if (!data) notFound()

  const restaurant = data as Restaurant & { clients: Pick<ClientProfile, 'id' | 'nome_empresa'> }

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <Link
            href="/admin/restaurantes"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">{restaurant.nome}</h1>
          <RestaurantStatusBadge estado={restaurant.estado} />
        </div>
        <p className="text-xs text-slate-400 ml-7">
          <Link
            href={`/admin/clientes/${restaurant.clients.id}`}
            className="hover:text-slate-600 transition-colors"
          >
            {restaurant.clients.nome_empresa}
          </Link>
          {' '}· /{restaurant.slug}
        </p>
      </div>

      {/* Tab navigation */}
      <RestaurantTabNav slug={slug} />

      {/* Tab content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
