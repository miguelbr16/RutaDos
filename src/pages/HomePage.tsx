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
  { icon: 'map', title: 'Mapa siempre visible', text: 'Plan y ruta juntos, día a día' },
  { icon: 'transit', title: 'Cómo moverse', text: 'Metro, bus y links oficiales' },
  { icon: 'dining', title: 'Hotel y mesa', text: 'Reservar cerca de la ruta' },
]

const HERO_FEATURE = FEATURED_DESTINATIONS[0]

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
    <div className="home-page home-v2 home-v3">
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

      <section className="home-v3-hero rd-layout">
        <div className="home-v3-hero-copy">
          <p className="home-v3-kicker">Planificador de viajes</p>
          <h1>
            Tu viaje,
            <br />
            <em>a tu ritmo</em>
          </h1>
          <p className="home-v3-lede">
            Itinerario por días con mapa siempre a la vista — solo o acompañado.
          </p>
          <div className="home-v3-cta-row">
            <button type="button" className="btn primary home-v3-cta" onClick={startWizard}>
              Nuevo viaje
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                const el = document.getElementById('home-destinos')
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              Explorar destinos
            </button>
          </div>
        </div>
        <div className="home-v3-hero-visual">
          {heroOk ? (
            <button
              type="button"
              className="home-v3-hero-card"
              onClick={() => startWithDestination(HERO_FEATURE)}
            >
              <img
                src={HERO_FEATURE.photo}
                alt=""
                decoding="async"
                fetchPriority="high"
                onError={() => setHeroOk(false)}
              />
              <span className="home-v3-hero-card-meta">
                <strong>{HERO_FEATURE.label}</strong>
                <span>{HERO_FEATURE.tagline ?? 'Empezar aquí'}</span>
              </span>
            </button>
          ) : (
            <div className="home-v3-hero-fallback" aria-hidden />
          )}
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
          <section className="home-v2-section" id="home-destinos">
            <div className="home-v2-section-head">
              <h2>Explorar destinos</h2>
              <p>Elegí una ciudad o buscá otra en el wizard</p>
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
