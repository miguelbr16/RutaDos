import { useState } from 'react'
import {
  CATEGORY_LABELS,
  TRANSIT_MODE_LABELS,
  type Stop,
  type TransitMode,
} from '../types'
import { googleMapsPlaceUrl, googleMapsTransitLegUrl, travelModeForTransit } from '../lib/mapsUrl'
import type { PlaceHours } from '../lib/openingHours'

type Props = {
  stops: Stop[]
  photoByStop: Record<string, string[]>
  hoursByStop: Record<string, PlaceHours>
  onModeChange: (stopId: string, mode: TransitMode) => void
  onMove: (stopId: string, dir: -1 | 1) => void
  onRemove: (stopId: string) => void
  onNotes: (stopId: string, notes: string) => void
  onLike: (stopId: string) => void
  onDislike: (stopId: string) => void
  onDefer: (stopId: string) => void
}

export function DayTimeline({
  stops,
  photoByStop,
  hoursByStop,
  onModeChange,
  onMove,
  onRemove,
  onNotes,
  onLike,
  onDislike,
  onDefer,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

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

              {next && !stop.isHotel && (
                <div className="tl-leg">
                  <span className="tl-leg-mode">
                    {stop.transitMode
                      ? TRANSIT_MODE_LABELS[stop.transitMode]
                      : 'Transporte'}
                    {stop.minutesToNext != null ? ` · ~${stop.minutesToNext} min` : ''}
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

              {open && (
                <div className="tl-details">
                  {stop.notes && stop.notes !== 'start' && stop.notes !== 'end' ? (
                    <p className="stop-tip">{stop.notes}</p>
                  ) : null}
                  {stop.transportReason ? (
                    <p className="muted tiny">{stop.transportReason}</p>
                  ) : null}

                  {!stop.isHotel && (
                    <label className="stop-user-notes">
                      <span className="muted tiny">Nota / reserva</span>
                      <input
                        value={stop.userNotes ?? ''}
                        placeholder="Reserva 14:00, tip…"
                        onChange={(e) => onNotes(stop.id, e.target.value)}
                      />
                    </label>
                  )}

                  {next && (
                    <label className="field compact">
                      <span className="muted tiny">Modo al siguiente</span>
                      <select
                        className="mode-select"
                        value={stop.transitMode || 'walk'}
                        onChange={(e) => onModeChange(stop.id, e.target.value as TransitMode)}
                      >
                        {(Object.keys(TRANSIT_MODE_LABELS) as TransitMode[]).map((m) => (
                          <option key={m} value={m}>
                            {TRANSIT_MODE_LABELS[m]}
                          </option>
                        ))}
                      </select>
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
                    <button type="button" className="btn ghost sm" onClick={() => onMove(stop.id, -1)}>
                      ↑
                    </button>
                    <button type="button" className="btn ghost sm" onClick={() => onMove(stop.id, 1)}>
                      ↓
                    </button>
                    {!stop.isHotel && (
                      <>
                        <button type="button" className="btn ghost sm" onClick={() => onLike(stop.id)}>
                          Me gusta
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => onDislike(stop.id)}
                        >
                          No
                        </button>
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
