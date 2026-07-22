import { useEffect, useRef, useState } from 'react'
import { DestinationGrid } from '../components/DestinationGrid'
import { useAppStore } from '../store'
import { loadOfflineDay } from '../lib/offlineDay'
import {
  FEATURED_DESTINATIONS,
  buildQuickDestinationPatch,
  type QuickDestination,
} from '../lib/quickDestinations'

export function HomePage() {
  const trips = useAppStore((s) => s.trips)
  const setView = useAppStore((s) => s.setView)
  const deleteTrip = useAppStore((s) => s.deleteTrip)
  const resetWizard = useAppStore((s) => s.resetWizard)
  const patchWizard = useAppStore((s) => s.patchWizard)
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

  function startWithDestination(d: QuickDestination) {
    resetWizard()
    patchWizard(buildQuickDestinationPatch(d))
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
            ? ` Día guardado: ${offlineSnap.tripTitle} · ${offlineSnap.dayLabel}.`
            : ' Abrí un día para guardarlo offline.'}
        </p>
      )}

      <header className="home-top">
        <span className="home-logo">RutaDos</span>
        <button
          type="button"
          className="btn ghost sm home-settings"
          onClick={() => setView({ name: 'settings' })}
        >
          Ajustes
        </button>
      </header>

      <section className="home-hero" aria-label="Inicio">
        <img
          className="home-hero-img"
          src="/hero/landing.jpg"
          alt=""
          width={1600}
          height={1067}
          decoding="async"
          fetchPriority="high"
        />
        <div className="home-hero-overlay" aria-hidden />
        <div className="home-hero-inner">
          <h1 className="home-hero-title">Tu ruta, día a día</h1>
          <p className="home-hero-sub">
            Itinerario claro, mapa en mano y reservas cuando las necesitás.
          </p>
          <button type="button" className="btn primary home-hero-cta" onClick={startWizard}>
            Crear viaje
          </button>
        </div>
      </section>

      <main className="home-main">
        <section className="home-block" aria-label="Destinos sugeridos">
          <div className="home-block-head">
            <h2>Destinos</h2>
            <p className="muted tiny">Tocá uno para empezar con la ciudad lista.</p>
          </div>
          <DestinationGrid
            destinations={FEATURED_DESTINATIONS}
            onPick={startWithDestination}
          />
        </section>

        <section className="home-block" aria-label="Tus viajes">
          <div className="home-block-head home-block-head-row">
            <div>
              <h2>Mis viajes</h2>
              {trips.length > 0 ? (
                <p className="muted tiny">{trips.length} guardado{trips.length === 1 ? '' : 's'}</p>
              ) : null}
            </div>
            {trips.length > 0 ? (
              <button type="button" className="btn ghost sm" onClick={startWizard}>
                + Nuevo
              </button>
            ) : null}
          </div>

          {!trips.length ? (
            <div className="home-empty">
              <p>Aún no hay viajes planificados.</p>
              <button type="button" className="btn primary sm" onClick={startWizard}>
                Planificar el primero
              </button>
            </div>
          ) : (
            <ul className="home-trips">
              {trips.map((t) => (
                <li key={t.id} className="home-trip-row">
                  <button
                    type="button"
                    className="home-trip-card"
                    onClick={() => setView({ name: 'trip', tripId: t.id })}
                  >
                    <span className="home-trip-date">
                      {t.startDate.slice(5).replace('-', '/')} – {t.endDate.slice(5).replace('-', '/')}
                    </span>
                    <strong>{t.title}</strong>
                    <span className="muted tiny">
                      {t.days.length} {t.days.length === 1 ? 'día' : 'días'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="home-trip-remove"
                    aria-label={`Borrar ${t.title}`}
                    onClick={() => {
                      if (confirm(`¿Borrar viaje a ${t.title}?`)) deleteTrip(t.id)
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="home-foot" aria-label="Herramientas">
          <button type="button" className="home-foot-link" onClick={exportAll}>
            Exportar viajes
          </button>
          <span className="home-foot-dot" aria-hidden>
            ·
          </span>
          <button type="button" className="home-foot-link" onClick={() => fileRef.current?.click()}>
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
        </footer>
      </main>
    </div>
  )
}
