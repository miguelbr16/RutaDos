import { useEffect, useMemo, useState } from 'react'
import {
  CATEGORY_LABELS,
  DAY_FOCUS_LABELS,
  SLOT_LABELS,
  TRANSIT_MODE_LABELS,
  type DayFocus,
  type GeoPlace,
  type TimeSlot,
  type TransitMode,
} from '../types'
import { useAppStore } from '../store'
import { TripMap } from '../components/TripMap'
import { filterAlongRoute } from '../lib/discover'
import {
  fetchWalkingRoute,
  googleMapsDirectionsUrl,
  googleMapsPlaceUrl,
  googleMapsTransitLegUrl,
  travelModeForTransit,
} from '../lib/mapsUrl'
import { geocodeCity } from '../lib/geocode'
import {
  dayToKml,
  downloadTextFile,
  GOOGLE_MY_MAPS_URL,
  safeFilename,
} from '../lib/exportGmaps'
import { fetchPlacePhotoUrls } from '../lib/placePhotos'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function DayPage({ tripId, dayId }: { tripId: string; dayId: string }) {
  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId))
  const setView = useAppStore((s) => s.setView)
  const optimizeDay = useAppStore((s) => s.optimizeDay)
  const moveDayStop = useAppStore((s) => s.moveDayStop)
  const removeDayStop = useAppStore((s) => s.removeDayStop)
  const addManualPlaceToDay = useAppStore((s) => s.addManualPlaceToDay)
  const addSuggestedToDay = useAppStore((s) => s.addSuggestedToDay)
  const setDayFocus = useAppStore((s) => s.setDayFocus)
  const setStopTransitMode = useAppStore((s) => s.setStopTransitMode)
  const setStopUserNotes = useAppStore((s) => s.setStopUserNotes)
  const setStopReaction = useAppStore((s) => s.setStopReaction)
  const deferStopToLater = useAppStore((s) => s.deferStopToLater)
  const addDeferredToDay = useAppStore((s) => s.addDeferredToDay)
  const chaosReplan = useAppStore((s) => s.chaosReplan)

  const [route, setRoute] = useState<{ lat: number; lng: number }[] | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualQuery, setManualQuery] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [photoByStop, setPhotoByStop] = useState<Record<string, string[]>>({})

  const day = trip?.days.find((d) => d.id === dayId)

  useEffect(() => {
    if (!day?.stops.length) {
      setRoute(null)
      return
    }
    let cancelled = false
    void fetchWalkingRoute(day.stops).then((r) => {
      if (!cancelled) setRoute(r)
    })
    return () => {
      cancelled = true
    }
  }, [day?.stops])

  useEffect(() => {
    if (!day?.stops.length) return
    let cancelled = false
    void (async () => {
      const next: Record<string, string[]> = {}
      for (const s of day.stops.slice(0, 14)) {
        if (s.isHotel) continue
        if (s.photoUrls?.length) {
          next[s.id] = s.photoUrls
          continue
        }
        if (s.photoUrl) {
          next[s.id] = [s.photoUrl]
          continue
        }
        const urls = await fetchPlacePhotoUrls(s.name, s.lat, s.lng, 3)
        if (urls.length) next[s.id] = urls
      }
      if (!cancelled) setPhotoByStop(next)
    })()
    return () => {
      cancelled = true
    }
  }, [day?.id, day?.stops])

  const usedIds = useMemo(() => new Set(day?.stops.map((s) => s.placeId) ?? []), [day?.stops])

  const suggestions: GeoPlace[] = useMemo(() => {
    if (!trip || !day) return []
    const pool = trip.places.filter((p) => !usedIds.has(p.id) && p.category !== 'nightlife')
    if (!pool.length) return []

    const deferred = pool.filter((p) => p.deferred)
    const rest = pool.filter((p) => !p.deferred)

    const anchor =
      day.stops.length > 0
        ? {
            lat: day.stops.reduce((s, x) => s + x.lat, 0) / day.stops.length,
            lng: day.stops.reduce((s, x) => s + x.lng, 0) / day.stops.length,
          }
        : trip.logistics?.hotel
          ? { lat: trip.logistics.hotel.lat, lng: trip.logistics.hotel.lng }
          : { lat: trip.city.lat, lng: trip.city.lng }

    const near = rest
      .map((p) => ({ p, d: haversineKm(anchor.lat, anchor.lng, p.lat, p.lng) }))
      .filter((x) => x.d <= 4.5)
      .sort((a, b) => a.d - b.d || b.p.score - a.p.score)
      .map((x) => x.p)

    const corridorKm = Math.min(0.8, 0.25 + trip.routeStyle.detourMinutes / 120)
    const along =
      trip.routeStyle.detours && route && route.length > 1
        ? filterAlongRoute(rest, route, corridorKm, 8)
        : []

    const seen = new Set<string>()
    const out: GeoPlace[] = []
    for (const p of [
      ...deferred,
      ...along,
      ...near,
      ...rest.sort((a, b) => b.score - a.score),
    ]) {
      if (seen.has(p.id)) continue
      seen.add(p.id)
      out.push(p)
      if (out.length >= 14) break
    }
    return out
  }, [trip, day, usedIds, route])

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

  const ordered = [...day.stops].sort((a, b) => a.order - b.order)
  const mapStops = ordered.map((s) => {
    const urls = photoByStop[s.id]
    if (!urls?.length) return s
    return { ...s, photoUrl: urls[0], photoUrls: urls }
  })

  async function submitManual(e: React.FormEvent) {
    e.preventDefault()
    if (!manualName.trim()) return
    setBusy(true)
    setMsg(null)
    try {
      const q = manualQuery.trim() || `${manualName.trim()}, ${trip!.city.name}`
      const geo = await geocodeCity(q)
      addManualPlaceToDay(tripId, dayId, {
        name: manualName.trim(),
        lat: geo.lat,
        lng: geo.lng,
        notes: manualNotes.trim() || undefined,
      })
      setManualOpen(false)
      setManualName('')
      setManualQuery('')
      setManualNotes('')
      setMsg('Sitio añadido. Pulsá «Optimizar orden» para reordenar y actualizar horas.')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se pudo geocodificar')
    } finally {
      setBusy(false)
    }
  }

  let lastSlot: TimeSlot | undefined

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
        <h1>{day.label}</h1>
        <p className="muted">
          {ordered.length} paradas
          {day.intensity === 'arrival'
            ? ' · llegada'
            : day.intensity === 'departure'
              ? ' · salida'
              : ' · día completo'}
        </p>
        {day.note && <p className="day-note">{day.note}</p>}
        {trip.logistics?.hotel && <p className="muted">Base: {trip.logistics.hotel.name} (ida y vuelta)</p>}
      </header>

      <TripMap stops={mapStops} route={route} height="220px" showLegend showLegs />

      <div className="field" style={{ marginTop: '0.75rem' }}>
        <span>Enfoque del día</span>
        <div className="chips">
          {(['central', 'mixed', 'outskirts'] as DayFocus[]).map((f) => (
            <button
              key={f}
              type="button"
              className={(day.focus ?? 'central') === f ? 'chip on' : 'chip'}
              onClick={() => setDayFocus(tripId, dayId, f)}
            >
              {DAY_FOCUS_LABELS[f]}
            </button>
          ))}
        </div>
        <p className="muted tiny">
          Al cambiar el enfoque se rehace el plan del día (centro vs afueras). Las notas vuestras se
          pierden en paradas que se sustituyen.
        </p>
      </div>

      <div className="toolbar">
        <a
          className="btn primary sm"
          href={googleMapsDirectionsUrl(ordered)}
          target="_blank"
          rel="noreferrer"
        >
          Abrir día en Maps
        </a>
        <button
          type="button"
          className="btn primary sm"
          onClick={() => setView({ name: 'onroute', tripId, dayId })}
        >
          Check-in / En ruta
        </button>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setView({ name: 'copilot', tripId, dayId })}
        >
          Copiloto
        </button>
        <button type="button" className="btn ghost sm" onClick={() => optimizeDay(tripId, dayId)}>
          Optimizar orden
        </button>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setView({ name: 'build', tripId, dayId })}
        >
          Armar nosotros
        </button>
        <button type="button" className="btn ghost sm" onClick={() => setManualOpen((v) => !v)}>
          + Sitio manual
        </button>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => {
            downloadTextFile(
              `${safeFilename(trip.title)}_${safeFilename(day.label)}.kml`,
              dayToKml(trip.title, day.label, ordered),
              'application/vnd.google-earth.kml+xml',
            )
            setMsg(
              `KML del día descargado. Importalo en My Maps (${GOOGLE_MY_MAPS_URL.replace('https://', '')}).`,
            )
          }}
        >
          Este día → My Maps
        </button>
      </div>

      <div className="chaos-bar">
        <span className="muted tiny">Si el plan se tuerce:</span>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => {
            chaosReplan(tripId, dayId, 'late')
            setMsg('Replan: vais tarde — menos paradas desde media tarde.')
          }}
        >
          Vamos tarde
        </button>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => {
            chaosReplan(tripId, dayId, 'rain')
            setMsg('Replan: lluvia — priorizamos sitios cubiertos.')
          }}
        >
          Llueve
        </button>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => {
            chaosReplan(tripId, dayId, 'shorter')
            setMsg('Replan: día más ligero.')
          }}
        >
          Día más corto
        </button>
      </div>
      <p className="muted tiny">
        «Abrir día en Maps» lleva la ruta ordenada. Check-in marca hecho / para otro día. El replan
        conserva lo ya marcado como hecho.
      </p>

      {manualOpen && (
        <form className="panel" onSubmit={(e) => void submitManual(e)}>
          <h3>Añadir sitio manual</h3>
          <label className="field">
            <span>Nombre</span>
            <input value={manualName} onChange={(e) => setManualName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Buscar en el mapa</span>
            <input
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder={`Ej. British Museum, ${trip.city.name}`}
            />
          </label>
          <label className="field">
            <span>Notas</span>
            <input value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} />
          </label>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Buscando…' : 'Añadir a este día'}
          </button>
        </form>
      )}

      {msg && <p className="muted">{msg}</p>}

      <section className="section">
        <h2>Plan del día</h2>
        <ol className="stop-list">
          {ordered.map((stop, i) => {
            const showSlot = stop.slot && stop.slot !== lastSlot
            if (stop.slot) lastSlot = stop.slot
            const next = ordered[i + 1]
            return (
              <li key={stop.id} className="stop-item">
                {showSlot && stop.slot && (
                  <div className="slot-banner">{SLOT_LABELS[stop.slot]}</div>
                )}
                <div className="stop-row">
                  <div className="stop-main">
                    {photoByStop[stop.id]?.[0] || stop.photoUrl ? (
                      <img
                        className="stop-photo"
                        src={photoByStop[stop.id]?.[0] || stop.photoUrl}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span className="num">{i + 1}</span>
                    )}
                    <div>
                      <strong>
                        {stop.suggestedTime ? `${stop.suggestedTime} · ` : ''}
                        {stop.name}
                      </strong>
                      <div className="muted">
                        {stop.isHotel ? 'Hotel' : CATEGORY_LABELS[stop.category]}
                        {stop.sponsored ? ' · partner' : ''}
                      </div>
                      {stop.notes && stop.notes !== 'start' && stop.notes !== 'end' ? (
                        <p className="stop-tip">{stop.notes}</p>
                      ) : null}
                      {!stop.isHotel && (
                        <label className="stop-user-notes">
                          <span className="muted tiny">Vuestra nota</span>
                          <input
                            value={stop.userNotes ?? ''}
                            placeholder="Reserva, tip, cerrado…"
                            onChange={(e) =>
                              setStopUserNotes(tripId, dayId, stop.id, e.target.value)
                            }
                          />
                        </label>
                      )}
                      {!stop.isHotel && (
                        <div className="row gap wrap" style={{ marginTop: '0.35rem' }}>
                          <button
                            type="button"
                            className={`chip ${stop.reaction === 'like' ? 'on' : ''}`}
                            onClick={() =>
                              setStopReaction(
                                tripId,
                                dayId,
                                stop.id,
                                stop.reaction === 'like' ? null : 'like',
                              )
                            }
                          >
                            Me gusta
                          </button>
                          <button
                            type="button"
                            className={`chip ${stop.reaction === 'dislike' ? 'on' : ''}`}
                            onClick={() =>
                              setStopReaction(
                                tripId,
                                dayId,
                                stop.id,
                                stop.reaction === 'dislike' ? null : 'dislike',
                              )
                            }
                          >
                            No quiero
                          </button>
                          <button
                            type="button"
                            className="chip"
                            onClick={() => {
                              deferStopToLater(tripId, dayId, stop.id)
                              setMsg(`“${stop.name}” queda para otro día.`)
                            }}
                          >
                            Otro día
                          </button>
                          {(stop.visitStatus === 'done' || stop.visitStatus === 'skipped') && (
                            <span className="muted tiny">
                              {stop.visitStatus === 'done' ? 'Hecho' : 'Saltado'}
                            </span>
                          )}
                        </div>
                      )}
                      {next && (
                        <div className="leg">
                          <div className="mode-row">
                            <span>→</span>
                            <select
                              className="mode-select"
                              value={stop.transitMode || 'walk'}
                              onChange={(e) =>
                                setStopTransitMode(
                                  tripId,
                                  dayId,
                                  stop.id,
                                  e.target.value as TransitMode,
                                )
                              }
                              aria-label="Modo de transporte"
                            >
                              {(Object.keys(TRANSIT_MODE_LABELS) as TransitMode[]).map((m) => (
                                <option key={m} value={m}>
                                  {TRANSIT_MODE_LABELS[m]}
                                </option>
                              ))}
                            </select>
                            {stop.minutesToNext != null ? (
                              <span className="muted">~{stop.minutesToNext} min</span>
                            ) : null}
                          </div>
                          {stop.transportReason ? (
                            <span className="reason">{stop.transportReason}</span>
                          ) : null}
                          {(stop.transitMode === 'metro' ||
                            stop.transitMode === 'bus' ||
                            stop.transitMode === 'train' ||
                            stop.transportToNext === 'transit') && (
                            <div>
                              <a
                                className="transit-link"
                                href={googleMapsTransitLegUrl(
                                  stop,
                                  next,
                                  travelModeForTransit(stop.transitMode),
                                )}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Ver línea / horario en Maps
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="stop-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Subir"
                      onClick={() => moveDayStop(tripId, dayId, stop.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Bajar"
                      onClick={() => moveDayStop(tripId, dayId, stop.id, 1)}
                    >
                      ↓
                    </button>
                    <a
                      className="icon-btn"
                      href={googleMapsPlaceUrl(stop.lat, stop.lng, stop.name)}
                      target="_blank"
                      rel="noreferrer"
                      title="Maps"
                    >
                      ↗
                    </a>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label="Quitar"
                      onClick={() => removeDayStop(tripId, dayId, stop.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="section">
        <h2>Más recomendaciones</h2>
        <p className="muted">
          Primero salen sitios pospuestos de otro día. Tocá para añadir.
        </p>
        <ul className="suggest-list">
          {suggestions.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="suggest-item"
                onClick={() => {
                  if (p.deferred) addDeferredToDay(tripId, dayId, p.id)
                  else addSuggestedToDay(tripId, dayId, p)
                  setMsg(
                    p.deferred
                      ? 'Añadido el sitio que habíais dejado para otro día.'
                      : 'Añadido. Podés optimizar el orden para actualizar horas.',
                  )
                }}
              >
                <span className="cat">{CATEGORY_LABELS[p.category]}</span>
                <strong>
                  {p.deferred ? '↻ ' : ''}
                  {p.name}
                </strong>
                <span className="add">{p.deferred ? 'Recuperar' : 'Añadir'}</span>
              </button>
            </li>
          ))}
          {!suggestions.length && (
            <p className="muted">
              No quedan sugerencias libres en la wishlist. Importá sitios o añadí uno manual.
            </p>
          )}
        </ul>
      </section>
    </div>
  )
}
