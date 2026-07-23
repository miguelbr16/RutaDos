import { useEffect, useRef, useState } from 'react'
import { Icon, type IconName } from '../components/Icons'
import { useAppStore } from '../store'
import { loadOfflineDay } from '../lib/offlineDay'
import {
  FEATURED_DESTINATIONS,
  HERO_PHOTO,
  buildQuickDestinationPatch,
  type QuickDestination,
} from '../lib/quickDestinations'
import { DestGrid, TopNav } from '../ui'

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
  { icon: 'dining', title: 'Comer cerca', text: 'Restaurantes en la ruta' },
]

const HERO = FEATURED_DESTINATIONS[0]

/** Hub "Viajes" — lista de viajes guardados + crear uno nuevo (VISION_APP_V2.md §3.2/§5.2). */
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
    <div className="ui-home ui-enter ui-page-tabbed">
      {!online && (
        <p className="offline-banner home-offline">
          Sin conexión.
          {offlineSnap
            ? ` Día guardado: ${offlineSnap.tripTitle} · ${offlineSnap.dayLabel}.`
            : ' Abrí un día para guardarlo offline.'}
        </p>
      )}

      <TopNav />

      {heroOk && HERO ? (
        <section className="ui-hero-mobile" aria-label="Inicio">
          <img src={HERO.photo} alt="" decoding="async" fetchPriority="high" />
          <div className="ui-hero-mobile-shade" aria-hidden />
          <div className="ui-hero-mobile-inner">
            <p className="ui-kicker">RutaDos</p>
            <h1>
              Tu viaje,
              <br />
              <em>a tu ritmo</em>
            </h1>
            <p>Plan por días con mapa y transporte.</p>
            <button type="button" className="btn primary" onClick={startWizard}>
              Nuevo viaje
            </button>
          </div>
        </section>
      ) : null}

      <section className="ui-hero-desktop" aria-label="Inicio">
        <div>
          <p className="ui-kicker">Planificador de viajes</p>
          <h1>
            Tu viaje,
            <br />
            <em>a tu ritmo</em>
          </h1>
          <p className="ui-lede">
            Destino, fechas y un plan por días con mapa — solo o con quien viajéis.
          </p>
          <div className="hero-cta">
            <button type="button" className="btn primary" onClick={startWizard}>
              Nuevo viaje
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                document.getElementById('home-destinos')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }
            >
              Explorar destinos
            </button>
          </div>
        </div>
        {heroOk && HERO ? (
          <button type="button" className="ui-hero-photo" onClick={() => startWithDestination(HERO)}>
            <img
              src={HERO.photo}
              alt=""
              decoding="async"
              fetchPriority="high"
              onError={() => setHeroOk(false)}
            />
            <span className="ui-hero-photo-meta">
              <strong>{HERO.label}</strong>
              <br />
              <span>{HERO.tagline ?? 'Empezar aquí'}</span>
            </span>
          </button>
        ) : null}
      </section>

      <main className="ui-main">
        <ul className="ui-features">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <span className="ui-feature-ico" aria-hidden>
                <Icon name={f.icon} size={20} />
              </span>
              <div>
                <strong>{f.title}</strong>
                <span>{f.text}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="ui-cols">
          <section id="home-destinos">
            <div className="ui-sec-head">
              <h2>Explorar destinos</h2>
              <p>Elegí una ciudad o buscá otra en el wizard</p>
            </div>
            <DestGrid
              destinations={FEATURED_DESTINATIONS}
              onPick={startWithDestination}
              layout="scroll"
            />
          </section>

          <section>
            <div className="ui-sec-head ui-sec-row">
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
              <div className="ui-empty">
                <p>Todavía no hay viajes.</p>
                <button type="button" className="btn primary sm" onClick={startWizard}>
                  Planificar el primero
                </button>
              </div>
            ) : (
              <ul className="ui-trip-list">
                {trips.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className="ui-trip-card"
                      onClick={() => openTrip(t.id)}
                    >
                      <img src={tripCoverPhoto(t.city.name)} alt="" loading="lazy" />
                      <span>
                        <strong>{t.title}</strong>
                        <span>
                          {t.startDate.slice(5).replace('-', '/')} –{' '}
                          {t.endDate.slice(5).replace('-', '/')} · {t.days.length} días
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="ui-trip-del"
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

        <footer className="ui-foot">
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
