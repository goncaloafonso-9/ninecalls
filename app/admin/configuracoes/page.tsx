import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExternalLink, CheckCircle2, XCircle } from 'lucide-react'
import { ConfiguracoesAccount } from '@/components/admin/configuracoes-account'

const INTEGRATIONS = [
  { label: 'Supabase',     envKey: 'NEXT_PUBLIC_SUPABASE_URL' },
  { label: 'Stripe',       envKey: 'STRIPE_SECRET_KEY' },
  { label: 'Telnyx',       envKey: 'TELNYX_API_KEY' },
  { label: 'Slack',        envKey: 'SLACK_BOT_TOKEN' },
  { label: 'Resend',       envKey: 'RESEND_API_KEY' },
  { label: 'n8n',          envKey: 'N8N_WEBHOOK_BASE_URL' },
  { label: 'Google Drive', envKey: 'GOOGLE_SERVICE_ACCOUNT_EMAIL' },
]

const LINKS = [
  { label: 'Supabase Dashboard',  href: 'https://app.supabase.com' },
  { label: 'Stripe Dashboard',    href: 'https://dashboard.stripe.com' },
  { label: 'Vercel',              href: 'https://vercel.com/dashboard' },
  { label: 'Telnyx Portal',       href: 'https://portal.telnyx.com' },
  { label: 'n8n',                 href: process.env.N8N_WEBHOOK_BASE_URL?.split('/webhook')[0] ?? 'https://n8n.io' },
  { label: 'Slack',               href: 'https://app.slack.com' },
]

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const integrations = INTEGRATIONS.map(i => ({
    label: i.label,
    configured: !!process.env[i.envKey],
  }))

  const userInitials = user.email
    ? user.email.split('@')[0].slice(0, 2).toUpperCase()
    : 'GC'

  return (
    <div
      style={{
        padding: 'var(--page-padding-y) var(--page-padding-x)',
        maxWidth: '720px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}
    >
      {/* ── Header ── */}
      <div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.025em',
            margin: 0,
          }}
        >
          Configurações
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Conta e estado das integrações
        </p>
      </div>

      {/* ── Perfil ── */}
      <section
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden',
        }}
        className="animate-in"
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Perfil
          </h2>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            {/* Avatar */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--gray-900)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {userInitials}
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {(user.user_metadata?.full_name as string) || 'Admin'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {user.email}
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                Email
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>
                {user.email}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                Função
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>
                Administrador
              </p>
            </div>
          </div>

          <ConfiguracoesAccount initialFullName={(user.user_metadata?.full_name as string) ?? ''} />
        </div>
      </section>

      {/* ── Integrações ── */}
      <section
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden',
        }}
        className="animate-in"
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Integrações
          </h2>
        </div>
        <div>
          {integrations.map((i, idx) => (
            <div
              key={i.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 24px',
                borderBottom: idx < integrations.length - 1 ? '1px solid var(--surface-border)' : 'none',
              }}
            >
              <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{i.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {i.configured
                  ? <CheckCircle2 style={{ width: '14px', height: '14px', color: 'var(--green-600)' }} />
                  : <XCircle style={{ width: '14px', height: '14px', color: 'var(--red-500)' }} />
                }
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: i.configured ? 'var(--green-700)' : 'var(--red-600)',
                  }}
                >
                  {i.configured ? 'Configurado' : 'Em falta'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Links Rápidos ── */}
      <section
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden',
        }}
        className="animate-in"
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Links Rápidos
          </h2>
        </div>
        <div>
          {LINKS.map((l, idx) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="nc-hover-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 24px',
                borderBottom: idx < LINKS.length - 1 ? '1px solid var(--surface-border)' : 'none',
                textDecoration: 'none',
                color: 'var(--text-secondary)',
                fontSize: '14px',
              }}
            >
              <ExternalLink style={{ width: '14px', height: '14px', color: 'var(--text-muted)', flexShrink: 0 }} />
              {l.label}
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
