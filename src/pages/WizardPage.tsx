import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_LABELS,
  type ExploreMode,
  type Mobility,
  type Pace,
  type PreferenceKey,
  type Preferences,
} from '../types'
import { useAppStore } from '../store'
import { searchDestinations, searchHotels, searchCityPlaces, type PlaceSuggestion } from '../lib/geocode'
import { TripDateFields } from '../components/TripDateFields'
import { TripMap } from '../components/TripMap'
import { DestinationGrid } from '../components/DestinationGrid'
import { findAirportsForCity, type AirportOption } from '../lib/airports'
import { estimateTripBudget } from '../lib/budget'
import { isGoogleMapsUrl } from '../lib/importGmaps'
import {
  AREA_SCALE_OPTIONS,
  detectAreaScale,
} from '../lib/tripScale'
import {
  FEATURED_DESTINATIONS,
  buildQuickDestinationPatch,
  photoForDestination,
  type QuickDestination,
} from '../lib/quickDestinations'

const PREF_HINTS: Record<PreferenceKey, string> = {
  monuments: 'Plazas, iconos, imprescindibles',
  museums: 'Arte, historia, exposiciones',
  architecture: 'Iglesias, edificios singulares',
  viewpoints: 'Vistas y atardeceres',
  parks: 'Jardines y aire libre',
  neighborhoods: 'Callejear barrios con encanto',
  hidden: 'Rincones menos obvios',
  restaurants: 'Comidas y cenas',
  cafes: 'Desayuno o descanso',
  markets: 'Mercados locales',
  street_food: 'Comida rápida / callejera',
  shopping: 'Tiendas y zonas comerciales',
  shows: 'Teatro, cine, espectáculos',
  nightlife: 'Bares y copas',
  night_walks: 'Calles y monumentos bonitos de noche',
}

/** 4 buckets grandes en vez del muro de chips */
const VIBE_BUCKETS: Array<{
  id: string
  label: string
  hint: string
  keys: PreferenceKey[]
}> = [
  {
    id: 'culture',
    label: 'Cultura',
    hint: 'Museos, monumentos, arquitectura',
    keys: ['museums', 'monuments', 'architecture', 'shows'],
  },
  {
    id: 'wander',
    label: 'Callejear',
    hint: 'Barrios, vistas, parques, rincones',
    keys: ['neighborhoods', 'viewpoints', 'parks', 'hidden', 'markets'],
  },
  {
    id: 'food',
    label: 'Comer',
    hint: 'Restaurantes, cafés, street food',
    keys: ['restaurants', 'cafes', 'street_food'],
  },
  {
    id: 'night',
    label: 'De noche',
    hint: 'Paseos iluminados y ambiente',
    keys: ['night_walks', 'nightlife'],
  },
]

const FINE_PREF_KEYS: PreferenceKey[] = [
  'monuments',
  'museums',
  'architecture',
  'viewpoints',
  'parks',
  'neighborhoods',
  'hidden',
  'markets',
  'shopping',
  'restaurants',
  'cafes',
  'street_food',
  'night_walks',
  'shows',
  'nightlife',
]

function emptyNightlife(prefs: Preferences): Preferences {
  return { ...prefs, nightlife: false, night_walks: prefs.night_walks ?? true }
}

function bucketIsOn(prefs: Preferences, keys: PreferenceKey[]): boolean {
  const n = keys.filter((k) => prefs[k]).length
  return n >= Math.ceil(keys.length / 2)
}

function toggleBucketPrefs(prefs: Preferences, keys: PreferenceKey[]): Preferences {
  const turnOn = !bucketIsOn(prefs, keys)
  const next = { ...prefs }
  for (const k of keys) next[k] = turnOn
  return next
}

