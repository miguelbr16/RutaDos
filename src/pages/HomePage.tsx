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
  const [moreOpen, setMoreOpen] = useState(false)

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

      <header className="home-splash">
        <div className="home-splash-top">
          <p className="brand home-brand">RutaDos</p>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setMoreOpen((v) => !v)}
          >
            Más
          </button>
        </div>
        <h1 className="home-splash-title">Tu compañero de viaje, día a día</h1>
        <p className="home-splash-lede">
          Armá el plan, abrí Maps o el metro, reservá mesa o entradas — en el móvil, donde hace falta.
        </p>
        <button type="button" className="btn primary home-splash-cta" onClick={startWizard}>
          Crear viaje
        </button>
        <ul className="home-points" aria-label="Qué incluye">
          <li>Plan por días</li>
          <li>Ruta + transporte</li>
          <li>Reservas y Maps</li>
        </ul>
      </header>

      {moreOpen && (
        <div className="home-more-bar">
          <button type="button" className="btn ghost sm" onClick={exportAll}>
            Exportar
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
            Sync
          </button>
        </div>
      )}

      <section className="home-trips">
        <h2>Viajes</h2>
        {!trips.length && (
          <p className="muted empty-hint">Todavía no hay ninguno. Creá el primero.</p>
        )}
        <ul className="trip-list compact">
          {trips.map((t) => (
            <li key={t.id} className="trip-row">
              <button
                type="button"
                className="trip-row-main"
                onClick={() => setView({ name: 'trip', tripId: t.id })}
              >
                <strong>{t.title}</strong>
                <span>
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
      </section>
    </div>
  )
}
