import { useEffect, useState } from 'react'
import { fetchNearbyVenues, type NearbyVenue } from '../lib/nearbyVenues'
import {
  hotelCitySearchUrl,
  hotelMapsSearchUrl,
  type VenueKind,
} from '../lib/bookingLinks'

type Props = {
  kind: VenueKind
  lat: number
  lng: number
  city?: string
  checkin?: string
  checkout?: string
  /** Contexto opcional (ej. «cerca de Buckingham Palace · comida») */
  nearLabel?: string
  onClose: () => void
  onAdd?: (v: NearbyVenue) => void
}

export function VenueFinder({
  kind,
  lat,
  lng,
  city,
  checkin,
  checkout,
  nearLabel,
  onClose,
  onAdd,
}: Props) {
  const [items, setItems] = useState<NearbyVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErr(null)
    void fetchNearbyVenues({
      kind,
      lat,
      lng,
      city,
      limit: kind === 'hotel' ? 12 : 10,
      radiusM: kind === 'hotel' ? 5000 : undefined,
    }).then((list) => {
      if (cancelled) return
      setItems(list)
      setLoading(false)
      if (!list.length) {
        setErr(
          kind === 'hotel'
            ? 'OSM no trajo hoteles aquí. Usá Booking o Maps abajo.'
            : 'No encontré sitios con nombre cerca. Probá otra zona.',
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [kind, lat, lng, city])

  const title =
    kind === 'hotel'
      ? 'Hoteles cerca'
      : kind === 'cafe'
        ? 'Cafés cerca'
        : 'Restaurantes cerca'

  const bookingCity =
    city && kind === 'hotel'
      ? hotelCitySearchUrl({ city, lat, lng, checkin, checkout })
      : null
  const mapsHotels =
    city && kind === 'hotel' ? hotelMapsSearchUrl({ city, lat, lng }) : null

  return (
    <section className="venue-finder" aria-label={title}>
      <div className="section-head">
        <h2>{title}</h2>
        <button type="button" className="btn ghost sm" onClick={onClose}>
          Cerrar
        </button>
      </div>
      {nearLabel ? <p className="muted tiny">{nearLabel}</p> : null}

      {kind === 'hotel' && (bookingCity || mapsHotels) ? (
        <div className="venue-fallbacks">
          {bookingCity ? (
            <a className="btn primary sm" href={bookingCity} target="_blank" rel="noreferrer">
              Buscar en Booking
            </a>
          ) : null}
          {mapsHotels ? (
            <a className="btn ghost sm" href={mapsHotels} target="_blank" rel="noreferrer">
              Hoteles en Maps
            </a>
          ) : null}
        </div>
      ) : null}

      <p className="muted tiny">
        {kind === 'hotel'
          ? 'Sugerencias OSM cerca de la ruta; Booking suele tener más disponibilidad.'
          : 'Datos OpenStreetMap. Priorizamos sitios con web oficial.'}
      </p>
      {loading && <p className="muted">Buscando…</p>}
      {err && !loading && <p className="muted">{err}</p>}
      <ul className="venue-list">
        {items.map((v) => (
          <li key={v.id} className="venue-card">
            <div className="venue-main">
              <strong>{v.name}</strong>
              <span className="muted tiny">
                {v.category}
                {v.cuisine ? ` · ${v.cuisine}` : ''}
                {v.stars ? ` · ${v.stars}★` : ''} · ~{v.distanceM} m
                {v.links.hasOfficialWeb ? ' · web OSM' : ''}
              </span>
            </div>
            <div className="venue-actions">
              <a className="btn ghost sm" href={v.links.web} target="_blank" rel="noreferrer">
                {v.links.hasOfficialWeb ? 'Web' : 'Maps'}
              </a>
              <a
                className="btn primary sm"
                href={v.links.reserveOrBook}
                target="_blank"
                rel="noreferrer"
              >
                {v.links.reserveLabel}
              </a>
              {v.phone ? (
                <a className="btn ghost sm" href={`tel:${v.phone.replace(/\s/g, '')}`}>
                  Llamar
                </a>
              ) : null}
              {onAdd ? (
                <button type="button" className="btn ghost sm" onClick={() => onAdd(v)}>
                  {kind === 'hotel' ? 'Elegir' : '+ Plan'}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
