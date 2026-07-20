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
import { searchDestinations, searchHotels, type PlaceSuggestion } from '../lib/geocode'
import { TripDateFields } from '../components/TripDateFields'
import { findAirportsForCity, type AirportOption } from '../lib/airports'
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

const PREF_GROUPS: Array<{
  title: string
  blurb: string
  keys: PreferenceKey[]
}> = [
  {
    title: 'De día',
    blurb: 'Mañana y tarde',
    keys: [
      'monuments',
      'museums',
      'architecture',
      'viewpoints',
      'parks',
      'neighborhoods',
      'hidden',
      'shopping',
      'markets',
    ],
  },
  {
    title: 'Comer',
    blurb: 'Comida, cena y pausas (también de noche)',
    keys: ['restaurants', 'cafes', 'street_food'],
  },
  {
    title: 'De noche',
    blurb: 'Ambiente nocturno — no solo bares',
    keys: ['night_walks', 'shows', 'nightlife'],
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

function emptyNightlife(prefs: Preferences): Preferences {
  return { ...prefs, nightlife: false, night_walks: prefs.night_walks ?? true }
}

const PRESETS: Array<{ id: string; label: string; desc: string; prefs: Preferences }> = [
  {
    id: 'classic',
    label: 'Clásico',
    desc: 'Iconos + museos + comer',
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
    id: 'culture',
    label: 'Cultural',
    desc: 'Museos, arquitectura y teatros',
    prefs: emptyNightlife({
      ...DEFAULT_PREFERENCES,
      monuments: true,
      museums: true,
      architecture: true,
      viewpoints: true,
      parks: true,
      neighborhoods: true,
      hidden: true,
      restaurants: true,
      cafes: true,
      markets: false,
      street_food: false,
      shopping: false,
      shows: true,
      nightlife: false,
    }),
  },
  {
    id: 'food',
    label: 'Foodie',
    desc: 'Mercados, restaurantes y café',
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

const PACE_OPTIONS: Array<{ value: Pace; title: string; desc: string }> = [
  { value: 'relaxed', title: 'Tranquilo', desc: 'Pocas paradas, margen para café' },
  { value: 'normal', title: 'Equilibrado', desc: 'Ver lo importante sin prisas' },
  { value: 'intense', title: 'A tope', desc: 'Días densos, más sitios' },
]

const EXPLORE_OPTIONS: Array<{ value: ExploreMode; title: string; desc: string }> = [
  { value: 'icons', title: 'Imprescindibles', desc: 'Lo más famoso primero' },
  { value: 'mixed', title: 'Turismo + local', desc: 'Iconos y barrios' },
  { value: 'local', title: 'Como locales', desc: 'Menos postal, más barrio' },
]

const MOBILITY_OPTIONS: Array<{ value: Mobility; title: string; desc: string }> = [
  { value: 'walk', title: 'Andando', desc: 'Pie primero; transporte si es lejos' },
  { value: 'mixed', title: 'Lo óptimo', desc: 'Pie / metro / taxi con motivo' },
  { value: 'transit', title: 'Transporte', desc: 'Ahorra piernas' },
  { value: 'drive', title: 'Coche / furgoneta', desc: 'Ideal Dolomitas u otras rutas' },
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
  const [hotelSuggestions, setHotelSuggestions] = useState<PlaceSuggestion[]>([])
  const [searchingCity, setSearchingCity] = useState(false)
  const [searchingHotel, setSearchingHotel] = useState(false)
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
    if (view.name !== 'wizard' || view.step !== 1) return
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

  const nights = useMemo(
    () => nightsBetween(wizard.startDate, wizard.endDate),
    [wizard.startDate, wizard.endDate],
  )

  const activePrefs = useMemo(
    () => (Object.keys(wizard.preferences) as PreferenceKey[]).filter((k) => wizard.preferences[k]),
    [wizard.preferences],
  )

  const preview = useMemo(() => {
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
      detectAreaScale(d.name, d.displayName, d.mobility ?? wizard.routeStyle.mobility)
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
      routeStyle: {
        ...wizard.routeStyle,
        mobility: d.mobility ?? (scale === 'region' ? 'drive' : wizard.routeStyle.mobility),
      },
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
        <p className="muted wiz-lede">Cuatro pasos. Lo podéis cambiar después.</p>
      </header>

      <nav className="wiz-progress" aria-label="Pasos del viaje">
        {['Destino', 'Llegada', 'Gustos', 'Cómo viajáis'].map((label, i) => (
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
                          wizard.routeStyle.mobility,
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
                          routeStyle: {
                            ...wizard.routeStyle,
                            mobility:
                              scale === 'region'
                                ? 'drive'
                                : scale === 'country' && wizard.routeStyle.mobility === 'walk'
                                  ? 'transit'
                                  : wizard.routeStyle.mobility,
                          },
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
                        routeStyle: {
                          ...wizard.routeStyle,
                          mobility:
                            o.value === 'region'
                              ? 'drive'
                              : o.value === 'country' && wizard.routeStyle.mobility === 'walk'
                                ? 'transit'
                                : wizard.routeStyle.mobility,
                        },
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
          <h2 className="wiz-title">Llegada y hotel</h2>
          <p className="muted">
            Fechas, aeropuerto y base del día (ida y vuelta al hotel).
            Confirma el hotel (o barrio) en la lista antes de seguir. Si no lo encuentra, pega el
            enlace de Google Maps del hotel.
          </p>

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
            )}

            {wizard.hotelSkipped && !wizard.hotelPick && (
              <p className="hint-box">Seguiréis sin hotel fijado (se puede añadir luego).</p>
            )}

            <p className="muted tiny">
              Tip: pegá cualquier enlace de Google Maps. RutaDos lo abre y confirma el sitio.
            </p>
          </div>

          <div className="wiz-actions">
            <button type="button" className="btn ghost" onClick={() => go(0)}>
              Atrás
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                patchWizard({ hotelSkipped: true, hotelPick: null })
                go(2)
              }}
            >
              Seguir sin hotel
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!wizard.hotelPick}
              onClick={() => go(2)}
            >
              Siguiente
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="wiz-stage">
          <h2 className="wiz-title">Qué os gusta</h2>
          <p className="muted">
            Empezad con un preset y afinad. De noche: cenas (restaurantes), paseos iluminados y, si
            queréis, bares.
          </p>

          <div className="preset-row">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="preset-card"
                onClick={() =>
                  patchWizard({
                    preferences: { ...p.prefs, nightlife: false, night_walks: true },
                  })
                }
              >
                <strong>{p.label}</strong>
                <span>{p.desc}</span>
              </button>
            ))}
          </div>

          {PREF_GROUPS.map((group) => (
            <div key={group.title} className="pref-group">
              <div className="pref-group-head">
                <h3>{group.title}</h3>
                <p>{group.blurb}</p>
              </div>
              <div className="pref-cards">
                {group.keys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={wizard.preferences[key] ? 'pref-card on' : 'pref-card'}
                    onClick={() => togglePref(key)}
                  >
                    <strong>{PREFERENCE_LABELS[key]}</strong>
                    <span>{PREF_HINTS[key]}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <p className="hint-box">
            Activo: {activePrefs.map((k) => PREFERENCE_LABELS[k]).join(', ') || 'nada aún'}
          </p>

          <div className="wiz-actions">
            <button type="button" className="btn ghost" onClick={() => go(1)}>
              Atrás
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={activePrefs.length === 0}
              onClick={() => go(3)}
            >
              Siguiente
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="wiz-stage">
          <h2 className="wiz-title">Cómo queréis recorrer la ciudad</h2>
          <p className="muted">Densidad del día, tipo de sitios y cómo os movéis.</p>

          <div className="option-block">
            <h3>Ritmo</h3>
            <div className="option-cards">
              {PACE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={
                    wizard.routeStyle.pace === o.value ? 'option-card on' : 'option-card'
                  }
                  onClick={() =>
                    patchWizard({ routeStyle: { ...wizard.routeStyle, pace: o.value } })
                  }
                >
                  <strong>{o.title}</strong>
                  <span>{o.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="option-block">
            <h3>Exploración</h3>
            <div className="option-cards">
              {EXPLORE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={
                    wizard.routeStyle.explore === o.value ? 'option-card on' : 'option-card'
                  }
                  onClick={() =>
                    patchWizard({ routeStyle: { ...wizard.routeStyle, explore: o.value } })
                  }
                >
                  <strong>{o.title}</strong>
                  <span>{o.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="option-block">
            <h3>Cómo moveros</h3>
            <div className="option-cards">
              {MOBILITY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={
                    wizard.routeStyle.mobility === o.value ? 'option-card on' : 'option-card'
                  }
                  onClick={() =>
                    patchWizard({ routeStyle: { ...wizard.routeStyle, mobility: o.value } })
                  }
                >
                  <strong>{o.title}</strong>
                  <span>{o.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="option-block">
            <h3>Comida</h3>
            <div className="option-cards compact">
              {(
                [
                  { value: 'low' as const, title: 'Económica', desc: 'Casual / street food' },
                  { value: 'mid' as const, title: 'Media', desc: 'Buenas cartas sin lujo' },
                  { value: 'high' as const, title: 'Especial', desc: 'Más encanto' },
                ] as const
              ).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={
                    wizard.routeStyle.foodBudget === o.value ? 'option-card on' : 'option-card'
                  }
                  onClick={() =>
                    patchWizard({
                      routeStyle: { ...wizard.routeStyle, foodBudget: o.value },
                    })
                  }
                >
                  <strong>{o.title}</strong>
                  <span>{o.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={wizard.routeStyle.preferCentral !== false}
              onChange={(e) =>
                patchWizard({
                  routeStyle: {
                    ...wizard.routeStyle,
                    preferCentral: e.target.checked,
                  },
                })
              }
            />
            Plan sugerido: priorizar centro (afueras en wishlist / armar nosotros)
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={wizard.routeStyle.preferScenicWalks}
              onChange={(e) =>
                patchWizard({
                  routeStyle: {
                    ...wizard.routeStyle,
                    preferScenicWalks: e.target.checked,
                  },
                })
              }
            />
            Si hay un barrio o parque bonito de camino, preferir andar
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={wizard.routeStyle.detours}
              onChange={(e) =>
                patchWizard({
                  routeStyle: { ...wizard.routeStyle, detours: e.target.checked },
                })
              }
            />
            Proponer paradas extra entre un sitio y otro
          </label>

          <p className="hint-box">Resumen: {preview}</p>
          {error && <p className="error">{error}</p>}

          <div className="wiz-actions">
            <button type="button" className="btn ghost" onClick={() => go(2)} disabled={generating}>
              Atrás
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => void generateTrip()}
              disabled={generating}
            >
              {generating ? 'Generando plan (~15–40 s)…' : 'Generar viaje'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
