import { useMemo, useState } from 'react'
import { CATEGORY_LABELS, TRANSPORT_LABELS } from '../types'
import { useAppStore } from '../store'
import { TripMap } from '../components/TripMap'
import { googleMapsDirectionsUrl, googleMapsPlaceUrl } from '../lib/mapsUrl'

export function OnRoutePage({ tripId, dayId }: { tripId: string; dayId: string }) {
  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId))
  const setView = useAppStore((s) => s.setView)
  const [index, setIndex] = useState(0)

  const day = trip?.days.find((d) => d.id === dayId)
  const ordered = useMemo(
    () => (day ? [...day.stops].sort((a, b) => a.order - b.order) : []),
    [day],
  )

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

  const current = ordered[Math.min(index, Math.max(0, ordered.length - 1))]
  const remaining = ordered.slice(index)

  return (
    <div className="page onroute">
      <button
        type="button"
        className="btn ghost sm back"
        onClick={() => setView({ name: 'day', tripId, dayId })}
      >
        ← Editar día
      </button>

      <p className="brand small">En ruta · {trip.title}</p>
      <h1>{day.label}</h1>

      {current ? (
        <>
          <div className="now-card">
            <span className="muted">
              Parada {index + 1} de {ordered.length}
              {current.suggestedTime ? ` · ~${current.suggestedTime}` : ''}
            </span>
            <h2>{current.name}</h2>
            <p className="muted">{CATEGORY_LABELS[current.category]}</p>
            {current.transportToNext && (
              <p className="leg">
                Siguiente: {TRANSPORT_LABELS[current.transportToNext]}
                {current.minutesToNext != null ? ` · ~${current.minutesToNext} min` : ''}
                {current.transportReason ? ` — ${current.transportReason}` : ''}
              </p>
            )}
            <div className="row gap wrap">
              <a
                className="btn primary"
                href={googleMapsPlaceUrl(current.lat, current.lng, current.name)}
                target="_blank"
                rel="noreferrer"
              >
                Navegar aquí
              </a>
              <a
                className="btn ghost"
                href={googleMapsDirectionsUrl(remaining)}
                target="_blank"
                rel="noreferrer"
              >
                Ruta restante en Maps
              </a>
            </div>
            <div className="row gap">
              <button
                type="button"
                className="btn ghost"
                disabled={index <= 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={index >= ordered.length - 1}
                onClick={() => setIndex((i) => Math.min(ordered.length - 1, i + 1))}
              >
                Siguiente parada
              </button>
            </div>
          </div>

          <TripMap stops={remaining} height="260px" />
        </>
      ) : (
        <p>No hay paradas en este día.</p>
      )}
    </div>
  )
}
