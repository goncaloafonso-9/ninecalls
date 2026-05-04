'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ClientProfile } from '@/types'
import { Eye, EyeOff, AlertTriangle } from 'lucide-react'

interface ClientFormProps {
  client: ClientProfile
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

function TextInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
      {...props}
    />
  )
}

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter()

  // Main data form
  const [form, setForm] = useState({
    nome_empresa: client.nome_empresa,
    nif: client.nif,
    morada: client.morada,
    email_faturacao: client.email_faturacao,
    telefone: client.telefone ?? '',
    google_drive_folder_id: client.google_drive_folder_id ?? '',
    docusign_envelope_id: client.docusign_envelope_id ?? '',
    notas_internas: client.notas_internas ?? '',
  })
  const [savingMain, setSavingMain] = useState(false)
  const [savedMain, setSavedMain] = useState(false)

  // Email change
  const [newEmail, setNewEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Reveal current password
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null)
  const [revealing, setRevealing] = useState(false)

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setSavedMain(false)
  }

  async function post(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Erro')
    return json
  }

  async function handleSaveMain() {
    setSavingMain(true)
    try {
      await post('/api/admin/actualizar-cliente', { clientId: client.id, ...form })
      setSavedMain(true)
      router.refresh()
    } catch (err) { alert((err as Error).message) }
    finally { setSavingMain(false) }
  }

  async function handleUpdateEmail() {
    if (!newEmail) return
    if (!confirm(`Actualizar email de login para "${newEmail}"? Esta acção actualiza auth.users E clients.email_contacto.`)) return
    setSavingEmail(true)
    try {
      await post('/api/admin/change-client-email', { clientId: client.id, newEmail })
      setNewEmail('')
      router.refresh()
      alert('Email actualizado com sucesso.')
    } catch (err) { alert((err as Error).message) }
    finally { setSavingEmail(false) }
  }

  async function handleUpdatePassword() {
    if (!newPassword) return
    setSavingPassword(true)
    try {
      await post('/api/admin/change-client-password', { clientId: client.id, newPassword })
      setNewPassword('')
      router.refresh()
      alert('Password actualizada com sucesso.')
    } catch (err) { alert((err as Error).message) }
    finally { setSavingPassword(false) }
  }

  async function handleRevealPassword() {
    setRevealing(true)
    try {
      const json = await post('/api/admin/change-client-password', { clientId: client.id, action: 'reveal' })
      setRevealedPassword(json.password)
    } catch (err) { alert((err as Error).message) }
    finally { setRevealing(false) }
  }

  return (
    <div className="space-y-6">
      {/* Main data */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-slate-900">Dados do Cliente</h3>
          <button
            onClick={handleSaveMain}
            disabled={savingMain}
            className="text-sm px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {savingMain ? 'A guardar...' : savedMain ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome da Empresa *">
            <TextInput value={form.nome_empresa} onChange={e => setField('nome_empresa', e.target.value)} />
          </Field>
          <Field label="NIF *">
            <TextInput value={form.nif} onChange={e => setField('nif', e.target.value)} />
          </Field>
          <Field label="Morada" hint="Para faturação">
            <TextInput value={form.morada} onChange={e => setField('morada', e.target.value)} />
          </Field>
          <Field label="Email de Faturação">
            <TextInput type="email" value={form.email_faturacao} onChange={e => setField('email_faturacao', e.target.value)} />
          </Field>
          <Field label="Telefone">
            <TextInput value={form.telefone} onChange={e => setField('telefone', e.target.value)} placeholder="+351..." />
          </Field>
          <Field label="Google Drive Folder ID">
            <TextInput value={form.google_drive_folder_id} onChange={e => setField('google_drive_folder_id', e.target.value)} />
          </Field>
          <Field label="DocuSign Envelope ID">
            <TextInput value={form.docusign_envelope_id} onChange={e => setField('docusign_envelope_id', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notas Internas">
              <textarea
                value={form.notas_internas}
                onChange={e => setField('notas_internas', e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                placeholder="Notas internas sobre este cliente..."
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Email de login */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Email de Login</h3>
        <p className="text-xs text-slate-400 mb-4">Email actual: <span className="font-mono text-slate-600">{client.email_contacto}</span></p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600">Actualiza em auth.users E clients.email_contacto atomicamente</span>
            </div>
            <TextInput
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="novo@email.com"
            />
          </div>
          <button
            onClick={handleUpdateEmail}
            disabled={!newEmail || savingEmail}
            className="self-end text-sm px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {savingEmail ? 'A actualizar...' : 'Actualizar Email'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Password</h3>
          {client.password_alterada_cliente && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
              <AlertTriangle className="w-3 h-3" />
              Password alterada pelo cliente via self-service — valor guardado pode estar desactualizado
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <TextInput
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nova password..."
                className="pr-10"
              />
              <button
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleUpdatePassword}
              disabled={!newPassword || savingPassword}
              className="text-sm px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {savingPassword ? 'A actualizar...' : 'Actualizar Password'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRevealPassword}
              disabled={revealing}
              className="text-sm px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {revealing ? 'A desencriptar...' : 'Ver Password Actual (Encriptada BD)'}
            </button>
            {revealedPassword && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-sm font-mono text-slate-900">{revealedPassword}</span>
                <button onClick={() => setRevealedPassword(null)} className="text-slate-400 hover:text-slate-600 text-xs">×</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
