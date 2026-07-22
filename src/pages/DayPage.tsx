import { useEffect, useMemo, useState } from 'react'
import {
  CATEGORY_LABELS,
  DAY_FOCUS_LABELS,
  type DayFocus,
  type GeoPlace,
} from '../types'
import { useAppStore } from '../store'
import { TripMap } from '../components/TripMap'
import { DayTimeline } from '../components/DayTimeline'
import { OfflinePackPreview, OfflineStatusBanner } from '../components/OfflineBanner'
import { filterAlongRoute } from '../lib/discover'
import {
  fetchWalkingRoute,
  googleMapsDirectionsUrl,
} from '../lib/mapsUrl'
import { geocodeCity } from '../lib/geocode'
import {
  dayToKml,
  downloadTextFile,
  GOOGLE_MY_MAPS_URL,
  safeFilename,
} from '../lib/exportGmaps'
import { fetchPlacePhotoUrls } from '../lib/placePhotos'
import { hoursForPlace, evaluateOpeningHours, type PlaceHours } from '../lib/openingHours'
import { loadOfflineDay, saveOfflineDay, type OfflineDayPack } from '../lib/offlineDay'

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
  const [hoursByStop, setHoursByStop] = useState<Record<string, PlaceHours>>({})
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [offlinePack, setOfflinePack] = useState<OfflineDayPack | null>(() => loadOfflineDay())
  const [toolsOpen, setToolsOpen] = useState(false)
  const [packPreview, setPackPreview] = useState(false)

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
    if (trip && day) {
      const pack = saveOfflineDay(trip, day)
      setOfflinePack(pack)
    }
  }, [trip, day])

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

  useEffect(() => {
    if (!day?.stops.length || !online) return
    let cancelled = false
    void (async () => {
      const next: Record<string, PlaceHours> = {}
      for (const s of day.stops.slice(0, 12)) {
        if (s.isHotel) continue
        if (s.openingHours) {
          next[s.id] = evaluateOpeningHours(s.openingHours)
          continue
        }
        const h = await hoursForPlace(s.name, s.lat, s.lng)
        next[s.id] = h
      }
      if (!cancelled) setHoursByStop(next)
    })()
    return () => {
      cancelled = true
    }
  }, [day?.id, day?.stops, online])

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

  return (
    <div className="page day-page">
      <OfflineStatusBanner online={online} pack={offlinePack} />

      <button
        type="button"
        className="btn ghost sm back"
        onClick={() => setView({ name: 'trip', tripId })}
      >
        ← {trip.title}
      </button>

      <header className="day-hero">
        <p className="brand small">RutaDos</p>
        <h1>{day.label}</h1>
        <p className="muted">
          {ordered.filter((s) => !s.isHotel).length} paradas
          {day.intensity === 'arrival'
            ? ' · llegada'
            : day.intensity === 'departure'
              ? ' · salida'
              : ''}
          {trip.logistics?.hotel ? ` · ${trip.logistics.hotel.name}` : ''}
        </p>
      </header>

      <div className="day-map-wrap">
        <TripMap stops={mapStops} route={route} height="240px" showLegend showLegs />
      </div>

      <div className="day-primary-actions">
        <a
          className="btn primary"
          href={googleMapsDirectionsUrl(ordered)}
          target="_blank"
          rel="noreferrer"
        >
          Día en Maps
        </a>
        <button
          type="button"
          className="btn primary"
          onClick={() => setView({ name: 'onroute', tripId, dayId })}
        >
          En ruta
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            if (trip && day) {
              const pack = saveOfflineDay(trip, day)
              setOfflinePack(pack)
              setPackPreview(true)
              setMsg('Pack offline actualizado: transportes, horas y tramos.')
            }
          }}
        >
          Guardar offline
        </button>
      </div>

      <div className="chaos-bar day-quick">
        <button
          type="button"
          className="chip"
          onClick={() => {
            chaosReplan(tripId, dayId, 'late')
            setMsg('Replan: vais tarde.')
          }}
        >
          Vamos tarde
        </button>
        <button
          type="button"
          className="chip"
          onClick={() => {
            chaosReplan(tripId, dayId, 'rain')
            setMsg('Replan: lluvia.')
          }}
        >
          Llueve
        </button>
        <button
          type="button"
          className="chip"
          onClick={() => {
            chaosReplan(tripId, dayId, 'shorter')
            setMsg('Replan: día más corto / cansados.')
          }}
        >
          Cansados
        </button>
        <button
          type="button"
          className="chip"
          onClick={() => setView({ name: 'copilot', tripId, dayId })}
        >
          Copiloto
        </button>
      </div>

      {msg && <p className="flash-msg">{msg}</p>}

      {packPreview && offlinePack && (
        <OfflinePackPreview pack={offlinePack} />
      )}

      <section className="section day-plan-section">
        <div className="section-head">
          <h2>Plan</h2>
          <button type="button" className="btn ghost sm" onClick={() => setToolsOpen((v) => !v)}>
            {toolsOpen ? 'Ocultar opciones' : 'Más opciones'}
          </button>
        </div>

        <DayTimeline
          stops={ordered}
          photoByStop={photoByStop}
          hoursByStop={hoursByStop}
          onModeChange={(stopId, mode) => setStopTransitMode(tripId, dayId, stopId, mode)}
          onMove={(stopId, dir) => moveDayStop(tripId, dayId, stopId, dir)}
          onRemove={(stopId) => removeDayStop(tripId, dayId, stopId)}
          onNotes={(stopId, notes) => setStopUserNotes(tripId, dayId, stopId, notes)}
          onLike={(stopId) => {
            const s = ordered.find((x) => x.id === stopId)
            setStopReaction(tripId, dayId, stopId, s?.reaction === 'like' ? null : 'like')
          }}
          onDislike={(stopId) => {
            const s = ordered.find((x) => x.id === stopId)
            setStopReaction(tripId, dayId, stopId, s?.reaction === 'dislike' ? null : 'dislike')
          }}
          onDefer={(stopId) => {
            const s = ordered.find((x) => x.id === stopId)
            deferStopToLater(tripId, dayId, stopId)
            if (s) setMsg(`“${s.name}” para otro día.`)
          }}
        />
      </section>

      {toolsOpen && (
        <div className="day-tools panel">
          <div className="field">
            <span>Enfoque</span>
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
          </div>

          <div className="toolbar">
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
                setMsg(`KML descargado · My Maps: ${GOOGLE_MY_MAPS_URL.replace('https://', '')}`)
              }}
            >
              KML / My Maps
            </button>
          </div>

          {manualOpen && (
            <form className="panel nested" onSubmit={(e) => void submitManual(e)}>
              <h3>Sitio manual</h3>
              <label className="field">
                <span>Nombre</span>
                <input value={manualName} onChange={(e) => setManualName(e.target.value)} required />
              </label>
              <label className="field">
                <span>Buscar</span>
                <input
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder={`Ej. museo, ${trip.city.name}`}
                />
              </label>
              <label className="field">
                <span>Notas</span>
                <input value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} />
              </label>
              <button type="submit" className="btn primary" disabled={busy}>
                {busy ? 'Buscando…' : 'Añadir'}
              </button>
            </form>
          )}

          <section className="section">
            <h3>Más sitios</h3>
            <ul className="suggest-list">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="suggest-item"
                    onClick={() => {
                      if (p.deferred) addDeferredToDay(tripId, dayId, p.id)
                      else addSuggestedToDay(tripId, dayId, p)
                      setMsg(p.deferred ? 'Recuperado.' : 'Añadido al día.')
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
                <p className="muted">No quedan sugerencias libres.</p>
              )}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
