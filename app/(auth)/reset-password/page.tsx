'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('A password tem de ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As passwords não coincidem.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    const res = await fetch('/api/client/atualizar-password-enc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (!res.ok) {
      setError('Password atualizada, mas houve um erro interno. Contacte o suporte.')
      setLoading(false)
      return
    }

    setLoading(false)
    setDone(true)

    setTimeout(() => router.push('/dashboard'), 2500)
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">A verificar o link de recuperação...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-black flex-col items-center justify-center p-12 text-white">
        <div className="max-w-md text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/nine-calls-ai-dark.png"
              alt="Nine Calls"
              width={180}
              height={72}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold mb-4 leading-tight">
            Define a tua nova password
          </h1>
          <p className="text-white/50 text-lg leading-relaxed">
            Escolhe uma password segura com pelo menos 8 caracteres.
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image src="/nine-call-ai-light.png" alt="Nine Calls" width={120} height={48} className="object-contain" />
          </div>

          {done ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Password actualizada</h2>
              <p className="text-slate-500 text-sm">A redirecionar para a dashboard...</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Nova password</h2>
                <p className="text-slate-500 mt-1 text-sm">Define a tua nova password de acesso.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                {/* Nova password */}
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Nova password (mínimo 8 caracteres)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="nc-auth-input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    aria-label={showPassword ? 'Esconder password' : 'Mostrar password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Confirmar password */}
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirmar nova password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className="nc-auth-input"
                />

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="nc-auth-btn"
                >
                  {loading ? 'A guardar...' : 'Guardar nova password'}
                </button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            Nine Calls © {new Date().getFullYear()}
          </p>
        </div>
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
