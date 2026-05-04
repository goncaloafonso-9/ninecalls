'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Phone,
  Calendar,
  ShoppingBag,
  Clock,
  Users,
  Receipt,
  LogOut,
  PhoneCall,
} from 'lucide-react'
import { toast } from 'sonner'

interface Restaurant {
  id: string
  nome: string
  slug: string
  estado: string
}

interface DashboardSidebarProps {
  restaurants: Restaurant[]
  activeSlug: string
  nomeResponsavel: string
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chamadas',  label: 'Chamadas',  icon: Phone },
  { id: 'reservas',  label: 'Reservas',  icon: Calendar },
  { id: 'takeaways', label: 'Takeaways', icon: ShoppingBag },
  { id: 'ultima-hora', label: 'Última Hora', icon: Clock },
  { id: 'clientes',  label: 'Clientes',  icon: Users },
  { id: 'ciclos',    label: 'Ciclos',    icon: Receipt },
]

export function DashboardSidebar({ restaurants, activeSlug, nomeResponsavel }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Sessão terminada')
    router.push('/login')
    router.refresh()
  }

  function getHref(navId: string) {
    if (navId === 'dashboard') return `/dashboard/${activeSlug}`
    return `/dashboard/${activeSlug}/${navId}`
  }

  function isActive(navId: string) {
    const href = getHref(navId)
    if (navId === 'dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="flex flex-col w-[220px] min-h-screen bg-white border-r border-slate-200 px-3 py-4 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 mb-6">
        <div className="w-7 h-7 bg-emerald-500 rounded-md flex items-center justify-center shrink-0">
          <PhoneCall className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-semibold text-slate-900 text-sm tracking-tight">Nine Calls</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = isActive(id)
          return (
            <Link
              key={id}
              href={getHref(id)}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-emerald-600' : 'text-slate-400')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="space-y-0.5 pt-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}
