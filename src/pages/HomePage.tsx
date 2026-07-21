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
            ? ` Día guardado: ${offlineSnap.tripTitle} · ${offlineSnap.day.label} (${offlineSnap.day.stops.filter((s) => !s.isHotel).length} paradas).`
            : ' Abrí un día con datos para guardarlo offline.'}
        </p>
      )}
      <header className="hero home-hero">
        <div className="hero-plane" aria-hidden>
          <svg className="hero-route" viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2a8f7a" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#e08a3c" stopOpacity="0.75" />
              </linearGradient>
            </defs>
            <path
              className="hero-path"
              d="M40 320 C120 280 160 200 260 190 C360 180 400 260 480 240 C580 215 620 120 720 90"
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle className="hero-pin hero-pin-a" cx="40" cy="320" r="7" />
            <circle className="hero-pin hero-pin-b" cx="480" cy="240" r="7" />
            <circle className="hero-pin hero-pin-c" cx="720" cy="90" r="9" />
          </svg>
        </div>

        <div className="hero-copy">
          <p className="brand">RutaDos</p>
          <h1>Planificá juntos, sin lío</h1>
          <p className="lede">
            Horarios, transporte y mapa editable — una guía hecha a vuestra medida.
          </p>
          <div className="hero-cta">
            <button type="button" className="btn primary" onClick={startWizard}>
              Nuevo viaje
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setView({ name: 'settings' })}
            >
              Pareja / sync
            </button>
          </div>
        </div>
      </header>

      <section className="section trips-section">
        <div className="section-head">
          <h2>Vuestros viajes</h2>
          <div className="row gap">
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
          </div>
        </div>

        {!trips.length && (
          <p className="muted empty-hint">Aún no hay viajes. Creá el primero con una ciudad.</p>
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
                  {t.startDate} → {t.endDate} · {t.days.length} días · {t.places.length} sitios
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
