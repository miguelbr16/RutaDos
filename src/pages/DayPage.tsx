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
import { fetchDayWeather, weatherSuggestsIndoor, type DayWeather } from '../lib/weather'
import { VenueFinder } from '../components/VenueFinder'
import { TiredPanel } from '../components/TiredPanel'
import type { VenueKind } from '../lib/bookingLinks'
import type { NearbyVenue } from '../lib/nearbyVenues'
import { hotelBookingUrl } from '../lib/bookingLinks'
import { getCityGuide } from '../lib/cityGuides'
import { Icon } from '../components/Icons'

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
  const deferStopToLater = useAppStore((s) => s.deferStopToLater)
  const addDeferredToDay = useAppStore((s) => s.addDeferredToDay)
  const chaosReplan = useAppStore((s) => s.chaosReplan)

  const [route, setRoute] = useState<{ lat: number; lng: number }[] | null>(null)
  const [manualName, setManualName] = useState('')
  const [manualQuery, setManualQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [photoByStop, setPhotoByStop] = useState<Record<string, string[]>>({})
  const [hoursByStop, setHoursByStop] = useState<Record<string, PlaceHours>>({})
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [offlinePack, setOfflinePack] = useState<OfflineDayPack | null>(() => loadOfflineDay())
  const [packPreview, setPackPreview] = useState(false)
  const [weather, setWeather] = useState<DayWeather | null>(null)
  const [venueKind, setVenueKind] = useState<VenueKind | null>(null)
  const [mealNear, setMealNear] = useState<{
    lat: number
    lng: number
    meal: 'lunch' | 'dinner'
    nearName: string
  } | null>(null)
  const [tiredOpen, setTiredOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)

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
    if (!trip || !day || !online) {
      setWeather(null)
      return
    }
    let cancelled = false
    void fetchDayWeather(trip.city.lat, trip.city.lng, day.date).then((w) => {
      if (!cancelled) setWeather(w)
    })
    return () => {
      cancelled = true
    }
  }, [trip?.city.lat, trip?.city.lng, day?.date, online])

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
      })
      setManualName('')
      setManualQuery('')
      setMsg('Añadido al plan.')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se pudo geocodificar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page day-page day-yogo">
      <OfflineStatusBanner online={online} pack={offlinePack} />

      <button
        type="button"
        className="btn ghost sm back"
        onClick={() => setView({ name: 'trip', tripId })}
      >
        ← {trip.title}
      </button>

      <div className="day-yogo-map">
        <TripMap stops={mapStops} route={route} height="340px" showLegend showLegs />
        {weather && (
          <div className="day-yogo-weather">
            <strong>
              {weather.label} · {weather.tempMin}–{weather.tempMax}°
            </strong>
            {weatherSuggestsIndoor(weather.code) ? (
              <button
                type="button"
                className="chip on"
                onClick={() => {
                  chaosReplan(tripId, dayId, 'rain')
                  setMsg('Replan por lluvia: priorizamos sitios cubiertos.')
                }}
              >
                Adaptar a lluvia
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="day-yogo-sheet">
        <header className="day-hero day-yogo-head">
          <div className="day-yogo-title-row">
            <div>
              <h1>{day.label}</h1>
              <p className="muted">
                {ordered.filter((s) => !s.isHotel).length} paradas
                {day.intensity === 'arrival'
                  ? ' · llegada'
                  : day.intensity === 'departure'
                    ? ' · salida'
                    : ''}
              </p>
            </div>
            <button
              type="button"
              className="btn tired-btn sm"
              onClick={() => {
                chaosReplan(tripId, dayId, 'shorter')
                setTiredOpen(true)
                setVenueKind(null)
                setMsg('Día acortado. Elegí un café si querés pausar.')
              }}
            >
              Cansados
            </button>
          </div>
        </header>

      <div className="chaos-bar day-quick">
        <button
          type="button"
          className={venueKind === 'restaurant' && !mealNear ? 'chip on' : 'chip'}
          onClick={() => {
            setTiredOpen(false)
            setMealNear(null)
            setVenueKind((k) => (k === 'restaurant' ? null : 'restaurant'))
          }}
        >
          Restaurantes
        </button>
        <button
          type="button"
          className={venueKind === 'hotel' ? 'chip on' : 'chip'}
          onClick={() => {
            setTiredOpen(false)
            setMealNear(null)
            setVenueKind((k) => (k === 'hotel' ? null : 'hotel'))
          }}
        >
          Hoteles
        </button>
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
            if (trip && day) {
              setOfflinePack(saveOfflineDay(trip, day))
              setPackPreview((v) => !v)
            }
          }}
        >
          Offline
        </button>
        <button
          type="button"
          className={adjustOpen ? 'chip on' : 'chip'}
          onClick={() => setAdjustOpen((v) => !v)}
        >
          Ajustar día {adjustOpen ? '▴' : '▾'}
        </button>
      </div>

      {tiredOpen && (
        <TiredPanel
          lat={trip.logistics?.hotel?.lat ?? trip.city.lat}
          lng={trip.logistics?.hotel?.lng ?? trip.city.lng}
          city={trip.city.name}
          tripCafes={trip.places.filter((p) => p.category === 'cafe')}
          onClose={() => setTiredOpen(false)}
          onAddCafe={(place) => {
            addSuggestedToDay(tripId, dayId, place)
            setMsg(`Café añadido: ${place.name}`)
            setTiredOpen(false)
          }}
        />
      )}

      {(venueKind || mealNear) && (
        <VenueFinder
          kind={venueKind ?? 'restaurant'}
          lat={mealNear?.lat ?? trip.logistics?.hotel?.lat ?? trip.city.lat}
          lng={mealNear?.lng ?? trip.logistics?.hotel?.lng ?? trip.city.lng}
          city={trip.city.name}
          nearLabel={
            mealNear
              ? `${mealNear.meal === 'lunch' ? 'Comida' : 'Cena'} cerca de ${mealNear.nearName}`
              : undefined
          }
          onClose={() => {
            setVenueKind(null)
            setMealNear(null)
          }}
          onAdd={(v: NearbyVenue) => {
            const place: GeoPlace = {
              id: v.id,
              name: v.name,
              lat: v.lat,
              lng: v.lng,
              category: v.kind === 'hotel' ? 'custom' : 'food',
              tier: 'recommended',
              source: 'osm',
              score: 85,
              website: v.website,
              phone: v.phone,
              listingKind: v.kind === 'hotel' ? 'hotel' : 'restaurant',
              bestSlot:
                v.kind === 'hotel'
                  ? 'morning'
                  : mealNear?.meal === 'dinner'
                    ? 'evening'
                    : 'lunch',
            }
            addSuggestedToDay(tripId, dayId, place)
            setMsg(`Añadido: ${v.name}`)
            setVenueKind(null)
            setMealNear(null)
          }}
        />
      )}

      {trip.logistics?.hotel && (
        <p className="hotel-book-row muted tiny">
          Hotel: <strong>{trip.logistics.hotel.name}</strong>{' '}
          <a
            href={hotelBookingUrl({
              name: trip.logistics.hotel.name,
              city: trip.city.name,
              lat: trip.logistics.hotel.lat,
              lng: trip.logistics.hotel.lng,
            })}
            target="_blank"
            rel="noreferrer"
          >
            Ver en Booking
          </a>
        </p>
      )}

      {msg && <p className="flash-msg">{msg}</p>}
      {packPreview && offlinePack && <OfflinePackPreview pack={offlinePack} />}

      {adjustOpen && (
        <section className="section adjust-day-panel" id="ajustar-dia">
          <h2>Ajustar día</h2>
          <p className="muted tiny">Sugerencias, enfoque y exportar.</p>

          <ul className="suggest-list">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="suggest-item"
                  onClick={() => {
                    if (p.deferred) addDeferredToDay(tripId, dayId, p.id)
                    else addSuggestedToDay(tripId, dayId, p)
                    setMsg(`Añadido: ${p.name}`)
                  }}
                >
                  <span className="cat">{CATEGORY_LABELS[p.category]}</span>
                  <strong>
                    {p.deferred ? '↻ ' : ''}
                    {p.name}
                  </strong>
                  <span className="add">↑</span>
                </button>
              </li>
            ))}
            {!suggestions.length && <p className="muted">No hay más sugerencias cerca.</p>}
          </ul>

          <div className="chips" style={{ marginTop: '0.75rem' }}>
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
          <button
            type="button"
            className="btn ghost sm"
            style={{ marginTop: '0.5rem' }}
            onClick={() => {
              downloadTextFile(
                `${safeFilename(trip.title)}_${safeFilename(day.label)}.kml`,
                dayToKml(trip.title, day.label, ordered),
                'application/vnd.google-earth.kml+xml',
              )
              setMsg(`KML · ${GOOGLE_MY_MAPS_URL.replace('https://', '')}`)
            }}
          >
            Exportar KML
          </button>
        </section>
      )}

      <section className="section day-plan-section">
        <div className="section-head">
          <h2>Ruta del día</h2>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              optimizeDay(tripId, dayId)
              setMsg('Ruta reordenada por cercanía y horas actualizadas.')
            }}
          >
            Reordenar
          </button>
        </div>
        <p className="muted tiny">
          En cada parada: Maps, reservar, Booking. Entre sitios elegí metro, a pie o taxi.
        </p>

        <DayTimeline
          stops={ordered}
          photoByStop={photoByStop}
          hoursByStop={hoursByStop}
          onModeChange={(stopId, mode) => setStopTransitMode(tripId, dayId, stopId, mode)}
          onMove={(stopId, dir) => moveDayStop(tripId, dayId, stopId, dir)}
          onRemove={(stopId) => removeDayStop(tripId, dayId, stopId)}
          onNotes={(stopId, notes) => setStopUserNotes(tripId, dayId, stopId, notes)}
          onDefer={(stopId) => {
            const s = ordered.find((x) => x.id === stopId)
            deferStopToLater(tripId, dayId, stopId)
            if (s) setMsg(`“${s.name}” para otro día.`)
          }}
          onFindMeals={({ lat, lng, meal, nearName }) => {
            setTiredOpen(false)
            setVenueKind('restaurant')
            setMealNear({ lat, lng, meal, nearName })
            setMsg(
              meal === 'lunch'
                ? `Comida cerca de ${nearName.slice(0, 28)}`
                : `Cena cerca de ${nearName.slice(0, 28)}`,
            )
          }}
        />
      </section>

      <form className="add-bar" onSubmit={(e) => void submitManual(e)}>
        <input
          value={manualName}
          onChange={(e) => {
            setManualName(e.target.value)
            setManualQuery(e.target.value)
          }}
          placeholder="Añadir sitio (nombre)…"
          aria-label="Añadir sitio"
        />
        <button type="submit" className="btn primary sm" disabled={busy || !manualName.trim()}>
          {busy ? '…' : 'Añadir'}
        </button>
      </form>
      </div>

      <nav className="day-yogo-bar" aria-label="Acciones del día">
        <a
          href={googleMapsDirectionsUrl(ordered)}
          target="_blank"
          rel="noreferrer"
          className="day-yogo-bar-item"
        >
          <span className="day-yogo-bar-ico" aria-hidden>
            <Icon name="map" size={18} />
          </span>
          Maps
        </a>
        <a
          href={
            getCityGuide(trip.city.name)?.transportPlannerUrl ??
            `https://www.google.com/search?q=${encodeURIComponent(trip.city.name + ' metro journey planner')}`
          }
          target="_blank"
          rel="noreferrer"
          className="day-yogo-bar-item"
        >
          <span className="day-yogo-bar-ico" aria-hidden>
            <Icon name="transit" size={18} />
          </span>
          Metro
        </a>
        <button
          type="button"
          className="day-yogo-bar-item"
          onClick={() => {
            setTiredOpen(false)
            setVenueKind((k) => (k === 'restaurant' ? null : 'restaurant'))
            setMealNear(null)
          }}
        >
          <span className="day-yogo-bar-ico" aria-hidden>
            <Icon name="dining" size={18} />
          </span>
          Comer
        </button>
        <button
          type="button"
          className="day-yogo-bar-item on"
          onClick={() => setView({ name: 'onroute', tripId, dayId })}
        >
          <span className="day-yogo-bar-ico" aria-hidden>
            <Icon name="arrow-right" size={18} />
          </span>
          En ruta
        </button>
      </nav>
    </div>
  )
}
