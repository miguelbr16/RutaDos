import { useEffect, useState } from 'react'
import {
  CATEGORY_LABELS,
  TRANSIT_MODE_LABELS,
  type Stop,
  type TransitMode,
} from '../types'
import { googleMapsPlaceUrl, googleMapsTransitLegUrl, travelModeForTransit } from '../lib/mapsUrl'
import type { PlaceHours } from '../lib/openingHours'
import { fetchPlaceBlurb, type PlaceBlurb } from '../lib/placeWiki'
import { hotelBookingUrl, placeQuickLinks, restaurantReserveUrl, restaurantWebUrl } from '../lib/bookingLinks'

type Props = {
  stops: Stop[]
  photoByStop: Record<string, string[]>
  hoursByStop: Record<string, PlaceHours>
  onModeChange: (stopId: string, mode: TransitMode) => void
  onMove: (stopId: string, dir: -1 | 1) => void
  onRemove: (stopId: string) => void
  onNotes: (stopId: string, notes: string) => void
  onDefer: (stopId: string) => void
  onFindMeals?: (opts: { lat: number; lng: number; meal: 'lunch' | 'dinner'; nearName: string }) => void
}

export function DayTimeline({
  stops,
  photoByStop,
  hoursByStop,
  onModeChange,
  onMove,
  onRemove,
  onNotes,
  onDefer,
  onFindMeals,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [blurb, setBlurb] = useState<PlaceBlurb | null>(null)
  const [blurbLoading, setBlurbLoading] = useState(false)

  const openStop = stops.find((s) => s.id === openId) ?? null

  function mealWindow(stop: Stop): 'lunch' | 'dinner' | null {
    if (stop.isHotel) return null
    if (stop.slot === 'lunch') return 'lunch'
    if (stop.slot === 'evening' || stop.slot === 'night') return 'dinner'
    const t = stop.suggestedTime
    if (!t) return null
    const h = Number(t.split(':')[0])
    if (Number.isFinite(h) && h >= 12 && h < 16) return 'lunch'
    if (Number.isFinite(h) && h >= 19 && h <= 23) return 'dinner'
    return null
  }

  // Una sugerencia de comida/cena por franja (primera parada de esa franja)
  const mealStopId = new Map<'lunch' | 'dinner', string>()
  for (const s of stops) {
    const m = mealWindow(s)
    if (!m || mealStopId.has(m)) continue
    if (s.category === 'food' || s.category === 'cafe') continue
    mealStopId.set(m, s.id)
  }

  useEffect(() => {
    if (!openStop || openStop.isHotel) {
      setBlurb(null)
      return
    }
    let cancelled = false
    setBlurbLoading(true)
    setBlurb(null)
    void fetchPlaceBlurb(openStop.name, openStop.lat, openStop.lng).then((b) => {
      if (!cancelled) {
        setBlurb(b)
        setBlurbLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [openStop?.id])

  return (
    <ol className="day-timeline">
      {stops.map((stop, i) => {
        const next = stops[i + 1]
        const photo = photoByStop[stop.id]?.[0] || stop.photoUrl
        const hours = hoursByStop[stop.id]
        const open = openId === stop.id
        const done = stop.visitStatus === 'done'
        const skipped = stop.visitStatus === 'skipped'

        return (
          <li
            key={stop.id}
            className={`tl-card${stop.isHotel ? ' hotel' : ''}${done ? ' done' : ''}${skipped ? ' skipped' : ''}`}
          >
            <div className="tl-rail" aria-hidden>
              <span className="tl-dot">{stop.isHotel ? '⌂' : i + 1}</span>
              {next ? <span className="tl-line" /> : null}
            </div>

            <div className="tl-body">
              <button
                type="button"
                className="tl-main"
                onClick={() => setOpenId(open ? null : stop.id)}
              >
                {photo ? (
                  <img className="tl-photo" src={photo} alt="" loading="lazy" />
                ) : (
                  <div className="tl-photo placeholder" />
                )}
                <div className="tl-text">
                  <div className="tl-time-row">
                    {stop.suggestedTime ? <span className="tl-time">{stop.suggestedTime}</span> : null}
                    {hours ? (
                      <span className={`hours-line ${hours.status}`}>{hours.label}</span>
                    ) : null}
                  </div>
                  <strong className="tl-name">{stop.name}</strong>
                  <span className="tl-meta">
                    {stop.isHotel ? 'Hotel' : CATEGORY_LABELS[stop.category]}
                    {done ? ' · Hecho' : ''}
                    {skipped ? ' · Saltado' : ''}
                  </span>
                </div>
                <span className="tl-chevron">{open ? '▾' : '▸'}</span>
              </button>

              {next && (
                <div className="tl-leg">
                  <label className="tl-leg-select">
                    <span className="sr-only">Transporte</span>
                    <select
                      value={stop.transitMode || 'walk'}
                      onChange={(e) => onModeChange(stop.id, e.target.value as TransitMode)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(Object.keys(TRANSIT_MODE_LABELS) as TransitMode[]).map((m) => (
                        <option key={m} value={m}>
                          {TRANSIT_MODE_LABELS[m]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="tl-leg-mins">
                    {stop.minutesToNext != null ? `~${stop.minutesToNext} min` : 'tramo'}
                  </span>
                  <a
                    className="tl-leg-link"
                    href={googleMapsTransitLegUrl(
                      stop,
                      next,
                      travelModeForTransit(stop.transitMode),
                    )}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Cómo llego
                  </a>
                </div>
              )}

              {!stop.isHotel && (
                <div className="tl-quick-actions">
                  {placeQuickLinks({
                    name: stop.name,
                    lat: stop.lat,
                    lng: stop.lng,
                    category: stop.category,
                    listingKind: stop.listingKind,
                    website: stop.website,
                    isHotel: stop.isHotel,
                  }).map((l) => (
                    <a
                      key={l.label}
                      className={l.primary ? 'btn primary sm' : 'btn ghost sm'}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {l.label}
                    </a>
                  ))}
                  {onFindMeals && mealStopId.get('lunch') === stop.id ? (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onFindMeals({
                          lat: stop.lat,
                          lng: stop.lng,
                          meal: 'lunch',
                          nearName: stop.name,
                        })
                      }}
                    >
                      Comer cerca
                    </button>
                  ) : null}
                  {onFindMeals && mealStopId.get('dinner') === stop.id ? (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onFindMeals({
                          lat: stop.lat,
                          lng: stop.lng,
                          meal: 'dinner',
                          nearName: stop.name,
                        })
                      }}
                    >
                      Cenar cerca
                    </button>
                  ) : null}
                </div>
              )}

              {stop.isHotel && (
                <div className="tl-quick-actions">
                  <a
                    className="btn primary sm"
                    href={hotelBookingUrl({
                      name: stop.name,
                      lat: stop.lat,
                      lng: stop.lng,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Booking
                  </a>
                </div>
              )}

              {open && (
                <div className="tl-details">
                  {!stop.isHotel && (
                    <div className="place-blurb">
                      {blurbLoading && <p className="muted tiny">Cargando qué es…</p>}
                      {!blurbLoading && blurb && (
                        <>
                          <p>{blurb.extract}</p>
                          <a href={blurb.url} target="_blank" rel="noreferrer" className="muted tiny">
                            Más en Wikipedia
                          </a>
                        </>
                      )}
                      {!blurbLoading && !blurb && (
                        <p className="muted tiny">Sin ficha breve disponible ahora.</p>
                      )}
                    </div>
                  )}

                  {stop.transportReason ? (
                    <p className="muted tiny">{stop.transportReason}</p>
                  ) : null}

                  {!stop.isHotel && (
                    <label className="stop-user-notes">
                      <span className="muted tiny">Nota / reserva</span>
                      <input
                        value={stop.userNotes ?? ''}
                        placeholder="Reserva 14:00…"
                        onChange={(e) => onNotes(stop.id, e.target.value)}
                      />
                    </label>
                  )}

                  <div className="tl-actions">
                    <a
                      className="btn ghost sm"
                      href={googleMapsPlaceUrl(stop.lat, stop.lng, stop.name)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Maps
                    </a>
                    {stop.isHotel || stop.listingKind === 'hotel' ? (
                      <a
                        className="btn primary sm"
                        href={hotelBookingUrl({
                          name: stop.name,
                          lat: stop.lat,
                          lng: stop.lng,
                        })}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Booking
                      </a>
                    ) : null}
                    {(stop.category === 'food' ||
                      stop.category === 'cafe' ||
                      stop.listingKind === 'restaurant') && (
                      <>
                        <a
                          className="btn ghost sm"
                          href={restaurantWebUrl({
                            name: stop.name,
                            lat: stop.lat,
                            lng: stop.lng,
                            website: stop.website,
                          })}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {stop.website ? 'Web' : 'Maps'}
                        </a>
                        <a
                          className="btn primary sm"
                          href={restaurantReserveUrl({
                            name: stop.name,
                            lat: stop.lat,
                            lng: stop.lng,
                            website: stop.website,
                          })}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Reservar
                        </a>
                      </>
                    )}
                    {stop.phone ? (
                      <a className="btn ghost sm" href={`tel:${stop.phone.replace(/\s/g, '')}`}>
                        Llamar
                      </a>
                    ) : null}
                    <button type="button" className="btn ghost sm" onClick={() => onMove(stop.id, -1)}>
                      ↑
                    </button>
                    <button type="button" className="btn ghost sm" onClick={() => onMove(stop.id, 1)}>
                      ↓
                    </button>
                    {!stop.isHotel && (
                      <>
                        <button type="button" className="btn ghost sm" onClick={() => onDefer(stop.id)}>
                          Otro día
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm danger-text"
                          onClick={() => onRemove(stop.id)}
                        >
                          Quitar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
