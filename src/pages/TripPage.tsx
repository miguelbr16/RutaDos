import { useEffect, useState } from 'react'
import { Icon } from '../components/Icons'
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_LABELS,
  TRANSIT_MODE_LABELS,
  type PreferenceKey,
  type Preferences,
  type RouteStyle,
} from '../types'
import { useAppStore } from '../store'
import { TripMap } from '../components/TripMap'
import {
  importedToPlaces,
  parseImportFile,
  parseMapsLinks,
  resolveNamedPlaces,
} from '../lib/importGmaps'
import { geocodeCity } from '../lib/geocode'
import {
  downloadTextFile,
  GOOGLE_MY_MAPS_URL,
  safeFilename,
  tripToKml,
} from '../lib/exportGmaps'
import { estimateFromTrip } from '../lib/budget'
import { createTripShareToken, shareUrlForToken } from '../lib/share'
import { isSupabaseConfigured } from '../lib/supabase'
import { googleMapsDirectionsUrl } from '../lib/mapsUrl'
import { prefsSummaryLine } from '../lib/prefPlan'
import { hotelBookingUrl, hotelCitySearchUrl } from '../lib/bookingLinks'
import { VenueFinder } from '../components/VenueFinder'
import type { VenueKind } from '../lib/bookingLinks'
import { openTelegramBot } from '../lib/copilot'
import { loadOfflineDay } from '../lib/offlineDay'
import { genericGuide, getCityGuide } from '../lib/cityGuides'
import { fetchPlacePhotoUrls } from '../lib/placePhotos'
import type { Stop } from '../types'

const STYLE_KEYS: PreferenceKey[] = [
  'museums',
  'monuments',
  'parks',
  'viewpoints',
  'restaurants',
  'cafes',
  'street_food',
  'markets',
  'hidden',
  'neighborhoods',
  'nightlife',
  'shopping',
  'shows',
  'architecture',
  'night_walks',
]

