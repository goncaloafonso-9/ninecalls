'use client'

import { Building2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export function ClientesEmptyAction() {
  return (
    <EmptyState
      icon={<Building2 style={{ width: '40px', height: '40px' }} />}
      title="Nenhum cliente criado ainda"
      description="Adiciona o primeiro cliente para começar."
      action={{
        label: 'Criar primeiro cliente',
        onClick: () => window.dispatchEvent(new CustomEvent('nc:open-onboarding')),
      }}
    />
  )
}
