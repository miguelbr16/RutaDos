import { useState } from 'react'
import { CATEGORY_LABELS } from '../types'
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
import { getCityGuide, genericGuide } from '../lib/cityGuides'
import { estimateFromTrip } from '../lib/budget'
import { createTripShareToken, shareUrlForToken } from '../lib/share'
import { isSupabaseConfigured } from '../lib/supabase'
import { googleMapsDirectionsUrl } from '../lib/mapsUrl'

export function TripPage({ tripId }: { tripId: string }) {
  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId))
  const setView = useAppStore((s) => s.setView)
  const mergePlacesIntoTrip = useAppStore((s) => s.mergePlacesIntoTrip)

  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [paste, setPaste] = useState('')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shareMsg, setShareMsg] = useState<string | null>(null)
  const [shareBusy, setShareBusy] = useState(false)

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
  const guide =
    getCityGuide(trip.city.name, trip.city.displayName) ?? genericGuide(trip.city.name)
  const budget = estimateFromTrip(trip)

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
      try {
        await navigator.clipboard.writeText(url)
        setShareMsg(`Link copiado: ${url}`)
      } catch {
        setShareMsg(`Link: ${url}`)
      }
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
    <div className="page">
      <button type="button" className="btn ghost sm back" onClick={() => setView({ name: 'home' })}>
        ← Viajes
      </button>

      <header className="trip-hero">
        <p className="brand small">RutaDos</p>
        <h1>{trip.title}</h1>
        <p className="muted">
          {trip.startDate} → {trip.endDate} · {trip.places.length} recomendaciones · ritmo{' '}
          {trip.routeStyle.pace}
          {trip.logistics?.arrivalTime ? ` · llegada ${trip.logistics.arrivalTime}` : ''}
          {trip.logistics?.hotel ? ` · hotel: ${trip.logistics.hotel.name}` : ''}
          {trip.logistics?.airport ? ` · aero: ${trip.logistics.airport.name}` : ''}
          {trip.city.scale === 'region'
            ? ' · región / pueblos'
            : trip.city.scale === 'country'
              ? ' · ruta por el país'
              : ''}
        </p>
      </header>

      <TripMap stops={allStops.slice(0, 40)} height="220px" showLegend />

      <div className="budget-box" style={{ marginTop: '1rem' }}>
        <strong>Presupuesto orientativo</strong>
        <p>
          ~{budget.perPersonPerDayMin}–{budget.perPersonPerDayMax} €/persona/día · total ~{' '}
          {budget.totalMin}–{budget.totalMax} €/persona ({budget.nights} noches)
        </p>
        <p className="muted tiny">{budget.blurb}</p>
      </div>

      <div className="panel tip-panel">
        <h3>Cómo planificamos (estilo guía)</h3>
        <ul className="howto">
          <li>Horarios por franja y vuelta al hotel de noche (~22–00).</li>
          <li>Transporte sugerido en cada tramo; «Ver línea en Maps» para la línea exacta.</li>
          <li>Monumentos «de pasada» cerca de la ruta + tips de reserva cuando toca.</li>
          <li>
            {guide.transportTitle}: {guide.transportBlurb}
          </li>
        </ul>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setView({ name: 'guides', tripId })}
        >
          Reservas y transportes
        </button>
      </div>

      <div className="toolbar">
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
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setView({ name: 'copilot', tripId })}
        >
          Copiloto
        </button>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setView({ name: 'build', tripId })}
        >
          Armar ruta nosotros
        </button>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setView({ name: 'guides', tripId })}
        >
          Links útiles
        </button>
        <button type="button" className="btn ghost sm" onClick={() => setImportOpen((v) => !v)}>
          Importar enlaces
        </button>
      </div>
      {shareMsg && <p className="muted tiny">{shareMsg}</p>}
      <p className="muted tiny">
        Compartir: enviad el link a vuestra pareja. Con cuenta + Pareja, notas, me gusta / no quiero
        y el check-in se sincronizan. Sin Supabase, se descarga JSON.
      </p>

      {exportOpen && (
        <div className="panel">
          <h3>Sitios en tu Google Maps</h3>
          <p className="muted">
            Se descargó un archivo <strong>.kml</strong> con todos los días y la wishlist. Google no
            deja meter sitios en “Guardados” desde fuera, pero sí en{' '}
            <strong>My Maps</strong> (aparece en la app de Maps).
          </p>
          <ol className="howto">
            <li>
              Abrí{' '}
              <a href={GOOGLE_MY_MAPS_URL} target="_blank" rel="noreferrer">
                Google My Maps
              </a>{' '}
              (con tu cuenta).
            </li>
            <li>Crear mapa → Importar → elegí el .kml descargado.</li>
            <li>
              En el móvil: Google Maps → Guardados → Mapas → verás este mapa con todos los pines.
            </li>
          </ol>
          <button type="button" className="btn ghost sm" onClick={() => setExportOpen(false)}>
            Entendido
          </button>
        </div>
      )}

      {importOpen && (
        <div className="panel">
          <h3>Importar sitios</h3>
          <p className="muted">
            Pegá enlaces de Maps (también los cortos maps.app.goo.gl), uno por línea, o subí un
            KML/GeoJSON.
          </p>
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
              rows={5}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={`https://maps.app.goo.gl/xxxx\nhttps://maps.app.goo.gl/yyyy\nBritish Museum`}
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

      <section className="section">
        <h2>Días</h2>
        <ul className="day-list">
          {trip.days.map((day) => (
            <li key={day.id}>
              <div className="day-card-wrap">
                <button
                  type="button"
                  className="day-card"
                  onClick={() => setView({ name: 'day', tripId: trip.id, dayId: day.id })}
                >
                  <span className="day-label">{day.label}</span>
                  <span className="muted">
                    {day.stops.length} paradas
                    {day.intensity === 'arrival'
                      ? ' · llegada suave'
                      : day.intensity === 'departure'
                        ? ' · salida'
                        : ''}
                  </span>
                  {day.note && <span className="day-preview">{day.note}</span>}
                  <span className="day-preview">
                    {day.stops
                      .slice(0, 3)
                      .map((s) => s.name)
                      .join(' · ')}
                    {day.stops.length > 3 ? '…' : ''}
                  </span>
                </button>
                <div className="day-card-actions">
                  <a
                    className="btn ghost sm"
                    href={googleMapsDirectionsUrl(day.stops)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Maps
                  </a>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setView({ name: 'onroute', tripId: trip.id, dayId: day.id })}
                  >
                    Check-in
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Todas las recomendaciones</h2>
        <p className="muted">
          Generamos una lista amplia. En cada día puedes añadir, quitar y reordenar.
        </p>
        <ul className="place-grid">
          {trip.places.slice(0, 80).map((p) => (
            <li key={p.id} className="place-pill">
              <span className="cat">{CATEGORY_LABELS[p.category]}</span>
              <strong>{p.name}</strong>
              <span className="tier">{p.tier}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
