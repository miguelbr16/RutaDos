import { useEffect, useState } from 'react'
import { fetchNearbyVenues, type NearbyVenue } from '../lib/nearbyVenues'
import {
  hotelCitySearchUrl,
  hotelMapsSearchUrl,
  type VenueKind,
} from '../lib/bookingLinks'
import { isOpenTripMapEnabled } from '../lib/opentripmap'
import { Icon, type IconName } from './Icons'

type Props = {
  kind: VenueKind
  lat: number
  lng: number
  city?: string
  checkin?: string
  checkout?: string
  nearLabel?: string
  onClose: () => void
  onAdd?: (v: NearbyVenue) => void
}

const KIND_META: Record<VenueKind, { title: string; icon: IconName; empty: string }> = {
  hotel: {
    title: 'Hoteles cerca',
    icon: 'hotel',
    empty: 'Sin hoteles OSM aquí. Probá Booking o Maps abajo.',
  },
  restaurant: {
    title: 'Restaurantes cerca',
    icon: 'restaurant',
    empty: 'No encontré restaurantes con nombre cerca. Ampliá la zona o probá Maps.',
  },
  cafe: {
    title: 'Cafés cerca',
    icon: 'cafe',
    empty: 'No encontré cafés cerca. Probá otra zona del mapa.',
  },
}

function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`
  return `${(m / 1000).toFixed(1)} km`
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
  const meta = KIND_META[kind]

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
      if (!list.length) setErr(meta.empty)
    })
    return () => {
      cancelled = true
    }
  }, [kind, lat, lng, city, meta.empty])

  const bookingCity =
    city && kind === 'hotel'
      ? hotelCitySearchUrl({ city, lat, lng, checkin, checkout })
      : null
  const mapsHotels =
    city && kind === 'hotel' ? hotelMapsSearchUrl({ city, lat, lng }) : null

  return (
    <section className="venue-finder rd-surface" aria-label={meta.title}>
      <div className="venue-finder-head">
        <div className="venue-finder-title">
          <span className="venue-finder-icon" aria-hidden>
            <Icon name={meta.icon} size={20} />
          </span>
          <div>
            <h2>{meta.title}</h2>
            {nearLabel ? <p className="muted tiny">{nearLabel}</p> : null}
          </div>
        </div>
        <button type="button" className="btn ghost sm" onClick={onClose}>
          Cerrar
        </button>
      </div>

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

      <p className="venue-finder-note muted tiny">
        {kind === 'hotel'
          ? 'Sugerencias OpenStreetMap cerca de la ruta.'
          : `OpenStreetMap${isOpenTripMapEnabled() ? ' + OpenTripMap' : ''}. Priorizamos sitios con web o buena valoración.`}
      </p>

      {loading ? (
        <div className="venue-loading">
          <span className="venue-loading-dot" aria-hidden />
          Buscando…
        </div>
      ) : null}
      {err && !loading ? <p className="venue-empty-msg muted">{err}</p> : null}

      <ul className="venue-list">
        {items.map((v) => (
          <li key={v.id} className="venue-card-v2">
            {v.previewUrl ? (
              <img
                className="venue-thumb"
                src={v.previewUrl}
                alt=""
                width={72}
                height={72}
                loading="lazy"
              />
            ) : (
              <div className="venue-thumb venue-thumb-fallback" aria-hidden>
                <Icon name={meta.icon} size={22} />
              </div>
            )}
            <div className="venue-card-body">
              <div className="venue-card-top">
                <strong>{v.name}</strong>
                <span className="venue-dist">{formatDistance(v.distanceM)}</span>
              </div>
              <p className="venue-card-meta muted tiny">
                {v.category}
                {v.cuisine ? ` · ${v.cuisine}` : ''}
                {v.stars ? ` · ${v.stars}★` : ''}
                {v.rating ? ` · ★ ${v.rating}/3` : ''}
              </p>
              <div className="venue-badges">
                <span className={`venue-badge ${v.source}`}>
                  {v.source === 'otm' ? 'OpenTripMap' : 'OSM'}
                </span>
                {v.links.hasOfficialWeb ? (
                  <span className="venue-badge ok">Web</span>
                ) : null}
                {v.kinds ? <span className="venue-badge muted">{v.kinds}</span> : null}
              </div>
              <div className="venue-actions">
                <a className="btn ghost sm" href={v.links.maps} target="_blank" rel="noreferrer">
                  Maps
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
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
