import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/admin/onboarding-wizard'

export default async function NovoClientePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Novo Cliente</h1>
        <p className="text-sm text-slate-500 mt-0.5">Cria um novo cliente e os seus restaurantes</p>
      </div>
      <OnboardingWizard />
    </div>
  )
}