export function TripPage({ tripId }: { tripId: string }) {
  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId))
  const setView = useAppStore((s) => s.setView)
  const mergePlacesIntoTrip = useAppStore((s) => s.mergePlacesIntoTrip)
  const replanTripStyle = useAppStore((s) => s.replanTripStyle)
  const setTripHotel = useAppStore((s) => s.setTripHotel)
  const generating = useAppStore((s) => s.generating)

  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [styleOpen, setStyleOpen] = useState(false)
  const [paste, setPaste] = useState('')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shareMsg, setShareMsg] = useState<string | null>(null)
  const [shareBusy, setShareBusy] = useState(false)
  const [draftPrefs, setDraftPrefs] = useState<Preferences | null>(null)
  const [draftPace, setDraftPace] = useState<RouteStyle['pace'] | null>(null)
  const [draftExplore, setDraftExplore] = useState<RouteStyle['explore'] | null>(null)
  const [draftFood, setDraftFood] = useState<RouteStyle['foodBudget'] | null>(null)
  const [rediscover, setRediscover] = useState(true)
  const [venueKind, setVenueKind] = useState<VenueKind | null>(null)
  const [hotelBannerDismissed, setHotelBannerDismissed] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [mapStops, setMapStops] = useState<Stop[]>([])
  const [tripTab, setTripTab] = useState<'map' | 'days' | 'hotel' | 'food'>('days')
  const allStops = trip?.days.flatMap((d) => d.stops) ?? []

  useEffect(() => {
    if (!trip) return
    let cancelled = false
    const stops = allStops.slice(0, 40)
    void (async () => {
      const enriched = await Promise.all(
        stops.map(async (s) => {
          if (s.isHotel || s.photoUrl || s.photoUrls?.length) return s
          try {
            const urls = await fetchPlacePhotoUrls(s.name, s.lat, s.lng, 3)
            if (!urls.length) return s
            return { ...s, photoUrl: urls[0], photoUrls: urls }
          } catch {
            return s
          }
        }),
      )
      if (!cancelled) setMapStops(enriched)
    })()
    return () => {
      cancelled = true
    }
  }, [trip?.id, allStops.length])

  if (!trip) {
    return (
      <div className="page">
        <p>Viaje no encontrado.</p>
        <button type="button" className="btn" onClick={() => setView({ name: 'home' })}>
          Inicio
        </button>
      </div>
    )
  }

  const visitStops = allStops.filter((s) => !s.isHotel)
  const hotelSearchPoint = (() => {
    if (!visitStops.length) return { lat: trip.city.lat, lng: trip.city.lng }
    const lat = visitStops.reduce((a, s) => a + s.lat, 0) / visitStops.length
    const lng = visitStops.reduce((a, s) => a + s.lng, 0) / visitStops.length
    return { lat, lng }
  })()
  const budget = estimateFromTrip(trip)
  const offlinePack = loadOfflineDay()
  const offlineForThisTrip = offlinePack?.tripId === trip.id ? offlinePack : null
  const guide = getCityGuide(trip.city.name, trip.city.displayName) ?? genericGuide(trip.city.name)
  const showHotelSuggest = !trip.logistics?.hotel && !hotelBannerDismissed
  const bookingCityUrl = hotelCitySearchUrl({
    city: trip.city.name,
    lat: hotelSearchPoint.lat,
    lng: hotelSearchPoint.lng,
    checkin: trip.startDate,
    checkout: trip.endDate,
  })

  function exportTripJson() {
    const blob = new Blob([JSON.stringify(trip, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeFilename(trip!.title)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function onShare() {
    setShareBusy(true)
    setShareMsg(null)
    try {
      if (!isSupabaseConfigured) {
        exportTripJson()
        setShareMsg(
          'Sin Supabase no hay link web. Se descargó el viaje en JSON para compartirlo a mano.',
        )
        return
      }
      const token = await createTripShareToken(trip!)
      const url = shareUrlForToken(token)
      const tgHint = `Telegram: abrí el bot y enviad /start ${token}`
      try {
        await navigator.clipboard.writeText(url)
        setShareMsg(`Link copiado: ${url}\n${tgHint}`)
      } catch {
        setShareMsg(`Link: ${url}\n${tgHint}`)
      }
      // Abre el bot listo para enlazar el viaje
      openTelegramBot(token)
    } catch (e) {
      exportTripJson()
      setShareMsg(
        e instanceof Error
          ? `${e.message} Se descargó JSON como respaldo.`
          : 'No se pudo crear el link. Se descargó JSON.',
      )
    } finally {
      setShareBusy(false)
    }
  }

  function exportToGoogleMaps() {
    const kml = tripToKml(trip!)
    downloadTextFile(
      `${safeFilename(trip!.title)}.kml`,
      kml,
      'application/vnd.google-earth.kml+xml',
    )
    setExportOpen(true)
  }

  async function applyPoints(raw: Awaited<ReturnType<typeof parseImportFile>>) {
    const resolved = await resolveNamedPlaces(raw, trip!.city.name, async (q) => {
      const c = await geocodeCity(q)
      return { lat: c.lat, lng: c.lng, name: c.name }
    })
    const places = importedToPlaces(resolved)
    if (!places.length) throw new Error('No se importó ningún punto con coordenadas')
    mergePlacesIntoTrip(tripId, places)
    setImportMsg(`Añadidos ${places.length} sitios a la wishlist del viaje`)
    setPaste('')
  }

  async function onFile(file: File) {
    setBusy(true)
    setImportMsg(null)
    try {
      const points = await parseImportFile(file)
      await applyPoints(points)
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Error al importar')
    } finally {
      setBusy(false)
    }
  }

  async function onPaste() {
    setBusy(true)
    setImportMsg(null)
    try {
      await applyPoints(parseMapsLinks(paste))
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Error al importar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page r3-trip rd-fade">
      <div className="r3-trip-top">
        <button
          type="button"
          className="r3-trip-back"
          aria-label="Volver"
          onClick={() => setView({ name: 'home' })}
        >
          <Icon name="chevron-left" size={20} />
        </button>
        <button
          type="button"
          className={moreOpen ? 'r3-trip-opt on' : 'r3-trip-opt'}
          aria-expanded={moreOpen}
          aria-label={moreOpen ? 'Cerrar opciones' : 'Opciones'}
          onClick={() => setMoreOpen((v) => !v)}
        >
          {moreOpen ? <Icon name="close" size={18} /> : <Icon name="more" size={18} />}
        </button>
      </div>

      {moreOpen && (
        <div className="trip-more-panel" role="region" aria-label="Opciones del viaje">
          <div className="trip-more-head">
            <h2>Opciones</h2>
            <p className="muted tiny">Presupuesto, compartir y ajustar el plan.</p>
          </div>

          <div className="budget-box">
            <strong>Presupuesto orientativo</strong>
            <p>
              ~{budget.perPersonPerDayMin}–{budget.perPersonPerDayMax} €/persona/día · total ~{' '}
              {budget.totalMin}–{budget.totalMax} €/persona ({budget.nights} noches)
            </p>
            <p className="muted tiny">{budget.blurb}</p>
            <p className="prefs-driven muted tiny">
              Plan con: {prefsSummaryLine(trip.preferences, trip.routeStyle)}.
            </p>
            <button
              type="button"
              className="btn ghost sm"
              style={{ marginTop: '0.5rem' }}
              onClick={() => {
                setDraftPrefs({ ...DEFAULT_PREFERENCES, ...trip.preferences })
                setDraftPace(trip.routeStyle.pace)
                setDraftExplore(trip.routeStyle.explore)
                setDraftFood(trip.routeStyle.foodBudget)
                setStyleOpen((v) => !v)
              }}
            >
              {styleOpen ? 'Cerrar ajuste' : 'Ajustar gustos y ritmo'}
            </button>
          </div>

          {styleOpen && draftPrefs && (
            <div className="panel" style={{ marginTop: '0.75rem' }}>
              <h3>Ajustar y rearmar plan</h3>
              <div className="chip-row" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
                {STYLE_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`chip ${draftPrefs[k] ? 'on' : ''}`}
                    onClick={() => setDraftPrefs({ ...draftPrefs, [k]: !draftPrefs[k] })}
                  >
                    {PREFERENCE_LABELS[k]}
                  </button>
                ))}
              </div>
              <label className="field" style={{ marginTop: '0.75rem' }}>
                <span>Ritmo</span>
                <select
                  value={draftPace ?? trip.routeStyle.pace}
                  onChange={(e) => setDraftPace(e.target.value as RouteStyle['pace'])}
                >
                  <option value="relaxed">Tranquilo</option>
                  <option value="normal">Normal</option>
                  <option value="intense">Intenso</option>
                </select>
              </label>
              <label className="field">
                <span>Explorar</span>
                <select
                  value={draftExplore ?? trip.routeStyle.explore}
                  onChange={(e) => setDraftExplore(e.target.value as RouteStyle['explore'])}
                >
                  <option value="icons">Iconos</option>
                  <option value="mixed">Mixto</option>
                  <option value="local">Local / barrios</option>
                </select>
              </label>
              <label className="field">
                <span>Comida</span>
                <select
                  value={draftFood ?? trip.routeStyle.foodBudget}
                  onChange={(e) => setDraftFood(e.target.value as RouteStyle['foodBudget'])}
                >
                  <option value="low">Económica</option>
                  <option value="mid">Media</option>
                  <option value="high">Especial</option>
                </select>
              </label>
              <label className="check" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={rediscover}
                  onChange={(e) => setRediscover(e.target.checked)}
                />
                <span>Buscar sitios de nuevo</span>
              </label>
              <button
                type="button"
                className="btn primary"
                disabled={generating}
                style={{ marginTop: '0.75rem' }}
                onClick={() =>
                  void replanTripStyle(
                    tripId,
                    {
                      preferences: draftPrefs,
                      routeStyle: {
                        pace: draftPace ?? trip.routeStyle.pace,
                        explore: draftExplore ?? trip.routeStyle.explore,
                        foodBudget: draftFood ?? trip.routeStyle.foodBudget,
                      },
                    },
                    { rediscover },
                  ).then(() => setStyleOpen(false))
                }
              >
                {generating ? 'Rearmando…' : 'Aplicar y rearmar días'}
              </button>
            </div>
          )}

          <div className="toolbar trip-toolbar" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="btn primary sm" onClick={exportToGoogleMaps}>
              Llevar a Google Maps
            </button>
            <button
              type="button"
              className="btn ghost sm"
              disabled={shareBusy}
              onClick={() => void onShare()}
            >
              {shareBusy ? 'Compartiendo…' : 'Compartir'}
            </button>
            <button type="button" className="btn ghost sm" onClick={() => setImportOpen((v) => !v)}>
              Importar sitios
            </button>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => openTelegramBot()}
            >
              Telegram
            </button>
          </div>
          {shareMsg && <p className="muted tiny">{shareMsg}</p>}

          {exportOpen && (
            <div className="panel">
              <h3>Sitios en tu Google Maps</h3>
              <p className="muted">
                Se descargó un <strong>.kml</strong>. Importalo en{' '}
                <a href={GOOGLE_MY_MAPS_URL} target="_blank" rel="noreferrer">
                  My Maps
                </a>
                .
              </p>
              <button type="button" className="btn ghost sm" onClick={() => setExportOpen(false)}>
                Entendido
              </button>
            </div>
          )}

          {importOpen && (
            <div className="panel">
              <h3>Importar sitios</h3>
              <label className="btn ghost sm file-btn">
                Elegir archivo .kml / .geojson
                <input
                  type="file"
                  accept=".kml,.geojson,.json,.txt,application/json,application/vnd.google-earth.kml+xml,text/xml,text/plain"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void onFile(f)
                  }}
                />
              </label>
              <label className="field">
                <span>Pegar enlaces o nombres</span>
                <textarea
                  rows={4}
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder={`https://maps.app.goo.gl/xxxx`}
                />
              </label>
              <button
                type="button"
                className="btn primary"
                disabled={busy || !paste.trim()}
                onClick={() => void onPaste()}
              >
                {busy ? 'Importando…' : 'Añadir al viaje'}
              </button>
              {importMsg && <p className="muted">{importMsg}</p>}
            </div>
          )}
        </div>
      )}

      <header className="r3-trip-head">
        <h1>{trip.title}</h1>
        <p>
          {trip.startDate} → {trip.endDate}
          {trip.logistics?.hotel ? ` · ${trip.logistics.hotel.name}` : ''}
        </p>
      </header>

      <div className="r3-trip-budget">
        <span className="r3-trip-budget-label">Presupuesto orientativo</span>
        <strong>
          ~{budget.perPersonPerDayMin}–{budget.perPersonPerDayMax} €/día
        </strong>
        <span className="r3-trip-budget-sub">
          total ~{budget.totalMin}–{budget.totalMax} € · {budget.nights} noches
        </span>
      </div>

      <nav className="r3-trip-tabs" aria-label="Secciones del viaje">
        {(
          [
            { id: 'map' as const, label: 'Mapa' },
            { id: 'days' as const, label: 'Días' },
            { id: 'hotel' as const, label: 'Hotel' },
            { id: 'food' as const, label: 'Comer' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            className={tripTab === t.id ? 'on' : ''}
            onClick={() => {
              setTripTab(t.id)
              if (t.id === 'hotel') setVenueKind('hotel')
              else if (t.id === 'food') setVenueKind('restaurant')
              else setVenueKind(null)
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="r3-trip-layout">
        <div className="r3-trip-map-col">
          <div className="r3-trip-map-wrap">
            <div className="r3-trip-map-inner">
              <TripMap
                stops={mapStops.length ? mapStops : allStops.slice(0, 40)}
                height="360px"
                showLegend
              />
            </div>
          </div>
        </div>

        <div className="r3-trip-body">
          {tripTab === 'map' ? (
            <p className="muted tiny trip-map-hint">
              Tocá un pin para fotos. Cambiá a Días para el itinerario.
            </p>
          ) : tripTab === 'hotel' || tripTab === 'food' ? (
            <p className="muted tiny trip-map-hint">
              El mapa sigue visible. Acá: {tripTab === 'hotel' ? 'hoteles' : 'restaurantes'}.
            </p>
          ) : null}
          {offlineForThisTrip ? (
            <div className="offline-banner ok compact">
              <strong>Offline · {offlineForThisTrip.dayLabel}</strong>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() =>
                  setView({
                    name: 'day',
                    tripId: trip.id,
                    dayId: offlineForThisTrip.dayId,
                  })
                }
              >
                Abrir
              </button>
            </div>
          ) : null}

          <div className="trip-transit-strip rd-pill-row" aria-label="Transporte local">
            <a
              className="btn ghost sm"
              href={guide.transportPlannerUrl}
              target="_blank"
              rel="noreferrer"
            >
              Metro / bus
            </a>
            <a
              className="btn ghost sm"
              href={guide.transportTicketUrl}
              target="_blank"
              rel="noreferrer"
            >
              Billetes
            </a>
            {guide.transportMapUrl ? (
              <a
                className="btn ghost sm"
                href={guide.transportMapUrl}
                target="_blank"
                rel="noreferrer"
              >
                Mapa red
              </a>
            ) : null}
          </div>
          <p className="muted tiny trip-transit-hint">
            {guide.transportTitle}: planificar rutas, billetes y mapa oficial — no es la ruta del
            viaje.
          </p>

          {showHotelSuggest ? (
            <div className="hotel-suggest-banner">
              <div>
                <strong>¿Dónde dormir?</strong>
                <p className="muted tiny">
                  {trip.logistics?.hotelSkipped
                    ? 'Generaste el viaje sin hotel. Buscá cerca de la ruta o en Booking.'
                    : 'Aún no hay hotel en el plan. Elegí uno cerca de la ruta o en Booking.'}
                </p>
              </div>
              <div className="hotel-suggest-actions">
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => {
                    setTripTab('hotel')
                    setVenueKind('hotel')
                  }}
                >
                  Cerca de la ruta
                </button>
                <a className="btn ghost sm" href={bookingCityUrl} target="_blank" rel="noreferrer">
                  Booking
                </a>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    setHotelBannerDismissed(true)
                    setTripHotel(trip.id, null, { clearSkipped: true })
                    if (venueKind === 'hotel') setVenueKind(null)
                  }}
                >
                  Ahora no
                </button>
              </div>
            </div>
          ) : null}

          <div className="chaos-bar day-quick tight rd-segment">
            <button
              type="button"
              className={venueKind === 'restaurant' || tripTab === 'food' ? 'chip on' : 'chip'}
              onClick={() => {
                setTripTab('food')
                setVenueKind('restaurant')
              }}
            >
              Restaurantes
            </button>
            <button
              type="button"
              className={venueKind === 'hotel' || tripTab === 'hotel' ? 'chip on' : 'chip'}
              onClick={() => {
                setTripTab('hotel')
                setVenueKind('hotel')
              }}
            >
              Hoteles
            </button>
            {trip.logistics?.hotel ? (
              <a
                className="chip"
                href={hotelBookingUrl({
                  name: trip.logistics.hotel.name,
                  city: trip.city.name,
                  lat: trip.logistics.hotel.lat,
                  lng: trip.logistics.hotel.lng,
                })}
                target="_blank"
                rel="noreferrer"
              >
                Booking
              </a>
            ) : null}
          </div>
          {venueKind && (
            <VenueFinder
              kind={venueKind}
              lat={
                venueKind === 'hotel'
                  ? hotelSearchPoint.lat
                  : (trip.logistics?.hotel?.lat ?? trip.city.lat)
              }
              lng={
                venueKind === 'hotel'
                  ? hotelSearchPoint.lng
                  : (trip.logistics?.hotel?.lng ?? trip.city.lng)
              }
              city={trip.city.name}
              checkin={trip.startDate}
              checkout={trip.endDate}
              nearLabel={
                venueKind === 'hotel' ? 'Cerca del centro de vuestra ruta' : undefined
              }
              onClose={() => setVenueKind(null)}
              onAdd={
                venueKind === 'hotel'
                  ? (v) => {
                      setTripHotel(trip.id, {
                        name: v.name,
                        lat: v.lat,
                        lng: v.lng,
                      })
                      setHotelBannerDismissed(true)
                      setVenueKind(null)
                    }
                  : undefined
              }
            />
          )}

        {(tripTab === 'days' || tripTab === 'map') && (
        <section className="r3-trip-days">
          <h2>Días del viaje</h2>
          <p className="r3-trip-days-sub">
            {trip.days.length} días · {visitStops.length} paradas · tocá un día para el mapa detalle
          </p>
          <ul className="r3-trip-day-list">
            {trip.days.map((day) => {
              const visits = [...day.stops]
                .filter((s) => !s.isHotel)
                .sort((a, b) => a.order - b.order)
              const tag =
                day.intensity === 'arrival'
                  ? 'Llegada'
                  : day.intensity === 'departure'
                    ? 'Salida'
                    : null
              return (
                <li key={day.id}>
                  <article className={`r3-trip-day c-${(trip.days.indexOf(day) % 5) + 1}`}>
                    <button
                      type="button"
                      className="day-summary-main"
                      onClick={() => setView({ name: 'day', tripId: trip.id, dayId: day.id })}
                    >
                      <div className="day-summary-top">
                        <strong>{day.label}</strong>
                        <span className="day-meta-pills">
                          {tag ? <span className="day-pill tag">{tag}</span> : null}
                          <span className="day-pill count">
                            {visits.length} sitio{visits.length === 1 ? '' : 's'}
                          </span>
                        </span>
                      </div>
                      {visits.length === 0 ? (
                        <p className="day-summary-names muted tiny">Sin paradas aún</p>
                      ) : (
                        <ol className="day-summary-tl">
                          {visits.slice(0, 4).map((s, i) => (
                            <li key={s.id}>
                              <span className="day-summary-n">{i + 1}</span>
                              <span>
                                {s.suggestedTime ? (
                                  <em className="day-summary-time">{s.suggestedTime}</em>
                                ) : null}
                                {s.name.replace(/\s*\/.*$/, '').slice(0, 32)}
                                {s.transitMode && i < Math.min(3, visits.length - 1) ? (
                                  <span className="muted tiny">
                                    {' '}
                                    → {TRANSIT_MODE_LABELS[s.transitMode]}
                                    {s.minutesToNext != null ? ` ${s.minutesToNext}'` : ''}
                                  </span>
                                ) : null}
                              </span>
                            </li>
                          ))}
                          {visits.length > 4 ? (
                            <li className="muted tiny">+{visits.length - 4} más</li>
                          ) : null}
                        </ol>
                      )}
                    </button>
                    <div className="day-summary-actions">
                      <a
                        className="btn ghost sm"
                        href={googleMapsDirectionsUrl(day.stops)}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir este día en Google Maps"
                      >
                        Maps
                      </a>
                      <button
                        type="button"
                        className="btn primary sm"
                        onClick={() => setView({ name: 'day', tripId: trip.id, dayId: day.id })}
                      >
                        Ver día
                      </button>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        </section>
        )}
        </div>
      </div>
    </div>
  )
}
