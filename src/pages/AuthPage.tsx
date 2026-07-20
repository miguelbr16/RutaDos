import { useState } from 'react'
import { useAuthStore } from '../authStore'
import { useAppStore } from '../store'
import { isSupabaseConfigured } from '../lib/supabase'

export function AuthPage() {
  const setView = useAppStore((s) => s.setView)
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const authError = useAuthStore((s) => s.authError)
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  if (!isSupabaseConfigured) {
    return (
      <div className="page narrow">
        <button type="button" className="btn ghost sm back" onClick={() => setView({ name: 'home' })}>
          ← Inicio
        </button>
        <h1>Cuenta pareja</h1>
        <p className="muted">
          Para sincronizar entre dos móviles, configura Supabase gratis. Copia{' '}
          <code>.env.example</code> a <code>.env</code> con tu URL y anon key, ejecuta el SQL de{' '}
          <code>supabase/migrations/001_init.sql</code> y reinicia la app.
        </p>
        <p className="muted">
          Mientras tanto podéis usar Exportar / Importar JSON en Inicio (también $0).
        </p>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'in') await signIn(email, password)
      else await signUp(email, password, name || email.split('@')[0])
      setView({ name: 'settings' })
    } catch {
      // error in store
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page narrow">
      <button type="button" className="btn ghost sm back" onClick={() => setView({ name: 'home' })}>
        ← Inicio
      </button>
      <p className="brand small">RutaDos</p>
      <h1>{mode === 'in' ? 'Entrar' : 'Crear cuenta'}</h1>
      <p className="muted">Misma cuenta/espacio para los dos vía código de pareja.</p>

      <form className="panel" onSubmit={(e) => void submit(e)}>
        {mode === 'up' && (
          <label className="field">
            <span>Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          />
        </label>
        {authError && <p className="error">{authError}</p>}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? '…' : mode === 'in' ? 'Entrar' : 'Registrarme'}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setMode((m) => (m === 'in' ? 'up' : 'in'))}
        >
          {mode === 'in' ? 'Crear cuenta nueva' : 'Ya tengo cuenta'}
        </button>
      </form>
    </div>
  )
}
