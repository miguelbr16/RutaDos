import { useEffect, useState } from 'react'
import type { Trip } from '../types'
import { useAppStore } from '../store'
import { TripMap } from '../components/TripMap'
import { fetchTripByShareToken } from '../lib/share'
import { estimateFromTrip } from '../lib/budget'
import { isSupabaseConfigured } from '../lib/supabase'

export function SharePage({ token }: { token: string }) {
  const setView = useAppStore((s) => s.setView)
  const importTrips = useAppStore((s) => s.importTrips)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        if (!isSupabaseConfigured) {
          throw new Error('El compartir por link necesita Supabase configurado.')
        }
        const t = await fetchTripByShareToken(token)
        if (!cancelled) {
          if (!t) setError('Link inválido o caducado.')
          else setTrip(t)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudo abrir el link')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Abriendo viaje compartido…</p>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="page">
        <p className="brand small">RutaDos</p>
        <h1>Link no disponible</h1>
        <p className="error">{error ?? 'No encontrado'}</p>
        <button type="button" className="btn primary" onClick={() => setView({ name: 'trips' })}>
          Ir a Viajes
        </button>
      </div>
    )
  }

  const budget = estimateFromTrip(trip)
  const mapStops = trip.days.flatMap((d) => d.stops).slice(0, 40)

  return (
    <div className="page">
      <p className="brand small">RutaDos</p>
      <header className="trip-hero">
        <p className="muted tiny">Vista compartida · solo lectura</p>
        <h1>{trip.title}</h1>
        <p className="muted">
          {trip.startDate} → {trip.endDate} · {trip.days.length} días · {trip.city.displayName}
        </p>
      </header>

      <TripMap stops={mapStops} height="220px" showLegend showLegs={false} />

      <div className="budget-box" style={{ marginTop: '1rem' }}>
        <strong>Presupuesto orientativo</strong>
        <p>
          ~{budget.perPersonPerDayMin}–{budget.perPersonPerDayMax} €/persona/día · total ~{' '}
          {budget.totalMin}–{budget.totalMax} €/persona
        </p>
        <p className="muted tiny">{budget.blurb}</p>
      </div>

      <section className="section">
        <h2>Días</h2>
        <ul className="day-list">
          {trip.days.map((d) => (
            <li key={d.id} className="day-card" style={{ padding: '1rem' }}>
              <strong className="day-label">{d.label}</strong>
              {d.note && <p className="muted tiny">{d.note}</p>}
              <ol className="muted tiny" style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
                {d.stops
                  .filter((s) => !s.isHotel)
                  .slice(0, 8)
                  .map((s) => (
                    <li key={s.id}>
                      {s.suggestedTime ? `${s.suggestedTime} · ` : ''}
                      {s.name}
                      {s.userNotes ? ` — ${s.userNotes}` : ''}
                    </li>
                  ))}
              </ol>
            </li>
          ))}
        </ul>
      </section>

      <div className="wiz-actions">
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            const id = `share-${Date.now()}`
            importTrips([
              {
                ...trip,
                id,
                title: `${trip.title} (copia)`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ])
            setView({ name: 'plan', tripId: id })
          }}
        >
          Guardar una copia en mi app
        </button>
        <button type="button" className="btn ghost" onClick={() => setView({ name: 'trips' })}>
          Viajes
        </button>
      </div>
      <p className="muted tiny">
        La copia queda en este dispositivo. Para editar juntos, usad Pareja / sync.
      </p>
    </div>
  )
}
