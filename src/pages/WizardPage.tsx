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
import { findAirportsForCity, type AirportOption } from '../lib/airports'
import { estimateTripBudget } from '../lib/budget'
import { isGoogleMapsUrl } from '../lib/importGmaps'
import {
  AREA_SCALE_OPTIONS,
  detectAreaScale,
  type AreaScale,
} from '../lib/tripScale'

const QUICK_DESTINATIONS: Array<{
  label: string
  name: string
  displayName: string
  lat: number
  lng: number
  hint?: string
  scale?: AreaScale
  mobility?: 'walk' | 'mixed' | 'transit' | 'drive'
}> = [
  {
    label: 'Londres',
    name: 'Londres',
    displayName: 'London, England, United Kingdom',
    lat: 51.5074,
    lng: -0.1278,
    scale: 'city',
  },
  {
    label: 'Núremberg',
    name: 'Núremberg',
    displayName: 'Nuremberg, Bavaria, Germany',
    lat: 49.4521,
    lng: 11.0767,
    hint: 'Navidad',
    scale: 'city',
  },
  {
    label: 'Japón',
    name: 'Japón',
    displayName: 'Japan',
    lat: 36.2048,
    lng: 138.2529,
    scale: 'country',
    mobility: 'transit',
  },
  {
    label: 'Madrid',
    name: 'Madrid',
    displayName: 'Madrid, Comunidad de Madrid, España',
    lat: 40.4168,
    lng: -3.7038,
    scale: 'city',
  },
  {
    label: 'Roma',
    name: 'Roma',
    displayName: 'Rome, Lazio, Italy',
    lat: 41.9028,
    lng: 12.4964,
    scale: 'city',
  },
  {
    label: 'Dolomitas',
    name: 'Dolomitas',
    displayName: 'Dolomites, Italy',
    lat: 46.4102,
    lng: 11.844,
    hint: 'ruta furgoneta',
    scale: 'region',
    mobility: 'drive',
  },
  {
    label: 'Suiza',
    name: 'Suiza',
    displayName: 'Switzerland',
    lat: 46.8182,
    lng: 8.2275,
    scale: 'country',
    mobility: 'transit',
  },
  {
    label: 'Boston',
    name: 'Boston',
    displayName: 'Boston, Massachusetts, United States',
    lat: 42.3601,
    lng: -71.0589,
    scale: 'city',
  },
  {
    label: 'San Diego',
    name: 'San Diego',
    displayName: 'San Diego, California, United States',
    lat: 32.7157,
    lng: -117.1611,
    scale: 'city',
  },
]

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
  prefs: Preferences
  pace?: Pace
  explore?: ExploreMode
}> = [
  {
    id: 'classic',
    label: 'Clásico',
    desc: 'Iconos, museos y buen comer — sin prisa',
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

  function pickQuickDestination(d: (typeof QUICK_DESTINATIONS)[number]) {
    const scale =
      d.scale ??
      detectAreaScale(d.name, d.displayName, d.mobility ?? wizard.routeStyle.mobility ?? undefined)
    patchWizard({
      cityQuery: d.name,
      cityPick: {
        name: d.name,
        displayName: d.displayName,
        lat: d.lat,
        lng: d.lng,
      },
      hotelPick: null,
      hotelSkipped: false,
      hotelQuery: '',
      airportPick: null,
      areaScale: scale,
      // movilidad se elige en el paso de ritmo
    })
    setCitySuggestions([])
  }

  return (
    <div className="page wizard-page">
      <button type="button" className="btn ghost sm back" onClick={() => setView({ name: 'home' })}>
        ← Inicio
      </button>

      <header className="wiz-header">
        <p className="brand small">RutaDos</p>
        <h1>Nuevo viaje</h1>
        <p className="muted wiz-lede">Tres pasos. Lo podéis cambiar después.</p>
      </header>

      <nav className="wiz-progress" aria-label="Pasos del viaje">
        {['Viaje', 'Estilo', 'Listo'].map((label, i) => (
          <button
            key={label}
            type="button"
            className={
              i === step ? 'wiz-step active' : i < step ? 'wiz-step done' : 'wiz-step'
            }
            onClick={() => {
              if (i < step) go(i)
            }}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className="wiz-step-num">{i + 1}</span>
            <span className="wiz-step-label">{label}</span>
          </button>
        ))}
      </nav>

      {step === 0 && (
        <section className="wiz-stage">
          <h2 className="wiz-title">¿A dónde vais?</h2>
          <p className="muted">
            Escribe ciudad, región o país y <strong>elige una opción de la lista</strong> para
            confirmar el destino exacto.
          </p>

          <label className="field">
            <span>Buscar destino</span>
            <input
              value={wizard.cityQuery}
              onChange={(e) =>
                patchWizard({
                  cityQuery: e.target.value,
                  cityPick: null,
                  hotelPick: null,
                })
              }
              placeholder="Londres, Gran Londres, Japón…"
              autoFocus
              autoComplete="off"
            />
          </label>

          {searchingCity && <p className="muted tiny">Buscando coincidencias…</p>}

          {citySuggestions.length > 0 && !wizard.cityPick && (
            <div className="dest-dropdown">
              <p className="dest-dropdown-label">Selecciona el destino reconocido</p>
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
                          // No premarcar movilidad: la eligen en el paso de estilo
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
            <div className="hint-box dest-confirmed">
              <strong>Destino confirmado:</strong> {wizard.cityPick.displayName}
              <button
                type="button"
                className="btn ghost sm"
                style={{ marginLeft: '0.5rem' }}
                onClick={() => patchWizard({ cityPick: null })}
              >
                Cambiar
              </button>
            </div>
          )}

          {wizard.cityPick && (
            <div className="field">
              <span>Alcance del viaje</span>
              <p className="muted tiny">
                Ciudad + afueras = centro, barrios, afueras y pueblos cercanos. Región = varios
                pueblos en furgoneta. País = varias ciudades.
              </p>
              <div className="option-cards compact">
                {AREA_SCALE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={
                      wizard.areaScale === o.value ? 'option-card on' : 'option-card'
                    }
                    onClick={() => {
                      patchWizard({
                        areaScale: o.value,
                        // No premarcar movilidad aquí
                      })
                    }}
                  >
                    <strong>{o.title}</strong>
                    <span className="muted tiny">{o.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!wizard.cityPick && wizard.cityQuery.trim().length >= 2 && !searchingCity && (
            <p className="muted tiny">Elige una fila de la lista para continuar.</p>
          )}

          <div className="quick-cities">
            <p className="dest-dropdown-label" style={{ width: '100%', marginBottom: 0 }}>
              Próximos viajes (un toque)
            </p>
            {QUICK_DESTINATIONS.map((d) => (
              <button
                key={d.label}
                type="button"
                className={wizard.cityPick?.name === d.name ? 'chip on' : 'chip'}
                onClick={() => pickQuickDestination(d)}
                title={d.hint}
              >
                {d.label}
                {d.hint ? ` · ${d.hint}` : ''}
              </button>
            ))}
          </div>

          <div className="wiz-block">
            <h3 className="wiz-block-title">Fechas</h3>
            <div className="grid-2">
              <TripDateFields
                label="Día de llegada"
                value={wizard.startDate}
                onChange={setStartDate}
              />
              <TripDateFields
                label="Día de salida"
                value={wizard.endDate}
                min={wizard.startDate}
                onChange={setEndDate}
              />
            </div>
            {nights > 0 && (
              <p className="hint-box">
                {nights === 1 ? '1 noche' : `${nights} noches`} · {nights + 1} días de plan
              </p>
            )}
          </div>

          <details className="wiz-optional">
            <summary>Llegada y dónde dormís (opcional)</summary>

            <div className="wiz-block">
              <h3 className="wiz-block-title">Horarios de vuelo</h3>
              <div className="grid-2">
                <label className="field">
                  <span>Hora del vuelo de llegada</span>
                  <input
                    type="time"
                    value={wizard.arrivalTime}
                    onChange={(e) => patchWizard({ arrivalTime: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Hora del vuelo de salida</span>
                  <input
                    type="time"
                    value={wizard.departureTime}
                    onChange={(e) => patchWizard({ departureTime: e.target.value })}
                  />
                </label>
              </div>
            </div>

            <div className="wiz-block">
              <h3 className="wiz-block-title">Aeropuerto</h3>
              {loadingAirports && <p className="muted tiny">Buscando aeropuertos…</p>}
              {airports.length > 0 ? (
                <ul className="airport-chips">
                  {airports.map((a) => {
                    const selected =
                      wizard.airportPick?.name === a.name &&
                      wizard.airportPick?.lat === a.lat
                    return (
                      <li key={a.code || a.name}>
                        <button
                          type="button"
                          className={selected ? 'chip active' : 'chip'}
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
                          <strong>
                            {a.name}
                            {a.code ? ` · ${a.code}` : ''}
                          </strong>
                          {a.blurb && <span className="muted tiny">{a.blurb}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                !loadingAirports && (
                  <p className="muted tiny">
                    No hay lista fija para este destino; podéis seguir sin aeropuerto.
                  </p>
                )
              )}
              {wizard.airportPick && (
                <p className="hint-box dest-confirmed">
                  <strong>Aeropuerto:</strong> {wizard.airportPick.name}
                </p>
              )}
            </div>

            <div className="wiz-block">
              <h3 className="wiz-block-title">Hotel o barrio</h3>
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
                  placeholder={`Nombre, o pegá un enlace de Maps (maps.app.goo.gl/…)`}
                  autoComplete="off"
                />
              </label>
              {searchingHotel && (
                <p className="muted tiny">
                  {isGoogleMapsUrl(wizard.hotelQuery)
                    ? 'Abriendo enlace de Google Maps…'
                    : 'Buscando en mapas…'}
                </p>
              )}
              {hotelSuggestions.length > 0 && !wizard.hotelPick && (
                <div className="dest-dropdown">
                  <p className="dest-dropdown-label">Selecciona para confirmar</p>
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
                    <strong>Hotel confirmado:</strong> {wizard.hotelPick.name}
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
                    height="180px"
                    showLegs={Boolean(wizard.airportPick)}
                    showLegend={false}
                    defaultCenter={{ lat: wizard.hotelPick.lat, lng: wizard.hotelPick.lng }}
                  />
                </>
              )}

              {wizard.hotelSkipped && !wizard.hotelPick && (
                <p className="hint-box">Seguiréis sin hotel fijado (se puede añadir luego).</p>
              )}

              <p className="muted tiny">
                Tip: pegá cualquier enlace de Google Maps y lo confirmamos solo.
              </p>

              {!wizard.hotelPick && (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    patchWizard({ hotelSkipped: true, hotelPick: null })
                    go(1)
                  }}
                >
                  Seguir sin hotel
                </button>
              )}
            </div>
          </details>

          <div className="wiz-actions">
            <button
              type="button"
              className="btn primary"
              disabled={!wizard.cityPick || wizard.endDate < wizard.startDate}
              onClick={() => go(1)}
            >
              Siguiente
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="wiz-stage">
          <h2 className="wiz-title">Qué te apetece y cómo viajar</h2>
          <p className="muted">Elegí un estilo o armá con las categorías, luego el ritmo para moverte.</p>

          <div className="wiz-hero-presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={selectedPreset === p.id ? 'wiz-hero-preset on' : 'wiz-hero-preset'}
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
                <strong>{p.label}</strong>
                <span>{p.desc}</span>
              </button>
            ))}
          </div>

          <p className="wiz-section-label">O tocá categorías</p>
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

          <details className="wiz-fine">
            <summary>Afinar gustos uno a uno</summary>
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

          <p className="hint-box">
            Activo: {activePrefs.map((k) => PREFERENCE_LABELS[k]).join(', ') || 'nada aún'}
          </p>

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

          <div className="wiz-pill-block">
            <p className="wiz-section-label">Cómo moverte</p>
            <div className="wiz-pills">
              {MOBILITY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={
                    wizard.routeStyle.mobility === o.value ? 'wiz-pill on' : 'wiz-pill'
                  }
                  onClick={() =>
                    patchWizard({ routeStyle: { ...wizard.routeStyle, mobility: o.value } })
                  }
                >
                  {o.title}
                </button>
              ))}
            </div>
          </div>

          <div className="wiz-pill-block">
            <p className="wiz-section-label">Comida</p>
            <div className="wiz-pills">
              {FOOD_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={
                    wizard.routeStyle.foodBudget === o.value ? 'wiz-pill on' : 'wiz-pill'
                  }
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

          <details className="wiz-fine">
            <summary>Opciones avanzadas</summary>
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
              Priorizar centro en el plan sugerido
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
              Proponer paradas extra entre sitios
            </label>
          </details>

          <p className="hint-box">
            Resumen: {preview}
            {!styleReady ? ' · Falta ritmo, movilidad o comida.' : ''}
          </p>

          <div className="wiz-actions">
            <button type="button" className="btn ghost" onClick={() => go(0)}>
              Atrás
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={activePrefs.length === 0 || !styleReady}
              onClick={() => go(2)}
            >
              Siguiente
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="wiz-stage">
          <h2 className="wiz-title">Así queda el viaje</h2>
          <p className="muted">Revisad y generad. Podéis volver a cualquier paso.</p>

          <ul className="wiz-summary">
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

          <div className="wiz-actions">
            <button type="button" className="btn ghost" onClick={() => go(1)} disabled={generating}>
              Atrás
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => void generateTrip()}
              disabled={generating || !wizard.cityPick}
            >
              {generating ? 'Generando plan (~15–40 s)…' : 'Generar viaje'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
