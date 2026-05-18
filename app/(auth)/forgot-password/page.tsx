'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      setError('Ocorreu um erro. Tenta novamente.')
      return
    }

    setSent(true)
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
            Recupera o acesso à tua conta
          </h1>
          <p className="text-white/50 text-lg leading-relaxed">
            Envia-te um link seguro para definires uma nova password.
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

          {sent ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Email enviado</h2>
              <p className="text-slate-500 text-sm mb-6">
                Se existe uma conta com o email{' '}
                <span className="font-medium text-slate-700">{email}</span>,
                receberás um link para repor a password nos próximos minutos.
              </p>
              <p className="text-xs text-slate-400 mb-6">
                Não recebeste? Verifica a pasta de spam ou tenta novamente.
              </p>
              <Link
                href="/login"
                className="text-sm text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Esqueceu a password?</h2>
                <p className="text-slate-500 mt-1 text-sm">Introduz o teu email e enviamos um link de recuperação.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Endereço de email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="nc-auth-input"
                />

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="nc-auth-btn"
                >
                  {loading ? 'A enviar...' : 'Enviar link de recuperação'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar ao login
                </Link>
              </div>
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
