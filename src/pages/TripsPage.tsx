import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icons'
import { useAppStore } from '../store'
import { loadOfflineDay } from '../lib/offlineDay'
import {
  FEATURED_DESTINATIONS,
  buildQuickDestinationPatch,
  type QuickDestination,
} from '../lib/quickDestinations'
import { TopNav } from '../ui'

function tripCoverPhoto(cityName: string): string | undefined {
  const hit = FEATURED_DESTINATIONS.find(
    (d) =>
      d.name.toLowerCase() === cityName.toLowerCase() ||
      cityName.toLowerCase().includes(d.name.toLowerCase()),
  )
  return hit?.photo
}

/** Hub "Viajes" — lista de viajes guardados + crear uno nuevo (rediseño v2, sin hero de marketing). */
export function TripsPage() {
  const trips = useAppStore((s) => s.trips)
  const setView = useAppStore((s) => s.setView)
  const setActiveTrip = useAppStore((s) => s.setActiveTrip)
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

  function openTrip(id: string) {
    setActiveTrip(id)
    setView({ name: 'plan', tripId: id })
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
        const list = Array.isArray(data) ? data : data?.trips
        if (Array.isArray(list) && list.length) {
          importTrips(list)
        } else {
          alert('El archivo no tiene viajes válidos')
        }
      } catch {
        alert('No se pudo importar el archivo')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="v2-trips ui-enter ui-page-tabbed">
      {!online && (
        <p className="offline-banner home-offline">
          Sin conexión.
          {offlineSnap
            ? ` Día guardado: ${offlineSnap.tripTitle} · ${offlineSnap.dayLabel}.`
            : ' Abrí un día para guardarlo offline.'}
        </p>
      )}

      <TopNav />

      <main className="v2-trips-main">
        <section className="v2-trips-intro">
          <h1 className="v2-trip-title">¿A dónde vas?</h1>
          <p>Elegí un destino y armá tu plan por días en pocos pasos.</p>
          <button type="button" className="v2-btn v2-btn-primary" onClick={startWizard}>
            <Icon name="plus" size={16} />
            Nuevo viaje
          </button>
        </section>

        {trips.length > 0 && (
          <section className="v2-trips-section">
            <div className="v2-trips-section-head">
              <h2>Tus viajes</h2>
              <span>{trips.length} guardados</span>
            </div>
            <ul className="v2-trip-grid">
              {trips.map((t) => {
                const cover = tripCoverPhoto(t.city.name)
                return (
                  <li key={t.id} className="v2-trip-card">
                    <button type="button" className="v2-trip-card-btn" onClick={() => openTrip(t.id)}>
                      <span className="v2-trip-card-media" style={{ '--dest-accent': '#1a2b4a' } as never}>
                        {cover ? (
                          <img
                            src={cover}
                            alt=""
                            loading="lazy"
                            onError={(e) => e.currentTarget.classList.add('is-broken')}
                          />
                        ) : null}
                      </span>
                      <span className="v2-trip-card-body">
                        <strong className="v2-trip-title">{t.title}</strong>
                        <span className="v2-trip-card-meta">
                          {t.startDate.slice(5).replace('-', '/')} –{' '}
                          {t.endDate.slice(5).replace('-', '/')} · {t.days.length} días
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="v2-trip-del"
                      aria-label={`Borrar ${t.title}`}
                      onClick={() => {
                        if (confirm(`¿Borrar viaje a ${t.title}?`)) deleteTrip(t.id)
                      }}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <section className="v2-trips-section">
          <div className="v2-trips-section-head">
            <h2>Destinos populares</h2>
            <span>Tocá uno para empezar</span>
          </div>
          <ul className="v2-dest-chip-row">
            {FEATURED_DESTINATIONS.map((d) => (
              <li key={d.name}>
                <button type="button" className="v2-dest-chip" onClick={() => startWithDestination(d)}>
                  <span className="v2-dest-chip-media" style={{ '--dest-accent': d.accent } as never}>
                    <img
                      src={d.photo}
                      alt=""
                      loading="lazy"
                      onError={(e) => e.currentTarget.classList.add('is-broken')}
                    />
                  </span>
                  <span>
                    <strong>{d.label}</strong>
                    <em>{d.tagline ?? d.hint ?? 'Explorar'}</em>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {!trips.length && (
          <p className="v2-trips-empty-hint">
            Tu primer viaje va a aparecer acá, con mapa, plan por días y modo Hoy sin conexión.
          </p>
        )}

        <footer className="v2-trips-foot">
          <button type="button" onClick={exportAll}>
            Exportar
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
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
