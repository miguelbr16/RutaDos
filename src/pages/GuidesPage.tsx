import { getCityGuide, genericGuide } from '../lib/cityGuides'
import { useAppStore } from '../store'

export function GuidesPage({ tripId }: { tripId: string }) {
  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId))
  const setView = useAppStore((s) => s.setView)

  if (!trip) {
    return (
      <div className="page">
        <p>Viaje no encontrado.</p>
        <button type="button" className="btn" onClick={() => setView({ name: 'home' })}>
          Inicio
        </button>
      </div>
    )
  }

  const guide =
    getCityGuide(trip.city.name, trip.city.displayName) ?? genericGuide(trip.city.name)

  function LinkBlock({
    title,
    items,
  }: {
    title: string
    items: { title: string; url: string; blurb: string }[]
  }) {
    if (!items.length) return null
    return (
      <section className="section">
        <h2>{title}</h2>
        <ul className="guide-list">
          {items.map((l) => (
            <li key={l.url + l.title}>
              <a href={l.url} target="_blank" rel="noreferrer" className="guide-card">
                <strong>{l.title}</strong>
                <span className="muted">{l.blurb}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <div className="page">
      <button
        type="button"
        className="btn ghost sm back"
        onClick={() => setView({ name: 'trip', tripId })}
      >
        ← {trip.title}
      </button>

      <header className="trip-hero">
        <p className="brand small">RutaDos</p>
        <h1>Links útiles</h1>
        <p className="muted">
          Transporte, entradas a museos, shows y monumentos en {trip.city.name}.
        </p>
      </header>

      <section className="panel">
        <h2>{guide.transportTitle}</h2>
        <p>{guide.transportBlurb}</p>
        <div className="toolbar">
          <a className="btn primary sm" href={guide.transportTicketUrl} target="_blank" rel="noreferrer">
            Comprar / tarifas
          </a>
          {guide.transportMapUrl && (
            <a className="btn ghost sm" href={guide.transportMapUrl} target="_blank" rel="noreferrer">
              Mapa de red
            </a>
          )}
        </div>
      </section>

      <LinkBlock title="Museos — reservar" items={guide.museums} />
      <LinkBlock title="Shows y teatro" items={guide.shows} />
      <LinkBlock title="Monumentos" items={guide.monuments} />
      <LinkBlock title="Más links" items={guide.extra} />
    </div>
  )
}
