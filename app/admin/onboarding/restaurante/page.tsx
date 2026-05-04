import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddRestauranteWizard } from '@/components/admin/add-restaurante-wizard'
import type { ClientProfile } from '@/types'

export default async function AddRestaurantePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('clients')
    .select('id, nome_empresa')
    .order('nome_empresa', { ascending: true })

  const clients = (data ?? []) as Pick<ClientProfile, 'id' | 'nome_empresa'>[]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Adicionar Restaurante</h1>
        <p className="text-sm text-slate-500 mt-0.5">Adiciona um restaurante a um cliente existente</p>
      </div>
      <AddRestauranteWizard clients={clients} />
    </div>
  )
}
