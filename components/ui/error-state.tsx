import { AlertTriangle } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Erro ao carregar dados',
  description = 'Ocorreu um erro inesperado. Tenta novamente.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className="nc-empty-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        textAlign: 'center',
        gap: '12px',
      }}
    >
      <AlertTriangle style={{ width: '40px', height: '40px', color: 'var(--red-500)' }} />
      <h3
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          margin: 0,
          maxWidth: '320px',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--gray-950)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 150ms ease',
            fontFamily: 'var(--font-geist), sans-serif',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-800)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--gray-950)' }}
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
