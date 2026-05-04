'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Euro,
  ShieldCheck,
  Users,
  Store,
  Plus,
  Settings,
  LogOut,
  Phone,
} from 'lucide-react'
import { toast } from 'sonner'

const navItems = [
  { href: '/admin/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/admin/financeiro',   label: 'Financeiro',   icon: Euro },
  { href: '/admin/garantias',    label: 'Garantias',    icon: ShieldCheck },
  { href: '/admin/clientes',     label: 'Clientes',     icon: Users },
  { href: '/admin/restaurantes', label: 'Restaurantes', icon: Store },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Sessão terminada')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-[220px] min-h-screen bg-white border-r border-slate-200 px-3 py-4 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 mb-6">
        <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center shrink-0">
          <Phone className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-semibold text-slate-900 text-sm tracking-tight">Nine Calls</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-slate-700' : 'text-slate-400')} />
              {label}
            </Link>
          )
        })}

        {/* Divider + Quick action */}
        <div className="pt-3 pb-1">
          <div className="h-px bg-slate-100 mb-3" />
          <Link
            href="/admin/onboarding/novo"
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors',
              pathname.startsWith('/admin/onboarding')
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <Plus className="w-4 h-4 shrink-0 text-slate-400" />
            Novo Cliente
          </Link>
        </div>
      </nav>

      {/* Bottom */}
      <div className="space-y-0.5 pt-3 border-t border-slate-100">
        <Link
          href="/admin/configuracoes"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <Settings className="w-4 h-4 shrink-0 text-slate-400" />
          Configurações
        </Link>
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
