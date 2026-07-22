import { useState } from 'react'
import {
  CATEGORY_LABELS,
  DEFAULT_PREFERENCES,
  PREFERENCE_LABELS,
  TRANSIT_MODE_LABELS,
  type PreferenceKey,
  type Preferences,
  type RouteStyle,
  type TransitMode,
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
import { hotelBookingUrl, placeQuickLinks } from '../lib/bookingLinks'
import { VenueFinder } from '../components/VenueFinder'
import type { VenueKind } from '../lib/bookingLinks'
import { openTelegramBot } from '../lib/copilot'
import { loadOfflineDay } from '../lib/offlineDay'

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
  const [moreOpen, setMoreOpen] = useState(false)

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

  const allStops = trip.days.flatMap((d) => d.stops)
  const budget = estimateFromTrip(trip)
  const offlinePack = loadOfflineDay()
  const offlineForThisTrip = offlinePack?.tripId === trip.id ? offlinePack : null

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
    <div className="page trip-page">
      <div className="trip-topbar">
        <button type="button" className="btn ghost sm back" onClick={() => setView({ name: 'home' })}>
          ← Viajes
        </button>
        <button
          type="button"
          className={moreOpen ? 'btn ghost sm on' : 'btn ghost sm'}
          onClick={() => setMoreOpen((v) => !v)}
        >
          Más
        </button>
      </div>

      {moreOpen && (
        <div className="trip-more-panel">
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

      <header className="trip-hero compact">
        <h1>{trip.title}</h1>
        <p className="muted">
          {trip.startDate} → {trip.endDate}
          {trip.logistics?.hotel ? ` · ${trip.logistics.hotel.name}` : ''}
        </p>
      </header>

      <div className="trip-shell">
        <div className="trip-map-col">
          <TripMap stops={allStops.slice(0, 40)} height="180px" showLegend />
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
          <div className="chaos-bar day-quick tight">
            <button
              type="button"
              className={venueKind === 'restaurant' ? 'chip on' : 'chip'}
              onClick={() => setVenueKind((k) => (k === 'restaurant' ? null : 'restaurant'))}
            >
              Restaurantes
            </button>
            <button
              type="button"
              className={venueKind === 'hotel' ? 'chip on' : 'chip'}
              onClick={() => setVenueKind((k) => (k === 'hotel' ? null : 'hotel'))}
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
              lat={trip.logistics?.hotel?.lat ?? trip.city.lat}
              lng={trip.logistics?.hotel?.lng ?? trip.city.lng}
              city={trip.city.name}
              onClose={() => setVenueKind(null)}
            />
          )}
        </div>

        <section className="trip-days dense">
          <h2>Días</h2>
          <ul className="day-list dense">
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
              const preview = visits.slice(0, 4)
              const extra = visits.length - preview.length
              return (
                <li key={day.id}>
                  <article className="day-row">
                    <button
                      type="button"
                      className="day-row-head"
                      onClick={() => setView({ name: 'day', tripId: trip.id, dayId: day.id })}
                    >
                      <div className="day-row-title">
                        <strong>{day.label}</strong>
                        <span className="day-meta-pills">
                          {tag ? <span className="day-pill tag">{tag}</span> : null}
                          <span className="day-pill count">
                            {visits.length} sitio{visits.length === 1 ? '' : 's'}
                          </span>
                          {extra > 0 ? (
                            <span className="day-pill more">+{extra} más</span>
                          ) : null}
                        </span>
                      </div>
                      <span className="day-row-open">Abrir →</span>
                    </button>

                    {preview.length === 0 ? (
                      <p className="muted tiny day-row-empty">Sin paradas — tocá Abrir</p>
                    ) : (
                      <ul className="day-stop-lines">
                        {preview.map((s, i) => {
                          const mode = (s.transitMode || 'walk') as TransitMode
                          const short = s.name.replace(/\s*\/.*$/, '').slice(0, 32)
                          const links = placeQuickLinks({
                            name: s.name,
                            lat: s.lat,
                            lng: s.lng,
                            category: s.category,
                            listingKind: s.listingKind,
                            website: s.website,
                            isHotel: s.isHotel,
                            city: trip.city.name,
                          })
                          return (
                            <li key={s.id} className="day-stop-line">
                              <span className="day-stop-n">{i + 1}</span>
                              <div className="day-stop-info">
                                <strong>{short}</strong>
                                <span className="muted tiny">
                                  {s.suggestedTime ? `${s.suggestedTime}` : ''}
                                  {s.suggestedTime ? ' · ' : ''}
                                  {CATEGORY_LABELS[s.category]}
                                  {i < preview.length - 1
                                    ? ` · ${TRANSIT_MODE_LABELS[mode]}${
                                        s.minutesToNext != null ? ` ${s.minutesToNext}'` : ''
                                      }`
                                    : ''}
                                </span>
                                <span className="day-stop-links">
                                  {links.map((l) => (
                                    <a
                                      key={l.label}
                                      href={l.href}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={l.primary ? 'link-pri' : 'link-sec'}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {l.label}
                                    </a>
                                  ))}
                                </span>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}

                    <div className="day-row-actions">
                      <a
                        className="btn ghost sm"
                        href={googleMapsDirectionsUrl(day.stops)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Maps
                      </a>
                      <button
                        type="button"
                        className="btn primary sm"
                        onClick={() => setView({ name: 'onroute', tripId: trip.id, dayId: day.id })}
                      >
                        En ruta
                      </button>
                      <button
                        type="button"
                        className="btn ghost sm"
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
      </div>
    </div>
  )
}
