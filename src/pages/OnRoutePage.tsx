import { useEffect, useMemo, useState } from 'react'
import { CATEGORY_LABELS, TRANSIT_MODE_LABELS } from '../types'
import { useAppStore } from '../store'
import { TripMap } from '../components/TripMap'
import { OfflineStatusBanner } from '../components/OfflineBanner'
import {
  googleMapsDirectionsUrl,
  googleMapsPlaceUrl,
  googleMapsTransitLegUrl,
  travelModeForTransit,
} from '../lib/mapsUrl'
import { loadOfflineDay, saveOfflineDay, type OfflineDayPack } from '../lib/offlineDay'
import { hoursForPlace, type PlaceHours } from '../lib/openingHours'
import { TiredPanel } from '../components/TiredPanel'

export function OnRoutePage({ tripId, dayId }: { tripId: string; dayId: string }) {
  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId))
  const setView = useAppStore((s) => s.setView)
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
      <div className="page">
        <p>Día no encontrado.</p>
        <button type="button" className="btn" onClick={() => setView({ name: 'home' })}>
          Inicio
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
    <div className="page onroute">
      <OfflineStatusBanner online={online} pack={pack} />

      <button
        type="button"
        className="btn ghost sm back"
        onClick={() => setView({ name: 'day', tripId, dayId })}
      >
        ← Plan del día
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
          <button
            type="button"
            className="btn primary"
            onClick={() => setView({ name: 'day', tripId, dayId })}
          >
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
            <button
              type="button"
              className="chip"
              onClick={() => chaosReplan(tripId, dayId, 'late')}
            >
              Vamos tarde
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => chaosReplan(tripId, dayId, 'rain')}
            >
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
                <li
                  key={s.id}
                  className={`checkin-item ${st}${s.id === current.id ? ' current' : ''}`}
                >
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
  )
}
