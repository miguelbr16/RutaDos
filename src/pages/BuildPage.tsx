import { useMemo, useState } from 'react'
import { CATEGORY_LABELS, type GeoPlace } from '../types'
import { useAppStore } from '../store'
import { TripMap } from '../components/TripMap'
import { categoryColor } from '../lib/categoryColors'

export function BuildPage({ tripId, dayId }: { tripId: string; dayId?: string }) {
  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId))
  const setView = useAppStore((s) => s.setView)
  const setCustomDayPlaces = useAppStore((s) => s.setCustomDayPlaces)

  const [selectedDayId, setSelectedDayId] = useState(dayId || trip?.days[0]?.id || '')
  const [picked, setPicked] = useState<GeoPlace[]>([])

  const day = trip?.days.find((d) => d.id === selectedDayId)

  const available = useMemo(() => {
    if (!trip) return []
    const used = new Set(picked.map((p) => p.id))
    return trip.places.filter((p) => !used.has(p.id)).sort((a, b) => b.score - a.score)
  }, [trip, picked])

  const pickables = useMemo(() => {
    if (!trip) return []
    const selected = new Set(picked.map((p) => p.id))
    // Top places on the map so London (etc.) shows pins to connect
    return trip.places
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 80)
      .map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        category: p.category,
        selected: selected.has(p.id),
      }))
  }, [trip, picked])

  const byId = useMemo(() => {
    const m = new Map<string, GeoPlace>()
    trip?.places.forEach((p) => m.set(p.id, p))
    return m
  }, [trip])

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

  const previewStops = picked.map((p, i) => ({
    id: p.id,
    placeId: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    category: p.category,
    order: i,
  }))

  function toggle(p: GeoPlace) {
    setPicked((prev) => {
      if (prev.some((x) => x.id === p.id)) return prev.filter((x) => x.id !== p.id)
      return [...prev, p]
    })
  }

  function toggleById(id: string) {
    const p = byId.get(id) || picked.find((x) => x.id === id)
    if (p) toggle(p)
  }

  function apply() {
    if (!selectedDayId || !picked.length) return
    setCustomDayPlaces(tripId, selectedDayId, picked)
    setView({ name: 'day', tripId, dayId: selectedDayId })
  }

  const cityCenter = { lat: trip.city.lat, lng: trip.city.lng }

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
        <p className="brand small">RutaDos</p>
        <h1>Armar ruta nosotros</h1>
        <p className="muted">
          Mapa de {trip.city.name}: tocá pines para ir conectando vuestra ruta del día. Luego
          aplicá — se optimiza yendo y volviendo al hotel.
        </p>
      </header>

      <label className="field">
        <span>Día</span>
        <select
          value={selectedDayId}
          onChange={(e) => {
            setSelectedDayId(e.target.value)
            setPicked([])
          }}
        >
          {trip.days.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
              {d.planSource === 'custom' ? ' (vuestra)' : ' (sugerida)'}
            </option>
          ))}
        </select>
      </label>

      {day && (
        <p className="muted tiny">
          Ahora: {day.planSource === 'custom' ? 'plan propio' : 'plan sugerido'} · {day.stops.length}{' '}
          paradas
        </p>
      )}

      <TripMap
        stops={previewStops}
        height="320px"
        showLegend
        showLegs={false}
        defaultCenter={cityCenter}
        pickables={pickables}
        onPick={toggleById}
      />

      <p className="muted tiny">
        Pines pequeños = sitios disponibles en {trip.city.name}. Numerados = vuestra secuencia.
      </p>

      <div className="toolbar">
        <button
          type="button"
          className="btn primary"
          disabled={!picked.length || !selectedDayId}
          onClick={apply}
        >
          Aplicar al día ({picked.length})
        </button>
        <button type="button" className="btn ghost sm" onClick={() => setPicked([])}>
          Vaciar selección
        </button>
      </div>

      <section className="section">
        <h2>Seleccionados ({picked.length})</h2>
        {!picked.length && (
          <p className="muted">Tocá pines en el mapa o añadí desde la lista abajo.</p>
        )}
        <ul className="suggest-list">
          {picked.map((p, i) => (
            <li key={p.id}>
              <button type="button" className="suggest-item" onClick={() => toggle(p)}>
                <span className="num" style={{ background: categoryColor(p.category) }}>
                  {i + 1}
                </span>
                <strong>{p.name}</strong>
                <span className="add">Quitar</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Lista ({available.length})</h2>
        <p className="muted">Misma wishlist que el mapa: iconos, museos y afueras.</p>
        <ul className="suggest-list">
          {available.slice(0, 60).map((p) => (
            <li key={p.id}>
              <button type="button" className="suggest-item" onClick={() => toggle(p)}>
                <span className="cat">{CATEGORY_LABELS[p.category]}</span>
                <strong>{p.name}</strong>
                <span className="add">Añadir</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