const PRESETS: Array<{
  id: string
  label: string
  desc: string
  icon: string
  prefs: Preferences
  pace?: Pace
  explore?: ExploreMode
}> = [
  {
    id: 'classic',
    label: 'Clásico',
    desc: 'Iconos, museos y buen comer — sin prisa',
    icon: '🏛️',
    pace: 'relaxed',
    explore: 'icons',
    prefs: emptyNightlife({
      ...DEFAULT_PREFERENCES,
      monuments: true,
      museums: true,
      architecture: true,
      viewpoints: true,
      parks: true,
      neighborhoods: true,
      hidden: false,
      restaurants: true,
      cafes: true,
      markets: true,
      street_food: false,
      shopping: false,
      shows: false,
      nightlife: false,
    }),
  },
  {
    id: 'local',
    label: 'Más local',
    desc: 'Barrios, mercados y secretos',
    icon: '🧭',
    pace: 'normal',
    explore: 'local',
    prefs: emptyNightlife({
      ...DEFAULT_PREFERENCES,
      monuments: true,
      museums: false,
      architecture: true,
      viewpoints: true,
      parks: true,
      neighborhoods: true,
      hidden: true,
      restaurants: true,
      cafes: true,
      markets: true,
      street_food: true,
      shopping: false,
      shows: false,
      nightlife: false,
    }),
  },
  {
    id: 'food',
    label: 'Foodie',
    desc: 'Mercados, mesas y cafés primero',
    icon: '🍷',
    pace: 'normal',
    explore: 'mixed',
    prefs: emptyNightlife({
      ...DEFAULT_PREFERENCES,
      monuments: true,
      museums: false,
      architecture: false,
      viewpoints: false,
      parks: true,
      neighborhoods: true,
      hidden: true,
      restaurants: true,
      cafes: true,
      markets: true,
      street_food: true,
      shopping: false,
      shows: false,
      nightlife: false,
    }),
  },
]

/** Ritmo + exploración en una sola elección visual */
const STYLE_PACKS: Array<{
  id: string
  title: string
  desc: string
  pace: Pace
  explore: ExploreMode
}> = [
  {
    id: 'chill-icons',
    title: 'Sin prisa · iconos',
    desc: 'Pocas paradas, lo famoso primero',
    pace: 'relaxed',
    explore: 'icons',
  },
  {
    id: 'balanced',
    title: 'Equilibrado · mixto',
    desc: 'Turismo y barrio sin agobio',
    pace: 'normal',
    explore: 'mixed',
  },
  {
    id: 'full-local',
    title: 'A tope · local',
    desc: 'Días densos, más barrio que postal',
    pace: 'intense',
    explore: 'local',
  },
]

const MOBILITY_OPTIONS: Array<{ value: Mobility; title: string; desc: string }> = [
  { value: 'walk', title: 'Andando', desc: 'Pie primero' },
  { value: 'mixed', title: 'Lo óptimo', desc: 'Pie / metro / taxi' },
  { value: 'transit', title: 'Transporte', desc: 'Ahorra piernas' },
  { value: 'drive', title: 'Coche', desc: 'Rutas / furgoneta' },
]

const FOOD_OPTIONS = [
  { value: 'low' as const, title: 'Económica', desc: 'Casual / street' },
  { value: 'mid' as const, title: 'Media', desc: 'Buenas cartas' },
  { value: 'high' as const, title: 'Especial', desc: 'Más encanto' },
]

