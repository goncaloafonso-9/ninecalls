import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { ClientProfile } from '@/types'
import { Building2, ChevronRight } from 'lucide-react'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('clients')
    .select('*, restaurants(id)')
    .order('criado_em', { ascending: false })

  const clients = data ?? []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Clientes</h1>
        <p className="text-sm text-slate-500 mt-0.5">{clients.length} clientes</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {clients.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Nenhum cliente criado ainda</p>
            <Link href="/admin/onboarding/novo" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700">
              Criar primeiro cliente →
            </Link>
          </div>
        ) : (
          clients.map((client: ClientProfile & { restaurants: { id: string }[] }) => (
            <Link
              key={client.id}
              href={`/admin/clientes/${client.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{client.nome_empresa}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {client.email_contacto} · NIF {client.nif}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-500">
                    {client.restaurants?.length ?? 0} restaurante{(client.restaurants?.length ?? 0) !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(client.criado_em)}</p>
                </div>
                {client.stripe_customer_id ? (
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">Stripe ✓</span>
                ) : (
                  <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">Sem Stripe</span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
