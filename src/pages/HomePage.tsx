import { useEffect, useRef, useState } from 'react'
import { DestinationGrid } from '../components/DestinationGrid'
import { Icon, type IconName } from '../components/Icons'
import { useAppStore } from '../store'
import { loadOfflineDay } from '../lib/offlineDay'
import {
  FEATURED_DESTINATIONS,
  HERO_PHOTO,
  buildQuickDestinationPatch,
  type QuickDestination,
} from '../lib/quickDestinations'

function tripCoverPhoto(cityName: string): string {
  const hit = FEATURED_DESTINATIONS.find(
    (d) =>
      d.name.toLowerCase() === cityName.toLowerCase() ||
      cityName.toLowerCase().includes(d.name.toLowerCase()),
  )
  return hit?.photo ?? HERO_PHOTO
}

const FEATURES: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: 'map', title: 'Mapa del día', text: 'Ruta clara parada a parada' },
  { icon: 'transit', title: 'Transporte real', text: 'Links oficiales metro y bus' },
  { icon: 'dining', title: 'Reservar al momento', text: 'Hotel, mesa y entradas' },
]

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
  const [heroOk, setHeroOk] = useState(true)
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
    <div className="home-page home-v2">
      {!online && (
        <p className="offline-banner home-offline">
          Sin conexión.
          {offlineSnap
            ? ` Día guardado: ${offlineSnap.tripTitle} · ${offlineSnap.dayLabel}.`
            : ' Abrí un día para guardarlo offline.'}
        </p>
      )}

      <header className="home-v2-nav">
        <div className="rd-layout home-v2-top">
          <span className="home-v2-logo">
            <span className="home-v2-logo-mark" aria-hidden />
            RutaDos
          </span>
          <button
            type="button"
            className="home-v2-icon-btn"
            aria-label="Ajustes"
            onClick={() => setView({ name: 'settings' })}
          >
            <Icon name="settings" size={18} />
          </button>
        </div>
      </header>

      <section className="home-v2-hero">
        {heroOk ? (
          <img
            className="home-v2-hero-img"
            src={HERO_PHOTO}
            alt=""
            decoding="async"
            fetchPriority="high"
            onError={() => setHeroOk(false)}
          />
        ) : null}
        <div className="home-v2-hero-shade" aria-hidden />
        <div className="home-v2-hero-inner rd-layout">
          <div className="home-v2-hero-content">
            <p className="home-v2-brand-mark">RutaDos</p>
            <h1>
              Tu viaje,
              <br />
              <em>a tu ritmo</em>
            </h1>
            <p className="home-v2-lede">
              Plan por días con mapa y transporte — solo o con quien viajéis.
            </p>
            <button type="button" className="btn primary home-v2-cta" onClick={startWizard}>
              Nuevo viaje
            </button>
          </div>
        </div>
      </section>

      <main className="home-v2-main rd-layout">
        <ul className="home-v2-features">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <span className="home-v2-feature-icon" aria-hidden>
                <Icon name={f.icon} size={20} />
              </span>
              <div className="home-v2-feature-body">
                <strong>{f.title}</strong>
                <span>{f.text}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="home-v2-columns">
          <section className="home-v2-section">
            <div className="home-v2-section-head">
              <h2>Explorar destinos</h2>
              <p>Empezá con una ciudad lista o buscá otra en el wizard</p>
            </div>
            <DestinationGrid
              destinations={FEATURED_DESTINATIONS}
              onPick={startWithDestination}
              layout="grid"
            />
          </section>

          <section className="home-v2-section">
            <div className="home-v2-section-head home-v2-section-row">
              <div>
                <h2>Mis viajes</h2>
                {trips.length > 0 ? <p>{trips.length} guardados</p> : null}
              </div>
              {trips.length > 0 ? (
                <button type="button" className="btn ghost sm" onClick={startWizard}>
                  + Nuevo
                </button>
              ) : null}
            </div>

            {!trips.length ? (
              <div className="home-v2-empty">
                <p>Todavía no hay viajes.</p>
                <button type="button" className="btn primary sm" onClick={startWizard}>
                  Planificar el primero
                </button>
              </div>
            ) : (
              <ul className="home-v2-trips photo-cards">
                {trips.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className="home-v2-trip-photo"
                      onClick={() => setView({ name: 'trip', tripId: t.id })}
                    >
                      <img src={tripCoverPhoto(t.city.name)} alt="" loading="lazy" />
                      <span className="home-v2-trip-photo-body">
                        <strong>{t.title}</strong>
                        <span>
                          {t.startDate.slice(5).replace('-', '/')} –{' '}
                          {t.endDate.slice(5).replace('-', '/')} · {t.days.length} días
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="home-v2-trip-del"
                      aria-label={`Borrar ${t.title}`}
                      onClick={() => {
                        if (confirm(`¿Borrar viaje a ${t.title}?`)) deleteTrip(t.id)
                      }}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="home-v2-foot">
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
