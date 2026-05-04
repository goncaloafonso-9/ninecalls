import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ClientForm } from '@/components/admin/client-form'
import { RestaurantStatusBadge } from '@/components/admin/restaurant-status-badge'
import { formatDate, formatEuro } from '@/lib/utils'
import type { ClientProfile, Restaurant } from '@/types'
import { ChevronLeft, Store, CreditCard } from 'lucide-react'

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()

  const [clientRes, restaurantsRes] = await Promise.all([
    db.from('clients').select('*').eq('id', id).single(),
    db.from('restaurants').select('*').eq('client_id', id).order('ordem', { ascending: true }),
  ])

  if (!clientRes.data) notFound()

  const client = clientRes.data as ClientProfile
  const restaurants = (restaurantsRes.data ?? []) as Restaurant[]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/clientes" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{client.nome_empresa}</h1>
          <p className="text-sm text-slate-400 mt-0.5">NIF {client.nif} · Cliente desde {formatDate(client.criado_em)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — forms */}
        <div className="lg:col-span-2">
          <ClientForm client={client} />
        </div>

        {/* Right — sidebar */}
        <div className="space-y-6">
          {/* Stripe */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Stripe</h3>
            </div>
            {client.stripe_customer_id ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Customer ID</p>
                <p className="text-xs font-mono text-slate-700 break-all">{client.stripe_customer_id}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-green-700">Stripe configurado</span>
                </div>
                <button className="w-full mt-2 text-xs bg-slate-900 text-white px-3 py-2 rounded-md hover:bg-slate-800 transition-colors">
                  Gerar Link Portal Stripe
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="text-xs text-slate-500">Sem customer Stripe</span>
                </div>
                <button className="w-full text-xs border border-slate-200 text-slate-700 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors">
                  Criar Customer Stripe
                </button>
              </div>
            )}
          </div>

          {/* Restaurantes */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Restaurantes</h3>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{restaurants.length}</span>
              </div>
              <Link
                href="/admin/onboarding/restaurante"
                className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                + Adicionar
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {restaurants.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Sem restaurantes
                </div>
              ) : (
                restaurants.map(r => (
                  <Link
                    key={r.id}
                    href={`/admin/restaurantes/${r.slug}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{r.nome}</p>
                      <p className="text-xs text-slate-400 mt-0.5">/{r.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RestaurantStatusBadge estado={r.estado} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Quick info */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Informação</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Email login</span>
                <span className="text-slate-700 text-xs truncate ml-2">{client.email_contacto}</span>
              </div>
              {client.docusign_envelope_id && (
                <div className="flex justify-between">
                  <span className="text-slate-500">DocuSign</span>
                  <span className="text-xs font-mono text-slate-700 truncate ml-2">{client.docusign_envelope_id}</span>
                </div>
              )}
              {client.google_drive_folder_id && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Drive</span>
                  <span className="text-xs font-mono text-slate-700 truncate ml-2">{client.google_drive_folder_id}</span>
                </div>
              )}
              {client.password_alterada_cliente && (
                <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                  ⚠ Password alterada pelo cliente via self-service
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