function nightsBetween(start: string, end: string): number {
  const a = Date.parse(start)
  const b = Date.parse(end)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0
  return Math.round((b - a) / 86400000)
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function sameAirport(
  a: { lat: number; lng: number; code?: string },
  pick: { lat: number; lng: number; code?: string } | null,
): boolean {
  if (!pick) return false
  if (a.code && pick.code) return a.code === pick.code
  return a.lat === pick.lat && a.lng === pick.lng
}

export function WizardPage() {
  const view = useAppStore((s) => s.view)
  const wizard = useAppStore((s) => s.wizard)
  const patchWizard = useAppStore((s) => s.patchWizard)
  const setView = useAppStore((s) => s.setView)
  const generateTrip = useAppStore((s) => s.generateTrip)
  const generating = useAppStore((s) => s.generating)
  const error = useAppStore((s) => s.error)

  const [citySuggestions, setCitySuggestions] = useState<PlaceSuggestion[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [hotelSuggestions, setHotelSuggestions] = useState<PlaceSuggestion[]>([])
  const [mustSuggestions, setMustSuggestions] = useState<PlaceSuggestion[]>([])
  const [searchingCity, setSearchingCity] = useState(false)
  const [searchingHotel, setSearchingHotel] = useState(false)
  const [searchingMust, setSearchingMust] = useState(false)
  const [airports, setAirports] = useState<AirportOption[]>([])
  const [loadingAirports, setLoadingAirports] = useState(false)

  useEffect(() => {
    if (view.name !== 'wizard' || view.step !== 0) return
    // Don't search while a confirmed pick matches the query
    if (wizard.cityPick && wizard.cityQuery === wizard.cityPick.name) {
      setCitySuggestions([])
      return
    }
    const q = wizard.cityQuery.trim()
    if (q.length < 2) {
      setCitySuggestions([])
      return
    }
    const t = window.setTimeout(() => {
      setSearchingCity(true)
      void searchDestinations(q)
        .then(setCitySuggestions)
        .finally(() => setSearchingCity(false))
    }, 350)
    return () => window.clearTimeout(t)
  }, [wizard.cityQuery, wizard.cityPick, view])

  useEffect(() => {
    if (!wizard.cityPick) {
      setAirports([])
      return
    }
    let cancelled = false
    setLoadingAirports(true)
    void findAirportsForCity(
      wizard.cityPick.name,
      wizard.cityPick.displayName,
      wizard.cityPick.lat,
      wizard.cityPick.lng,
    )
      .then((list) => {
        if (!cancelled) setAirports(list)
      })
      .finally(() => {
        if (!cancelled) setLoadingAirports(false)
      })
    return () => {
      cancelled = true
    }
  }, [wizard.cityPick])

  useEffect(() => {
    if (view.name !== 'wizard' || view.step !== 0) return
    const q = wizard.hotelQuery.trim()
    if (q.length < 3 || !wizard.cityQuery.trim()) {
      setHotelSuggestions([])
      return
    }
    // Evitar re-buscar si ya hay hotel confirmado con el mismo texto
    if (wizard.hotelPick && q === wizard.hotelPick.name) {
      setHotelSuggestions([])
      return
    }
    const t = window.setTimeout(() => {
      setSearchingHotel(true)
      void searchHotels(q, wizard.cityPick?.name || wizard.cityQuery)
        .then((list) => {
          // Enlace de Maps: confirmar automáticamente el mejor resultado
          if (isGoogleMapsUrl(q) && list.length >= 1) {
            const s = list.find((x) => x.kind === 'enlace') ?? list[0]
            patchWizard({
              hotelQuery: s.shortName,
              hotelPick: { name: s.shortName, lat: s.lat, lng: s.lng },
              hotelSkipped: false,
            })
            setHotelSuggestions([])
          } else {
            setHotelSuggestions(list)
          }
        })
        .finally(() => setSearchingHotel(false))
    }, isGoogleMapsUrl(q) ? 200 : 400)
    return () => window.clearTimeout(t)
  }, [wizard.hotelQuery, wizard.cityQuery, wizard.hotelPick, wizard.cityPick, view, patchWizard])

  useEffect(() => {
    if (view.name !== 'wizard' || view.step !== 2) return
    const q = wizard.mustVisitQuery.trim()
    if (q.length < 2 || !wizard.cityPick) {
      setMustSuggestions([])
      return
    }
    const t = window.setTimeout(() => {
      setSearchingMust(true)
      void searchCityPlaces(q, wizard.cityPick!.name || wizard.cityQuery)
        .then(setMustSuggestions)
        .finally(() => setSearchingMust(false))
    }, 350)
    return () => window.clearTimeout(t)
  }, [wizard.mustVisitQuery, wizard.cityPick, wizard.cityQuery, view])

  const nights = useMemo(
    () => nightsBetween(wizard.startDate, wizard.endDate),
    [wizard.startDate, wizard.endDate],
  )

  const activePrefs = useMemo(
    () => (Object.keys(wizard.preferences) as PreferenceKey[]).filter((k) => wizard.preferences[k]),
    [wizard.preferences],
  )

  const preview = useMemo(() => {
    if (!wizard.routeStyle.pace || !wizard.routeStyle.explore) {
      return 'Elegid ritmo y estilo de exploración para ver el resumen.'
    }
    const pace =
      wizard.routeStyle.pace === 'relaxed'
        ? 'días tranquilas'
        : wizard.routeStyle.pace === 'intense'
          ? 'días intensos'
          : 'ritmo equilibrado'
    const explore =
      wizard.routeStyle.explore === 'icons'
        ? 'priorizando iconos'
        : wizard.routeStyle.explore === 'local'
          ? 'con mirada local'
          : 'mezclando turismo y barrio'
    const arrive =
      wizard.arrivalTime >= '17:00'
        ? 'llegada tarde → primer día suave cerca del hotel'
        : wizard.arrivalTime >= '14:00'
          ? 'llegada por la tarde → media jornada el primer día'
          : 'llegada temprana → casi un día completo'
    return `${pace}, ${explore}. ${arrive}.`
  }, [wizard.routeStyle.pace, wizard.routeStyle.explore, wizard.arrivalTime])

  const styleReady =
    !!wizard.routeStyle.pace &&
    !!wizard.routeStyle.explore &&
    !!wizard.routeStyle.mobility &&
    !!wizard.routeStyle.foodBudget

  if (view.name !== 'wizard') return null
  const step = view.step

  function go(next: number) {
    setView({ name: 'wizard', step: next })
  }

  function togglePref(key: PreferenceKey) {
    patchWizard({
      preferences: { ...wizard.preferences, [key]: !wizard.preferences[key] },
    })
  }

  function setStartDate(value: string) {
    const duration = Math.max(2, nightsBetween(wizard.startDate, wizard.endDate) || 2)
    const newEnd = addDaysISO(value, duration)
    patchWizard({ startDate: value, endDate: newEnd })
  }

  function setEndDate(value: string) {
    if (value < wizard.startDate) return
    patchWizard({ endDate: value })
  }

  function pickQuickDestination(d: QuickDestination) {
    patchWizard(
      buildQuickDestinationPatch(d, wizard.routeStyle.mobility),
    )
    setCitySuggestions([])
  }

  return (
    <div className="page wizard-page wizard-v2">
      <div className="wiz-v2-top">
        <button type="button" className="wiz-v2-back" onClick={() => setView({ name: 'home' })}>
          ←
        </button>
        <span className="wiz-v2-step-label">
          {step === 0 ? 'Destino' : step === 1 ? 'Estilo' : 'Confirmar'}
        </span>
        <nav className="wiz-v2-dots" aria-label="Progreso">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i <= step ? 'on' : ''} aria-hidden />
          ))}
        </nav>
      </div>

      {wizard.cityPick && step < 2 ? (
        <div
          className="wiz-v2-banner"
          style={
            photoForDestination(wizard.cityPick.name)
              ? { backgroundImage: `url("${photoForDestination(wizard.cityPick.name)}")` }
              : undefined
          }
        >
          <strong>{wizard.cityPick.name}</strong>
        </div>
      ) : null}

      {step === 0 && (
        <section className="wiz-v2-stage">
          <header className="wiz-v2-head">
            <h2>¿A dónde vas?</h2>
            <p>Elegí un destino o buscá otro.</p>
          </header>

          {!wizard.cityPick ? (
            <>
              <DestinationGrid
                destinations={FEATURED_DESTINATIONS}
                onPick={pickQuickDestination}
                layout="scroll"
              />
              <div className="wiz-v2-search">
                <input
                  value={wizard.cityQuery}
                  onChange={(e) =>
                    patchWizard({
                      cityQuery: e.target.value,
                      cityPick: null,
                      hotelPick: null,
                    })
                  }
                  placeholder="🔍  Buscar ciudad, región o país…"
                  autoComplete="off"
                  aria-label="Buscar destino"
                />
              </div>
            </>
          ) : null}

          {searchingCity && !wizard.cityPick && <p className="muted tiny">Buscando…</p>}

          {citySuggestions.length > 0 && !wizard.cityPick && (
            <div className="dest-dropdown">
              <p className="dest-dropdown-label">Elegí una opción</p>
              <ul className="suggest-cities">
                {citySuggestions.map((s) => (
                  <li key={s.label}>
                    <button
                      type="button"
                      onClick={() => {
                        const scale = detectAreaScale(
                          s.shortName,
                          s.displayName,
                          wizard.routeStyle.mobility ?? undefined,
                          s.kind,
                        )
                        patchWizard({
                          cityQuery: s.shortName,
                          cityPick: {
                            name: s.shortName,
                            displayName: s.displayName,
                            lat: s.lat,
                            lng: s.lng,
                          },
                          hotelPick: null,
                          airportPick: null,
                          areaScale: scale,
                        })
                        setCitySuggestions([])
                      }}
                    >
                      <span className="dest-main">{s.label}</span>
                      <span className="dest-kind">{s.kind}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {wizard.cityPick && (
            <div className="dest-picked">
              <div>
                <strong>{wizard.cityPick.name}</strong>
                <span className="muted tiny">{wizard.cityPick.displayName}</span>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => patchWizard({ cityPick: null })}
              >
                Cambiar
              </button>
            </div>
          )}

          {wizard.cityPick && (
            <div className="wiz-pill-block">
              <p className="wiz-section-label">Alcance</p>
              <div className="wiz-pills">
                {AREA_SCALE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={wizard.areaScale === o.value ? 'wiz-pill on' : 'wiz-pill'}
                    onClick={() => patchWizard({ areaScale: o.value })}
                    title={o.desc}
                  >
                    {o.value === 'city' ? 'Ciudad' : o.value === 'region' ? 'Región' : 'País'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="wiz-v2-dates">
            <TripDateFields label="Llegada" value={wizard.startDate} onChange={setStartDate} />
            <TripDateFields
              label="Salida"
              value={wizard.endDate}
              min={wizard.startDate}
              onChange={setEndDate}
            />
            {nights > 0 ? (
              <p className="wiz-v2-nights">
                {nights === 1 ? '1 noche' : `${nights} noches`} · {nights + 1} días
              </p>
            ) : null}
          </div>

          <details className="wiz-more">
            <summary>Horarios, aeropuerto y hotel</summary>
            <p className="muted tiny">Opcional. Podéis dejarlo y seguir sin hotel.</p>

            <div className="grid-2">
              <label className="field">
                <span>Vuelo llegada</span>
                <input
                  type="time"
                  value={wizard.arrivalTime}
                  onChange={(e) => patchWizard({ arrivalTime: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Vuelo salida</span>
                <input
                  type="time"
                  value={wizard.departureTime}
                  onChange={(e) => patchWizard({ departureTime: e.target.value })}
                />
              </label>
            </div>

            <div className="wiz-more-section">
              <p className="wiz-section-label">Aeropuerto</p>
              {loadingAirports && <p className="muted tiny">Buscando aeropuertos…</p>}
              {airports.length > 0 ? (
                <ul className="wiz-select-list">
                  {airports.map((a) => {
                    const selected = sameAirport(a, wizard.airportPick)
                    return (
                      <li key={a.code || `${a.name}-${a.lat}`}>
                        <button
                          type="button"
                          className={selected ? 'wiz-select on' : 'wiz-select'}
                          aria-pressed={selected}
                          onClick={() =>
                            patchWizard({
                              airportPick: selected
                                ? null
                                : {
                                    name: a.code ? `${a.name} (${a.code})` : a.name,
                                    code: a.code,
                                    lat: a.lat,
                                    lng: a.lng,
                                  },
                            })
                          }
                        >
                          <span className="wiz-select-main">
                            <strong>
                              {a.name}
                              {a.code ? ` · ${a.code}` : ''}
                            </strong>
                            {a.blurb ? <span className="muted tiny">{a.blurb}</span> : null}
                          </span>
                          <span className="wiz-select-check" aria-hidden>
                            {selected ? '✓' : ''}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                !loadingAirports && (
                  <p className="muted tiny">Sin lista fija; podéis seguir sin aeropuerto.</p>
                )
              )}
              {wizard.airportPick ? (
                <p className="wiz-pick-ok muted tiny">
                  Aeropuerto: <strong>{wizard.airportPick.name}</strong>
                </p>
              ) : null}
            </div>

            <div className="wiz-more-section">
              <p className="wiz-section-label">Hotel o barrio</p>
              <label className="field">
                <span>Buscar o pegar enlace de Maps</span>
                <input
                  value={wizard.hotelQuery}
                  onChange={(e) =>
                    patchWizard({
                      hotelQuery: e.target.value,
                      hotelPick: null,
                      hotelSkipped: false,
                    })
                  }
                  placeholder="Nombre o enlace Maps…"
                  autoComplete="off"
                />
              </label>
              {searchingHotel && <p className="muted tiny">Buscando…</p>}
              {hotelSuggestions.length > 0 && !wizard.hotelPick && (
                <div className="dest-dropdown">
                  <ul className="suggest-cities">
                    {hotelSuggestions.map((s) => (
                      <li key={s.label + s.lat}>
                        <button
                          type="button"
                          onClick={() => {
                            patchWizard({
                              hotelQuery: s.shortName,
                              hotelPick: { name: s.shortName, lat: s.lat, lng: s.lng },
                              hotelSkipped: false,
                            })
                            setHotelSuggestions([])
                          }}
                        >
                          <span className="dest-main">{s.label}</span>
                          <span className="dest-kind">{s.kind}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {wizard.hotelPick && (
                <>
                  <div className="hint-box dest-confirmed">
                    <strong>{wizard.hotelPick.name}</strong>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => patchWizard({ hotelPick: null, hotelSkipped: false })}
                    >
                      Cambiar
                    </button>
                  </div>
                  <TripMap
                    stops={[
                      ...(wizard.airportPick
                        ? [
                            {
                              id: 'wiz-airport',
                              placeId: 'wiz-airport',
                              name: wizard.airportPick.name,
                              lat: wizard.airportPick.lat,
                              lng: wizard.airportPick.lng,
                              category: 'local' as const,
                              order: 0,
                            },
                          ]
                        : []),
                      {
                        id: 'wiz-hotel',
                        placeId: 'wiz-hotel',
                        name: wizard.hotelPick.name,
                        lat: wizard.hotelPick.lat,
                        lng: wizard.hotelPick.lng,
                        category: 'local' as const,
                        order: wizard.airportPick ? 1 : 0,
                        isHotel: true,
                      },
                    ]}
                    height="160px"
                    showLegs={Boolean(wizard.airportPick)}
                    showLegend={false}
                    defaultCenter={{ lat: wizard.hotelPick.lat, lng: wizard.hotelPick.lng }}
                  />
                </>
              )}

              {wizard.hotelSkipped && !wizard.hotelPick && (
                <p className="muted tiny">Sin hotel fijado — se puede añadir luego.</p>
              )}

              {!wizard.hotelPick && (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    patchWizard({ hotelSkipped: true, hotelPick: null })
                  }}
                >
                  Seguir sin hotel
                </button>
              )}
            </div>
          </details>

          <div className="wiz-v2-footer">
            <button
              type="button"
              className="btn primary wiz-v2-cta"
              disabled={!wizard.cityPick || wizard.endDate < wizard.startDate}
              onClick={() => go(1)}
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="wiz-v2-stage">
          <header className="wiz-v2-head">
            <h2>Tu estilo</h2>
            <p>Un perfil y seguimos.</p>
          </header>

          <div className="wiz-v2-presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={selectedPreset === p.id ? 'wiz-v2-preset on' : 'wiz-v2-preset'}
                onClick={() => {
                  setSelectedPreset(p.id)
                  patchWizard({
                    preferences: { ...p.prefs },
                    routeStyle: {
                      ...wizard.routeStyle,
                      ...(p.pace ? { pace: p.pace } : {}),
                      ...(p.explore ? { explore: p.explore } : {}),
                      foodBudget: wizard.routeStyle.foodBudget ?? 'mid',
                      mobility: wizard.routeStyle.mobility ?? 'mixed',
                    },
                  })
                }}
              >
                <span className="wiz-v2-preset-icon" aria-hidden>
                  {p.icon}
                </span>
                <span>
                  <strong>{p.label}</strong>
                  <span>{p.desc}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="wiz-v2-segment">
            <span>Moverse</span>
            <div>
              {MOBILITY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={wizard.routeStyle.mobility === o.value ? 'on' : ''}
                  onClick={() =>
                    patchWizard({ routeStyle: { ...wizard.routeStyle, mobility: o.value } })
                  }
                >
                  {o.title}
                </button>
              ))}
            </div>
          </div>

          <div className="wiz-v2-segment">
            <span>Comida</span>
            <div>
              {FOOD_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={wizard.routeStyle.foodBudget === o.value ? 'on' : ''}
                  onClick={() =>
                    patchWizard({
                      routeStyle: { ...wizard.routeStyle, foodBudget: o.value },
                    })
                  }
                >
                  {o.title}
                </button>
              ))}
            </div>
          </div>

          <details className="wiz-more">
            <summary>Afinar más</summary>
            <p className="muted tiny">Categorías, ritmo y opciones extra.</p>

            <div className="vibe-grid">
              {VIBE_BUCKETS.map((b) => {
                const on = bucketIsOn(wizard.preferences, b.keys)
                return (
                  <button
                    key={b.id}
                    type="button"
                    className={on ? 'vibe-card on' : 'vibe-card'}
                    onClick={() => {
                      setSelectedPreset(null)
                      patchWizard({ preferences: toggleBucketPrefs(wizard.preferences, b.keys) })
                    }}
                  >
                    <strong>{b.label}</strong>
                    <span>{b.hint}</span>
                  </button>
                )
              })}
            </div>

            <div className="style-pack-grid">
              {STYLE_PACKS.map((pack) => {
                const on =
                  wizard.routeStyle.pace === pack.pace &&
                  wizard.routeStyle.explore === pack.explore
                return (
                  <button
                    key={pack.id}
                    type="button"
                    className={on ? 'style-pack on' : 'style-pack'}
                    onClick={() =>
                      patchWizard({
                        routeStyle: {
                          ...wizard.routeStyle,
                          pace: pack.pace,
                          explore: pack.explore,
                        },
                      })
                    }
                  >
                    <strong>{pack.title}</strong>
                    <span>{pack.desc}</span>
                  </button>
                )
              })}
            </div>

            <details className="wiz-fine">
              <summary>Gustos uno a uno</summary>
              <div className="wiz-fine-chips">
                {FINE_PREF_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={wizard.preferences[key] ? 'chip on' : 'chip'}
                    title={PREF_HINTS[key]}
                    onClick={() => {
                      setSelectedPreset(null)
                      togglePref(key)
                    }}
                  >
                    {PREFERENCE_LABELS[key]}
                  </button>
                ))}
              </div>
            </details>

            <label className="check">
              <input
                type="checkbox"
                checked={wizard.routeStyle.preferCentral === true}
                onChange={(e) =>
                  patchWizard({
                    routeStyle: {
                      ...wizard.routeStyle,
                      preferCentral: e.target.checked,
                    },
                  })
                }
              />
              Priorizar centro
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={wizard.routeStyle.preferScenicWalks === true}
                onChange={(e) =>
                  patchWizard({
                    routeStyle: {
                      ...wizard.routeStyle,
                      preferScenicWalks: e.target.checked,
                    },
                  })
                }
              />
              Preferir andar si el camino es bonito
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={wizard.routeStyle.detours === true}
                onChange={(e) =>
                  patchWizard({
                    routeStyle: { ...wizard.routeStyle, detours: e.target.checked },
                  })
                }
              />
              Paradas extra entre sitios
            </label>
          </details>

          <div className="wiz-v2-footer">
            <button type="button" className="btn ghost" onClick={() => go(0)}>
              Atrás
            </button>
            <button
              type="button"
              className="btn primary wiz-v2-cta"
              disabled={activePrefs.length === 0 || !styleReady}
              onClick={() => go(2)}
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="wiz-v2-stage">
          <header className="wiz-v2-head">
            <h2>Tu viaje</h2>
            <p>Revisá y generá el plan.</p>
          </header>

          <article className="wiz-v2-boarding">
            {wizard.cityPick && photoForDestination(wizard.cityPick.name) ? (
              <img
                className="wiz-v2-boarding-photo"
                src={photoForDestination(wizard.cityPick.name)}
                alt=""
              />
            ) : null}
            <div className="wiz-v2-boarding-body">
              <p className="wiz-v2-boarding-k">Destino</p>
              <strong>{wizard.cityPick?.name ?? wizard.cityQuery}</strong>
              <p className="wiz-v2-boarding-k">Fechas</p>
              <span>
                {wizard.startDate} → {wizard.endDate}
                {nights > 0 ? ` · ${nights} noches` : ''}
              </span>
              <p className="wiz-v2-boarding-k">Estilo</p>
              <span>{preview}</span>
            </div>
          </article>

          <ul className="wiz-v2-checklist">
            <li>
              <button type="button" className="wiz-summary-row" onClick={() => go(0)}>
                <span className="wiz-summary-k">Destino</span>
                <span className="wiz-summary-v">
                  {wizard.cityPick?.name ?? wizard.cityQuery}
                  {wizard.areaScale !== 'city' ? ` · ${wizard.areaScale}` : ''}
                </span>
                <span className="wiz-summary-edit">Editar</span>
              </button>
            </li>
            <li>
              <button type="button" className="wiz-summary-row" onClick={() => go(0)}>
                <span className="wiz-summary-k">Fechas</span>
                <span className="wiz-summary-v">
                  {wizard.startDate} → {wizard.endDate}
                  {nights > 0 ? ` · ${nights} noche${nights === 1 ? '' : 's'}` : ''}
                </span>
                <span className="wiz-summary-edit">Editar</span>
              </button>
            </li>
            <li>
              <button type="button" className="wiz-summary-row" onClick={() => go(0)}>
                <span className="wiz-summary-k">Llegada / hotel</span>
                <span className="wiz-summary-v">
                  Vuelo {wizard.arrivalTime} / salida {wizard.departureTime}
                  {wizard.airportPick ? ` · ${wizard.airportPick.name}` : ''}
                  {wizard.hotelPick
                    ? ` · ${wizard.hotelPick.name}`
                    : wizard.hotelSkipped
                      ? ' · sin hotel'
                      : ''}
                </span>
                <span className="wiz-summary-edit">Editar</span>
              </button>
            </li>
            <li>
              <button type="button" className="wiz-summary-row" onClick={() => go(1)}>
                <span className="wiz-summary-k">Gustos</span>
                <span className="wiz-summary-v">
                  {activePrefs.map((k) => PREFERENCE_LABELS[k]).join(', ') || '—'}
                </span>
                <span className="wiz-summary-edit">Editar</span>
              </button>
            </li>
            <li>
              <button type="button" className="wiz-summary-row" onClick={() => go(1)}>
                <span className="wiz-summary-k">Cómo viajáis</span>
                <span className="wiz-summary-v">{preview}</span>
                <span className="wiz-summary-edit">Editar</span>
              </button>
            </li>
          </ul>

          <div className="wiz-block" style={{ marginTop: '1.25rem' }}>
            <h3 className="wiz-block-title">¿Algo que sí o sí queréis ver?</h3>
            <p className="muted tiny">
              Opcional. Si no conocéis la ciudad, dejadlo vacío: la app os recomienda. Si ya tenéis
              un monumento o museo en mente, añadidlo y lo priorizamos en el plan.
            </p>
            {(wizard.mustVisits ?? []).length > 0 && (
              <ul className="chips" style={{ marginBottom: '0.75rem' }}>
                {(wizard.mustVisits ?? []).map((m) => (
                  <li key={`${m.name}-${m.lat}`}>
                    <button
                      type="button"
                      className="chip on"
                      onClick={() =>
                        patchWizard({
                          mustVisits: (wizard.mustVisits ?? []).filter(
                            (x) => !(x.name === m.name && x.lat === m.lat),
                          ),
                        })
                      }
                    >
                      {m.name} ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="field">
              <span>Buscar sitio</span>
              <input
                value={wizard.mustVisitQuery ?? ''}
                onChange={(e) => patchWizard({ mustVisitQuery: e.target.value })}
                placeholder="Ej. Tower Bridge, British Museum…"
                disabled={!wizard.cityPick}
              />
            </label>
            {searchingMust && <p className="muted tiny">Buscando…</p>}
            {mustSuggestions.length > 0 && (
              <ul className="suggest-cities">
                {mustSuggestions.map((s) => (
                  <li key={`${s.lat}-${s.lng}-${s.label}`}>
                    <button
                      type="button"
                      onClick={() => {
                        const exists = (wizard.mustVisits ?? []).some(
                          (m) => Math.abs(m.lat - s.lat) < 0.0005 && Math.abs(m.lng - s.lng) < 0.0005,
                        )
                        if (!exists) {
                          patchWizard({
                            mustVisits: [
                              ...(wizard.mustVisits ?? []),
                              { name: s.shortName, lat: s.lat, lng: s.lng },
                            ],
                            mustVisitQuery: '',
                          })
                        } else {
                          patchWizard({ mustVisitQuery: '' })
                        }
                        setMustSuggestions([])
                      }}
                    >
                      <strong>{s.shortName}</strong>
                      <span className="muted tiny">{s.kind} · {s.displayName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(() => {
            const budget = estimateTripBudget({
              cityName: wizard.cityPick?.name ?? wizard.cityQuery,
              displayName: wizard.cityPick?.displayName,
              startDate: wizard.startDate,
              endDate: wizard.endDate,
              foodBudget: wizard.routeStyle.foodBudget ?? undefined,
              pace: wizard.routeStyle.pace ?? undefined,
            })
            return (
              <div className="budget-box">
                <strong>Presupuesto orientativo</strong>
                <p>
                  ~{budget.perPersonPerDayMin}–{budget.perPersonPerDayMax} €/persona/día · total ~{' '}
                  {budget.totalMin}–{budget.totalMax} €/persona ({budget.days} días)
                </p>
                <p className="muted tiny">{budget.blurb}</p>
              </div>
            )
          })()}

          {error && <p className="error">{error}</p>}

          <div className="wiz-v2-footer">
            <button type="button" className="btn ghost" onClick={() => go(1)} disabled={generating}>
              Atrás
            </button>
            <button
              type="button"
              className="btn primary wiz-v2-cta"
              onClick={() => void generateTrip()}
              disabled={generating || !wizard.cityPick}
            >
              {generating ? 'Generando…' : 'Generar viaje'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
