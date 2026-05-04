'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Phone } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('Credenciais inválidas', { description: error.message })
      setLoading(false)
      return
    }

    const role = data.user?.app_metadata?.role
    router.push(role === 'admin' ? '/admin/dashboard' : '/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">Nine Calls</span>
          </div>
          <h1 className="text-3xl font-bold mb-4 leading-tight">
            Atendimento inteligente para restaurantes
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Reservas, takeaways e pedidos de última hora. 24 horas por dia, 7 dias por semana.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-slate-500 text-sm mt-1">Disponibilidade</div>
            </div>
            <div>
              <div className="text-2xl font-bold">PT+EN</div>
              <div className="text-slate-500 text-sm mt-1">Idiomas</div>
            </div>
            <div>
              <div className="text-2xl font-bold">0€</div>
              <div className="text-slate-500 text-sm mt-1">Sem resultado</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900">Nine Calls</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Iniciar sessão</h2>
            <p className="text-slate-500 mt-1 text-sm">Aceda à sua conta para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="goncaloafonso@ninecallsai.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-10 bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Password
                </Label>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  onClick={() => toast.info('Contacte o administrador para repor a password')}
                >
                  Esqueceu a password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="h-10 bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 placeholder:text-slate-300"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
            >
              {loading ? 'A entrar...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Nine Calls © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
