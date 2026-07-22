import { useEffect, useState } from 'react'
import { fetchNearbyVenues, type NearbyVenue } from '../lib/nearbyVenues'
import type { GeoPlace } from '../types'

type Props = {
  lat: number
  lng: number
  city?: string
  /** Cafés del viaje ya en wishlist */
  tripCafes?: GeoPlace[]
  onAddCafe: (place: GeoPlace) => void
  onClose: () => void
}

export function TiredPanel({ lat, lng, city, tripCafes = [], onAddCafe, onClose }: Props) {
  const [cafes, setCafes] = useState<NearbyVenue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchNearbyVenues({ kind: 'cafe', lat, lng, city, radiusM: 1200, limit: 6 }).then(
      (list) => {
        if (!cancelled) {
          setCafes(list)
          setLoading(false)
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [lat, lng, city])

  const fromTrip = tripCafes
    .filter((p) => p.category === 'cafe')
    .slice(0, 4)

  return (
    <section className="tired-panel" aria-label="Cansados">
      <div className="section-head">
        <h2>Modo cansados</h2>
        <button type="button" className="btn ghost sm" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <p className="muted tiny">
        Día acortado. Elegí un café cerca para pausar — o cerrá y seguí con lo que quedó.
      </p>

      {fromTrip.length > 0 && (
        <>
          <p className="wiz-section-label">De tu viaje</p>
          <ul className="venue-list">
            {fromTrip.map((p) => (
              <li key={p.id} className="venue-card">
                <div className="venue-main">
                  <strong>{p.name}</strong>
                  <span className="muted tiny">Café en el plan / wishlist</span>
                </div>
                <div className="venue-actions">
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={() => onAddCafe(p)}
                  >
                    + Plan
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="wiz-section-label">Cafés cerca</p>
      {loading && <p className="muted">Buscando cafés…</p>}
      {!loading && !cafes.length && (
        <p className="muted tiny">No hay cafés con nombre cerca en el mapa. Probá otra zona.</p>
      )}
      <ul className="venue-list">
        {cafes.map((v) => (
          <li key={v.id} className="venue-card">
            <div className="venue-main">
              <strong>{v.name}</strong>
              <span className="muted tiny">~{v.distanceM} m</span>
            </div>
            <div className="venue-actions">
              <a className="btn ghost sm" href={v.links.maps} target="_blank" rel="noreferrer">
                Maps
              </a>
              <button
                type="button"
                className="btn primary sm"
                onClick={() =>
                  onAddCafe({
                    id: v.id,
                    name: v.name,
                    lat: v.lat,
                    lng: v.lng,
                    category: 'cafe',
                    tier: 'recommended',
                    source: 'osm',
                    score: 88,
                    website: v.website,
                    phone: v.phone,
                    bestSlot: 'afternoon',
                  })
                }
              >
                + Plan
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
