'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '40px',
  padding: '0 12px',
  borderRadius: '8px',
  border: '1px solid var(--surface-border)',
  background: 'var(--surface-1)',
  fontSize: '14px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-geist), sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
}

interface Props {
  initialFullName?: string
}

export function ConfiguracoesAccount({ initialFullName }: Props) {
  const [mode, setMode] = useState<'idle' | 'form'>('idle')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [nameMode, setNameMode] = useState<'idle' | 'form'>('idle')
  const [fullName, setFullName] = useState(initialFullName ?? '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleNameChange() {
    if (!fullName.trim()) {
      setNameMsg({ type: 'err', text: 'O nome não pode estar vazio' })
      return
    }
    setNameLoading(true)
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
    setNameLoading(false)
    if (error) {
      setNameMsg({ type: 'err', text: error.message })
    } else {
      setNameMsg({ type: 'ok', text: 'Nome actualizado' })
      setNameMode('idle')
    }
  }

  async function handleChange() {
    if (password !== confirm) {
      setMsg({ type: 'err', text: 'As passwords não coincidem' })
      return
    }
    if (password.length < 8) {
      setMsg({ type: 'err', text: 'Mínimo 8 caracteres' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setMsg({ type: 'err', text: error.message })
    } else {
      setMsg({ type: 'ok', text: 'Password alterada com sucesso' })
      setMode('idle')
      setPassword('')
      setConfirm('')
    }
  }

  const nameSection = nameMode === 'idle' ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 4px' }}>
            Nome
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>
            {fullName || <span style={{ color: 'var(--text-muted)' }}>—</span>}
          </p>
        </div>
        <button
          onClick={() => { setNameMode('form'); setNameMsg(null) }}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid var(--surface-border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-geist), sans-serif',
            transition: 'background 150ms ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          Editar
        </button>
      </div>
      {nameMsg?.type === 'ok' && (
        <p style={{ fontSize: '12px', color: 'var(--green-600)', margin: 0 }}>{nameMsg.text}</p>
      )}
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '360px', marginBottom: '20px' }}>
      <div>
        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
          Nome
        </label>
        <input
          type="text"
          placeholder="O teu nome"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          style={inputStyle}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--blue-500)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--surface-border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>
      {nameMsg && (
        <p style={{ fontSize: '12px', margin: 0, color: nameMsg.type === 'ok' ? 'var(--green-600)' : 'var(--red-600)' }}>
          {nameMsg.text}
        </p>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleNameChange}
          disabled={nameLoading}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--gray-950)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: nameLoading ? 'not-allowed' : 'pointer',
            opacity: nameLoading ? 0.7 : 1,
            fontFamily: 'var(--font-geist), sans-serif',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => { if (!nameLoading) e.currentTarget.style.background = 'var(--gray-800)' }}
          onMouseLeave={e => { if (!nameLoading) e.currentTarget.style.background = 'var(--gray-950)' }}
        >
          {nameLoading ? 'A guardar...' : 'Guardar'}
        </button>
        <button
          onClick={() => { setNameMode('idle'); setNameMsg(null); setFullName(initialFullName ?? '') }}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid var(--surface-border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-geist), sans-serif',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )

  if (mode === 'idle') {
    return (
      <div>
        {nameSection}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {msg?.type === 'ok' && (
            <p style={{ fontSize: '12px', color: 'var(--green-600)', margin: 0 }}>{msg.text}</p>
          )}
          <button
            onClick={() => { setMode('form'); setMsg(null) }}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--surface-border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-geist), sans-serif',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            Alterar password
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
    {nameSection}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '360px' }}>
      <div>
        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
          Nova password
        </label>
        <input
          type="password"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--blue-500)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--surface-border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>
      <div>
        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
          Confirmar password
        </label>
        <input
          type="password"
          placeholder="Repetir password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          style={inputStyle}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--blue-500)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--surface-border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>

      {msg && (
        <p
          style={{
            fontSize: '12px',
            margin: 0,
            color: msg.type === 'ok' ? 'var(--green-600)' : 'var(--red-600)',
          }}
        >
          {msg.text}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleChange}
          disabled={loading}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--gray-950)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontFamily: 'var(--font-geist), sans-serif',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--gray-800)' }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--gray-950)' }}
        >
          {loading ? 'A guardar...' : 'Confirmar'}
        </button>
        <button
          onClick={() => { setMode('idle'); setMsg(null); setPassword(''); setConfirm('') }}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid var(--surface-border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-geist), sans-serif',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          Cancelar
        </button>
      </div>
    </div>
    </div>
  )
}
