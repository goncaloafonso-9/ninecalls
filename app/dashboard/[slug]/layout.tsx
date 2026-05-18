import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { DashboardLayoutShell } from '@/components/dashboard/dashboard-layout-shell'

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

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, nome, slug, estado, google_drive_folder_link')
    .not('estado', 'eq', 'rescindido')
    .order('ordem')

  if (!restaurants || restaurants.length === 0) notFound()

  const activeRestaurant = restaurants.find(r => r.slug === slug)
  if (!activeRestaurant) {
    redirect(`/dashboard/${restaurants[0].slug}`)
  }

  const { data: clientInfo } = await supabase
    .from('clients')
    .select('nome_responsavel, nome_empresa')
    .single()

  const nomeResponsavel = clientInfo?.nome_responsavel ?? ''

  return (
    <DashboardLayoutShell
      restaurants={restaurants}
      activeSlug={slug}
      nomeResponsavel={nomeResponsavel}
      driveLinkAtivo={activeRestaurant.google_drive_folder_link ?? null}
    >
      {children}
    </DashboardLayoutShell>
  )
}
