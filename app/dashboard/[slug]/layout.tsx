import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function DashboardSlugLayout({ children, params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'client') {
    redirect('/login')
  }

  // Fetch all restaurants for this client (RLS filters automatically)
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, nome, slug, estado')
    .not('estado', 'eq', 'rescindido')
    .order('ordem')

  if (!restaurants || restaurants.length === 0) notFound()

  // Verify the active slug belongs to this client
  const activeRestaurant = restaurants.find(r => r.slug === slug)
  if (!activeRestaurant) {
    // Redirect to first available restaurant
    redirect(`/dashboard/${restaurants[0].slug}`)
  }

  // Fetch client info for the greeting
  const { data: clientInfo } = await supabase
    .from('clients')
    .select('nome_responsavel, nome_empresa')
    .single()

  const nomeResponsavel = clientInfo?.nome_responsavel ?? 'Utilizador'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <DashboardSidebar
        restaurants={restaurants}
        activeSlug={slug}
        nomeResponsavel={nomeResponsavel}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 shrink-0">
          <div className="flex-1">
            <p className="text-sm text-slate-500">
              Olá <span className="font-semibold text-slate-900">{nomeResponsavel}</span>
              {', '}aqui está o resumo do{' '}
              <span className="font-semibold text-slate-900">{activeRestaurant.nome}</span>
            </p>
          </div>

          {/* Restaurant Switcher */}
          {restaurants.length > 1 && (
            <div className="flex items-center gap-1.5">
              {restaurants.map(r => (
                <Link
                  key={r.slug}
                  href={`/dashboard/${r.slug}`}
                  className={
                    r.slug === slug
                      ? 'px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500 text-white'
                      : 'px-3 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors'
                  }
                >
                  {r.nome}
                </Link>
              ))}
            </div>
          )}

          <button
            onClick={undefined}
            title="Actualizar"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
