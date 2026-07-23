import { useState } from 'react'
import { useAuthStore } from '../authStore'
import { useAppStore } from '../store'
import { DataLicensesSection } from '../components/DataLicensesSection'
import { isSupabaseConfigured } from '../lib/supabase'

export function SettingsPage() {
  const setView = useAppStore((s) => s.setView)
  const user = useAuthStore((s) => s.user)
  const coupleId = useAuthStore((s) => s.coupleId)
  const inviteCode = useAuthStore((s) => s.inviteCode)
  const displayName = useAuthStore((s) => s.displayName)
  const syncing = useAuthStore((s) => s.syncing)
  const authError = useAuthStore((s) => s.authError)
  const setupCouple = useAuthStore((s) => s.setupCouple)
  const joinWithCode = useAuthStore((s) => s.joinWithCode)
  const syncFromCloud = useAuthStore((s) => s.syncFromCloud)
  const signOut = useAuthStore((s) => s.signOut)

  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="page narrow ui-settings-page ui-page-tabbed">
      <button type="button" className="btn ghost sm back" onClick={() => setView({ name: 'trips' })}>
        ← Inicio
      </button>
      <p className="brand small">RutaDos</p>
      <h1>Ajustes</h1>

      {!isSupabaseConfigured && (
        <p className="muted">
          Supabase no está configurado. Usa Exportar/Importar o añade las variables de{' '}
          <code>.env.example</code>.
        </p>
      )}

      <section className="section">
        <h2>Pareja y sync</h2>

      {isSupabaseConfigured && !user && (
        <div className="panel">
          <p>Inicia sesión para sincronizar viajes entre los dos móviles.</p>
          <button type="button" className="btn primary" onClick={() => setView({ name: 'auth' })}>
            Entrar / registrarse
          </button>
        </div>
      )}

      {user && (
        <div className="panel">
          <p>
            <strong>{displayName || user.email}</strong>
          </p>
          <p className="muted">{user.email}</p>

          {!coupleId ? (
            <>
              <p className="muted">Crea el espacio pareja o únete con el código del otro.</p>
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  void setupCouple(displayName || undefined)
                    .catch(() => undefined)
                    .finally(() => setBusy(false))
                }}
              >
                Crear espacio pareja
              </button>
              <label className="field">
                <span>O pegar código de invitación</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                />
              </label>
              <button
                type="button"
                className="btn ghost"
                disabled={busy || code.trim().length < 4}
                onClick={() => {
                  setBusy(true)
                  void joinWithCode(code.trim(), displayName || undefined)
                    .catch(() => undefined)
                    .finally(() => setBusy(false))
                }}
              >
                Unirme con código
              </button>
            </>
          ) : (
            <>
              <p>
                Código para tu pareja:{' '}
                <strong className="invite">{inviteCode ?? '…'}</strong>
              </p>
              <p className="muted">Que se registre e introduzca este código en Ajustes.</p>
              <button
                type="button"
                className="btn ghost"
                disabled={syncing}
                onClick={() => void syncFromCloud()}
              >
                {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
              </button>
            </>
          )}

          {authError && <p className="error">{authError}</p>}

          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              void signOut()
              setView({ name: 'trips' })
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
      </section>

      <DataLicensesSection />

      <section className="section">
        <h2>Añadir a inicio (PWA)</h2>
        <ul className="howto">
          <li>
            <strong>iPhone:</strong> Safari → Compartir → Añadir a pantalla de inicio
          </li>
          <li>
            <strong>Android:</strong> Chrome → menú ⋮ → Instalar app / Añadir a pantalla de inicio
          </li>
        </ul>
      </section>
    </div>
  )
}
