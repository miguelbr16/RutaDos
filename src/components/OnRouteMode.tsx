import { useEffect, useMemo, useState } from 'react'
import { CATEGORY_LABELS, TRANSIT_MODE_LABELS } from '../types'
import { useAppStore } from '../store'
import { TripMap } from './TripMap'
import { OfflineStatusBanner } from './OfflineBanner'
import {
  googleMapsDirectionsUrl,
  googleMapsPlaceUrl,
  googleMapsTransitLegUrl,
  travelModeForTransit,
} from '../lib/mapsUrl'
import { loadOfflineDay, saveOfflineDay, type OfflineDayPack } from '../lib/offlineDay'
import { hoursForPlace, type PlaceHours } from '../lib/openingHours'
import { TiredPanel } from './TiredPanel'
import { Icon } from './Icons'

type Props = {
  tripId: string
  dayId: string
  onClose: () => void
}

/**
 * Modo inmersivo "En ruta" — fullscreen dentro del hub Hoy (VISION_APP_V2.md §3.2/§5.4).
 * Antes vivía como vista propia ('onroute'); ahora es un overlay sobre TodayPage.
 */
export function OnRouteMode({ tripId, dayId, onClose }: Props) {
  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId))
  const setStopVisitStatus = useAppStore((s) => s.setStopVisitStatus)
  const deferStopToLater = useAppStore((s) => s.deferStopToLater)
  const chaosReplan = useAppStore((s) => s.chaosReplan)
  const addSuggestedToDay = useAppStore((s) => s.addSuggestedToDay)
  const [hours, setHours] = useState<PlaceHours | null>(null)
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [pack, setPack] = useState<OfflineDayPack | null>(() => loadOfflineDay())
  const [tiredOpen, setTiredOpen] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const day = trip?.days.find((d) => d.id === dayId)

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

  useEffect(() => {
    if (trip && day) setPack(saveOfflineDay(trip, day))
  }, [trip, day])

  const ordered = useMemo(
    () => (day ? [...day.stops].sort((a, b) => a.order - b.order) : []),
    [day],
  )
  const visits = useMemo(() => ordered.filter((s) => !s.isHotel), [ordered])

  const currentIndex = useMemo(() => {
    const i = visits.findIndex((s) => (s.visitStatus ?? 'pending') === 'pending')
    return i < 0 ? visits.length : i
  }, [visits])

  const current = visits[currentIndex]
  const next = visits[currentIndex + 1]
  const doneCount = visits.filter((s) => s.visitStatus === 'done').length

  useEffect(() => {
    if (!current || !online) {
      setHours(null)
      return
    }
    let cancelled = false
    void hoursForPlace(current.name, current.lat, current.lng).then((h) => {
      if (!cancelled) setHours(h)
    })
    return () => {
      cancelled = true
    }
  }, [current?.id, online])

  if (!trip || !day) {
    return (
      <div className="ui-onroute-overlay">
        <p>Día no encontrado.</p>
        <button type="button" className="btn" onClick={onClose}>
          Volver
        </button>
      </div>
    )
  }

  const remaining = current
    ? ordered.filter((s) => {
        if (s.isHotel && s.notes === 'end') return true
        if (s.isHotel) return false
        const st = s.visitStatus ?? 'pending'
        return st === 'pending' || s.id === current.id
      })
    : []
  const dayDone = !current && visits.length > 0

  return (
    <div className="ui-sheet-backdrop" role="presentation">
      <div className="ui-onroute-overlay" role="dialog" aria-label="Modo en ruta">
        <OfflineStatusBanner online={online} pack={pack} />

        <button type="button" className="btn ghost sm back" onClick={onClose}>
          <Icon name="close" size={15} /> Salir del modo en ruta
        </button>

        <header className="day-hero compact">
          <h1>{day.label}</h1>
          <p className="muted">
            {doneCount}/{visits.length} hechas
          </p>
        </header>

        {dayDone ? (
          <div className="now-card">
            <h2>Listo por hoy</h2>
            <button type="button" className="btn primary" onClick={onClose}>
              Volver al plan
            </button>
          </div>
        ) : current ? (
          <>
            <div className="now-card big">
              {current.suggestedTime ? (
                <span className="tl-time">{current.suggestedTime}</span>
              ) : (
                <span className="muted tiny">Ahora</span>
              )}
              <h2>{current.name}</h2>
              <p className="muted">{CATEGORY_LABELS[current.category]}</p>
              {hours && <p className={`hours-line ${hours.status}`}>{hours.label}</p>}
              {current.userNotes && <p className="stop-tip">{current.userNotes}</p>}

              {next && (
                <div className="tl-leg onroute-leg">
                  <span>
                    Siguiente: {next.name}
                    {current.transitMode ? ` · ${TRANSIT_MODE_LABELS[current.transitMode]}` : ''}
                    {current.minutesToNext != null ? ` · ~${current.minutesToNext} min` : ''}
                  </span>
                  <a
                    className="btn ghost sm"
                    href={googleMapsTransitLegUrl(
                      current,
                      next,
                      travelModeForTransit(current.transitMode),
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Cómo llego
                  </a>
                </div>
              )}

              <div className="onroute-cta">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setStopVisitStatus(tripId, dayId, current.id, 'done')}
                >
                  Hecho
                </button>
                <button
                  type="button"
                  className="btn tired-btn"
                  onClick={() => {
                    chaosReplan(tripId, dayId, 'shorter')
                    setTiredOpen(true)
                    setFlash('Día acortado. Café cerca abajo.')
                  }}
                >
                  Cansados
                </button>
                <a
                  className="btn ghost"
                  href={googleMapsPlaceUrl(current.lat, current.lng, current.name)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Maps
                </a>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => deferStopToLater(tripId, dayId, current.id)}
                >
                  Otro día
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setStopVisitStatus(tripId, dayId, current.id, 'skipped')}
                >
                  Saltar
                </button>
              </div>
            </div>

            {flash && <p className="flash-msg">{flash}</p>}

            {tiredOpen && trip && (
              <TiredPanel
                lat={current.lat}
                lng={current.lng}
                city={trip.city.name}
                tripCafes={trip.places.filter((p) => p.category === 'cafe')}
                onClose={() => setTiredOpen(false)}
                onAddCafe={(place) => {
                  addSuggestedToDay(tripId, dayId, place)
                  setFlash(`Café: ${place.name}`)
                  setTiredOpen(false)
                }}
              />
            )}

            <div className="chaos-bar day-quick">
              <button type="button" className="chip" onClick={() => chaosReplan(tripId, dayId, 'late')}>
                Vamos tarde
              </button>
              <button type="button" className="chip" onClick={() => chaosReplan(tripId, dayId, 'rain')}>
                Llueve
              </button>
              <a
                className="chip"
                href={googleMapsDirectionsUrl(remaining.length ? remaining : ordered)}
                target="_blank"
                rel="noreferrer"
              >
                Resto en Maps
              </a>
            </div>

            <ol className="checkin-list compact">
              {visits.map((s) => {
                const st = s.visitStatus ?? 'pending'
                return (
                  <li key={s.id} className={`checkin-item ${st}${s.id === current.id ? ' current' : ''}`}>
                    <span className="checkin-mark">
                      {st === 'done' ? '✓' : st === 'skipped' ? '–' : s.id === current.id ? '●' : '○'}
                    </span>
                    <span>
                      {s.suggestedTime ? `${s.suggestedTime} · ` : ''}
                      {s.name}
                    </span>
                  </li>
                )
              })}
            </ol>

            <TripMap stops={remaining.length ? remaining : [current]} height="200px" showLegs />
          </>
        ) : (
          <p>No hay paradas en este día.</p>
        )}
      </div>
    </div>
  )
}
