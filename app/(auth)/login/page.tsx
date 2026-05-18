'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)

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
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/nine-call-ai-light.png"
            alt="Nine Calls"
            width={140}
            height={56}
            className="object-contain"
            priority
          />
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
            Bem-vindo de volta!
          </h1>
          <p className="text-sm text-slate-500">
            Introduz as tuas credenciais para continuar.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">

          {/* Email */}
          <input
            type="email"
            autoComplete="email"
            placeholder="Endereço de email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="nc-auth-input"
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="nc-auth-input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              aria-label={showPw ? 'Esconder password' : 'Mostrar password'}
            >
              {showPw
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />
              }
            </button>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end -mt-1">
            <Link
              href="/forgot-password"
              className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              Esqueceu a password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="nc-auth-btn"
          >
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-10 text-center text-xs text-slate-400">
          Nine Calls © {new Date().getFullYear()}
        </p>
      </div>

      <style>{`
        .nc-auth-input {
          width: 100%;
          height: 44px;
          padding: 0 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition: border-color 150ms, box-shadow 150ms;
          font-family: inherit;
        }
        .nc-auth-input::placeholder { color: #94a3b8; }
        .nc-auth-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
        .nc-auth-btn {
          width: 100%;
          height: 44px;
          border-radius: 8px;
          border: none;
          background: #2563eb;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 150ms, transform 100ms;
          font-family: inherit;
        }
        .nc-auth-btn:hover:not(:disabled) { background: #1d4ed8; }
        .nc-auth-btn:active:not(:disabled) { transform: scale(0.98); }
        .nc-auth-btn:disabled { background: #94a3b8; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
