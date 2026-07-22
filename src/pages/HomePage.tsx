import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store'
import { loadOfflineDay } from '../lib/offlineDay'

export function HomePage() {
  const trips = useAppStore((s) => s.trips)
  const setView = useAppStore((s) => s.setView)
  const deleteTrip = useAppStore((s) => s.deleteTrip)
  const resetWizard = useAppStore((s) => s.resetWizard)
  const importTrips = useAppStore((s) => s.importTrips)
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const offlineSnap = !online ? loadOfflineDay() : null
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  function startWizard() {
    resetWizard()
    setView({ name: 'wizard', step: 0 })
  }

  function exportAll() {
    const blob = new Blob([JSON.stringify({ trips }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rutados-viajes.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function onImportFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (Array.isArray(data.trips)) importTrips(data.trips)
        else if (Array.isArray(data)) importTrips(data)
      } catch {
        alert('No se pudo importar el archivo')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="home-page">
      {!online && (
        <p className="offline-banner home-offline">
          Sin conexión.
          {offlineSnap
            ? ` Día guardado: ${offlineSnap.tripTitle} · ${offlineSnap.day.label}.`
            : ' Abrí un día para guardarlo offline.'}
        </p>
      )}

      <section className="home-landing" aria-label="Inicio">
        <div className="home-landing-visual" aria-hidden>
          <img
            className="home-landing-photo"
            src="/hero/landing.jpg"
            alt=""
            width={1600}
            height={1067}
            decoding="async"
            fetchPriority="high"
          />
          <div className="home-landing-veil" />
          <svg className="home-landing-route" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">
            <path
              className="home-route-path"
              d="M28 168 C78 148, 96 92, 148 86 S230 118, 262 78 S330 42, 372 58"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle className="home-route-pin home-route-pin-a" cx="28" cy="168" r="5" />
            <circle className="home-route-pin home-route-pin-b" cx="148" cy="86" r="5" />
            <circle className="home-route-pin home-route-pin-c" cx="262" cy="78" r="5" />
            <circle className="home-route-pin home-route-pin-d" cx="372" cy="58" r="5" />
          </svg>
        </div>

        <div className="home-landing-copy">
          <p className="home-landing-brand">RutaDos</p>
          <h1 className="home-landing-title">El viaje, día a día</h1>
          <p className="home-landing-lede">
            Armá la ruta, abrí el mapa y movete con metro, taxi o andando.
          </p>
          <div className="home-landing-cta">
            <button type="button" className="btn primary home-cta-main" onClick={startWizard}>
              Crear viaje
            </button>
          </div>
        </div>
      </section>

      <section className="home-trips-panel">
        <div className="home-trips-head">
          <h2>Tus viajes</h2>
          {trips.length > 0 ? (
            <button type="button" className="btn ghost sm" onClick={startWizard}>
              Nuevo
            </button>
          ) : null}
        </div>

        {!trips.length ? (
          <p className="home-empty muted">Todavía no hay ninguno. Empezá con el primero.</p>
        ) : (
          <ul className="home-trip-list">
            {trips.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="home-trip-item"
                  onClick={() => setView({ name: 'trip', tripId: t.id })}
                >
                  <span className="home-trip-mark" aria-hidden />
                  <span className="home-trip-text">
                    <strong>{t.title}</strong>
                    <span>
                      {t.startDate} → {t.endDate} · {t.days.length}{' '}
                      {t.days.length === 1 ? 'día' : 'días'}
                    </span>
                  </span>
                  <span className="home-trip-go" aria-hidden>
                    →
                  </span>
                </button>
                <button
                  type="button"
                  className="home-trip-del"
                  aria-label={`Borrar viaje a ${t.title}`}
                  onClick={() => {
                    if (confirm(`¿Borrar viaje a ${t.title}?`)) deleteTrip(t.id)
                  }}
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}

        <nav className="home-tools" aria-label="Herramientas">
          <button type="button" className="home-tool-link" onClick={() => setView({ name: 'settings' })}>
            Ajustes y sync
          </button>
          <span className="home-tool-sep" aria-hidden>
            ·
          </span>
          <button type="button" className="home-tool-link" onClick={exportAll}>
            Exportar
          </button>
          <span className="home-tool-sep" aria-hidden>
            ·
          </span>
          <button type="button" className="home-tool-link" onClick={() => fileRef.current?.click()}>
            Importar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportFile(f)
              e.target.value = ''
            }}
          />
        </nav>
      </section>
    </div>
  )
}
