import { useEffect, useState } from 'react'
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
    <div className="page home-page">
      {!online && (
        <p className="offline-banner">
          Sin conexión.
          {offlineSnap
            ? ` Día guardado: ${offlineSnap.tripTitle} · ${offlineSnap.day.label}.`
            : ' Abrí un día para guardarlo offline.'}
        </p>
      )}

      <header className="hero home-hero simple">
        <div className="hero-copy">
          <p className="brand">RutaDos</p>
          <h1>Tu viaje, a tu ritmo</h1>
          <p className="lede">
            Elegí destino y gustos. Te armamos un plan por días, claro y fácil de seguir.
          </p>
          <div className="hero-cta">
            <button type="button" className="btn primary" onClick={startWizard}>
              Nuevo viaje
            </button>
          </div>
        </div>
      </header>

      <section className="section trips-section">
        <div className="section-head">
          <h2>Vuestros viajes</h2>
        </div>

        {!trips.length && (
          <p className="muted empty-hint">Todavía no hay viajes. Empezá con «Nuevo viaje».</p>
        )}

        <ul className="trip-list">
          {trips.map((t) => (
            <li key={t.id} className="trip-item">
              <button
                type="button"
                className="trip-main"
                onClick={() => setView({ name: 'trip', tripId: t.id })}
              >
                <span className="trip-title">{t.title}</span>
                <span className="muted">
                  {t.startDate} → {t.endDate} · {t.days.length} días
                </span>
              </button>
              <button
                type="button"
                className="btn ghost sm danger"
                onClick={() => {
                  if (confirm(`¿Borrar viaje a ${t.title}?`)) deleteTrip(t.id)
                }}
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>

        <details className="more-panel">
          <summary>Más</summary>
          <div className="row gap" style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn ghost sm" onClick={exportAll}>
              Exportar viajes
            </button>
            <label className="btn ghost sm file-btn">
              Importar
              <input
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onImportFile(f)
                }}
              />
            </label>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setView({ name: 'settings' })}
            >
              Sync (opcional)
            </button>
          </div>
        </details>
      </section>
    </div>
  )
}
