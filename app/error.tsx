'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[error-boundary]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Ocorreu um erro inesperado</h1>
        <p className="text-sm text-slate-500 mb-6">
          Algo correu mal. Se o problema persistir, contacta o suporte.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 mb-4 font-mono">Ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
