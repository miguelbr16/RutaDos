import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { geocodeCity, geocodeHotel } from './lib/geocode'
import { discoverPlaces } from './lib/discover'
import { landmarksForDestination, mergeLandmarks } from './lib/landmarks'
import { boostSponsoredPlaces } from './lib/partners'
import {
  addManualStop,
  addPlaceAsStop,
  buildDayPlans,
  chaosReplanDay,
  moveStop,
  optimizeKeepingDayArc,
  optimizeOrder,
  rebuildDayTransport,
  removeStop,
  replanDayForFocus,
  type ChaosMode,
} from './lib/plan'
import { uid } from './lib/id'
import {
  DEFAULT_LOGISTICS,
  DEFAULT_PREFERENCES,
  DEFAULT_ROUTE_STYLE,
  EMPTY_PREFERENCES,
  type AreaScale,
  type DayFocus,
  type ExploreMode,
  type GeoPlace,
  type Mobility,
  type Pace,
  type Preferences,
  type RouteStyle,
  type TransitMode,
  type Trip,
  type TripLogistics,
} from './types'
import { deleteRemoteTrip, isSupabaseConfigured, upsertTrip } from './lib/sync'
import { bboxForScale, detectAreaScale } from './lib/tripScale'

function scheduleSync(trip: Trip) {
  if (!isSupabaseConfigured) return
  void import('./authStore').then(({ useAuthStore }) => {
    const coupleId = useAuthStore.getState().coupleId
    if (!coupleId) return
    void upsertTrip(trip, coupleId)
  })
}

function scheduleDelete(tripId: string) {
  if (!isSupabaseConfigured) return
  void import('./authStore').then(({ useAuthStore }) => {
    const coupleId = useAuthStore.getState().coupleId
    if (!coupleId) return
    void deleteRemoteTrip(tripId)
  })
}

function parkPool(trip: Trip): GeoPlace[] {
  return trip.places.filter((p) => p.category === 'park')
}

function normalizePreferences(p?: Partial<Preferences> | null): Preferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...p,
    // Always force nightlife off unless explicitly true in saved trip prefs
    nightlife: p?.nightlife === true,
    night_walks: p?.night_walks !== false,
  }
}

function normalizeTrip(t: Trip): Trip {
  return {
    ...t,
    logistics: {
      ...DEFAULT_LOGISTICS,
      ...t.logistics,
      hotel: t.logistics?.hotel ?? null,
      airport: t.logistics?.airport ?? null,
    },
    preferences: normalizePreferences(t.preferences),
    routeStyle: {
      ...DEFAULT_ROUTE_STYLE,
      ...t.routeStyle,
      preferScenicWalks: t.routeStyle?.preferScenicWalks ?? true,
      preferCentral: t.routeStyle?.preferCentral !== false,
    },
    days: (t.days ?? []).map((d) => ({
      ...d,
      intensity: d.intensity ?? 'full',
      stops: d.stops ?? [],
    })),
  }
}

interface WizardDraft {
  cityQuery: string
  /** Exact place chosen from the destination dropdown */
  cityPick: {
    name: string
    displayName: string
    lat: number
    lng: number
  } | null
  startDate: string
  endDate: string
  preferences: Preferences
  /** Ritmo/estilo: null = aún no elegido en el wizard */
  routeStyle: Omit<RouteStyle, 'pace' | 'explore' | 'mobility' | 'foodBudget'> & {
    pace: Pace | null
    explore: ExploreMode | null
    mobility: Mobility | null
    foodBudget: RouteStyle['foodBudget'] | null
  }
  arrivalTime: string
  departureTime: string
  hotelQuery: string
  hotelPick: { name: string; lat: number; lng: number } | null
  hotelSkipped: boolean
  airportPick: { name: string; code?: string; lat: number; lng: number } | null
  areaScale: AreaScale
  /** Sitios que queréis sí o sí (opcional; vacío = solo recomendaciones) */
  mustVisits: Array<{ name: string; lat: number; lng: number }>
  mustVisitQuery: string
}

type View =
  | { name: 'home' }
  | { name: 'wizard'; step: number }
  | { name: 'trip'; tripId: string }
  | { name: 'day'; tripId: string; dayId: string }
  | { name: 'onroute'; tripId: string; dayId: string }
  | { name: 'guides'; tripId: string }
  | { name: 'build'; tripId: string; dayId?: string }
  | { name: 'share'; token: string }
  | { name: 'copilot'; tripId?: string; dayId?: string }
  | { name: 'auth' }
  | { name: 'settings' }

interface AppState {
  trips: Trip[]
  activeTripId: string | null
  view: View
  wizard: WizardDraft
  generating: boolean
  error: string | null

  setView: (view: View) => void
  patchWizard: (patch: Partial<WizardDraft>) => void
  resetWizard: () => void
  generateTrip: () => Promise<void>
  deleteTrip: (id: string) => void
  setActiveTrip: (id: string | null) => void
  replaceTrips: (trips: Trip[]) => void
  mergePlacesIntoTrip: (tripId: string, places: GeoPlace[]) => void

  updateDayStops: (
    tripId: string,
    dayId: string,
    updater: (trip: Trip, dayId: string) => Trip['days'][number],
  ) => void
  optimizeDay: (tripId: string, dayId: string) => void
  moveDayStop: (tripId: string, dayId: string, stopId: string, dir: -1 | 1) => void
  removeDayStop: (tripId: string, dayId: string, stopId: string) => void
  addManualPlaceToDay: (
    tripId: string,
    dayId: string,
    data: { name: string; lat: number; lng: number; notes?: string },
  ) => void
  addSuggestedToDay: (tripId: string, dayId: string, place: GeoPlace) => void
  setDayFocus: (tripId: string, dayId: string, focus: DayFocus) => void
  setStopTransitMode: (
    tripId: string,
    dayId: string,
    stopId: string,
    mode: TransitMode,
  ) => void
  setStopUserNotes: (tripId: string, dayId: string, stopId: string, userNotes: string) => void
  setStopVisitStatus: (
    tripId: string,
    dayId: string,
    stopId: string,
    status: 'pending' | 'done' | 'skipped',
  ) => void
  setStopReaction: (
    tripId: string,
    dayId: string,
    stopId: string,
    reaction: 'like' | 'dislike' | null,
  ) => void
  /** Posponer parada: quitar del día y marcar en wishlist para otro día */
  deferStopToLater: (tripId: string, dayId: string, stopId: string) => void
  /** Añadir un sitio pospuesto a este día */
  addDeferredToDay: (tripId: string, dayId: string, placeId: string) => void
  chaosReplan: (tripId: string, dayId: string, mode: ChaosMode) => void
  setCustomDayPlaces: (tripId: string, dayId: string, places: GeoPlace[]) => void
  importTrips: (trips: Trip[]) => void
  /** Cambiar gustos/ritmo y rearmar días (opcionalmente rediscover sitios). */
  replanTripStyle: (
    tripId: string,
    patch: { preferences?: Preferences; routeStyle?: Partial<RouteStyle> },
    opts?: { rediscover?: boolean },
  ) => Promise<void>
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function plusDaysISO(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const initialWizard = (): WizardDraft => ({
  cityQuery: '',
  cityPick: null,
  startDate: todayISO(),
  endDate: plusDaysISO(2),
  preferences: { ...EMPTY_PREFERENCES },
  routeStyle: {
    ...DEFAULT_ROUTE_STYLE,
    pace: null,
    explore: null,
    mobility: null,
    foodBudget: null,
    preferScenicWalks: false,
    preferCentral: false,
    detours: false,
  },
  arrivalTime: '15:00',
  departureTime: '18:00',
  hotelQuery: '',
  hotelPick: null,
  hotelSkipped: false,
  airportPick: null,
  areaScale: 'city',
  mustVisits: [],
  mustVisitQuery: '',
})

function resolveWizardRouteStyle(w: WizardDraft['routeStyle']): RouteStyle {
  return {
    ...DEFAULT_ROUTE_STYLE,
    ...w,
    pace: w.pace ?? DEFAULT_ROUTE_STYLE.pace,
    explore: w.explore ?? DEFAULT_ROUTE_STYLE.explore,
    mobility: w.mobility ?? DEFAULT_ROUTE_STYLE.mobility,
    foodBudget: w.foodBudget ?? DEFAULT_ROUTE_STYLE.foodBudget,
    preferCentral: w.preferCentral === true,
    preferScenicWalks: w.preferScenicWalks === true,
    detours: w.detours === true,
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      trips: [],
      activeTripId: null,
      view: { name: 'home' },
      wizard: initialWizard(),
      generating: false,
      error: null,

      setView: (view) => set({ view, error: null }),
      patchWizard: (patch) => set({ wizard: { ...get().wizard, ...patch } }),
      resetWizard: () => set({ wizard: initialWizard() }),
      replaceTrips: (trips) => set({ trips: trips.map(normalizeTrip) }),

      mergePlacesIntoTrip: (tripId, places) => {
        set((s) => ({
          trips: s.trips.map((t) => {
            if (t.id !== tripId) return t
            const existingKeys = new Set(
              t.places.map(
                (p) => `${p.name.toLowerCase()}_${p.lat.toFixed(4)}_${p.lng.toFixed(4)}`,
              ),
            )
            const added = places.filter((p) => {
              const key = `${p.name.toLowerCase()}_${p.lat.toFixed(4)}_${p.lng.toFixed(4)}`
              if (existingKeys.has(key)) return false
              existingKeys.add(key)
              return true
            })
            const next = {
              ...t,
              places: [...added, ...t.places],
              updatedAt: new Date().toISOString(),
            }
            scheduleSync(next)
            return next
          }),
        }))
      },

      generateTrip: async () => {
        const { wizard } = get()
        if (!wizard.cityQuery.trim()) {
          set({ error: 'Escribe una ciudad o destino' })
          return
        }
        if (!wizard.cityPick) {
          set({ error: 'Elige el destino exacto en la lista para confirmarlo' })
          return
        }
        if (wizard.endDate < wizard.startDate) {
          set({ error: 'La fecha de fin debe ser posterior al inicio' })
          return
        }
        const prefsOn = (Object.keys(wizard.preferences) as (keyof Preferences)[]).some(
          (k) => wizard.preferences[k],
        )
        if (!prefsOn) {
          set({ error: 'Elegid al menos un gusto (museos, comer, monumentos…)' })
          return
        }
        if (
          !wizard.routeStyle.pace ||
          !wizard.routeStyle.explore ||
          !wizard.routeStyle.mobility ||
          !wizard.routeStyle.foodBudget
        ) {
          set({ error: 'Elegid ritmo, exploración, movilidad y tipo de comida' })
          return
        }

        set({ generating: true, error: null })
        try {
          const dayCount = Math.max(
            1,
            Math.round(
              (Date.parse(wizard.endDate) - Date.parse(wizard.startDate)) / 86400000,
            ) + 1,
          )

          const resolvedStyle = resolveWizardRouteStyle(wizard.routeStyle)

          const areaScale: AreaScale =
            wizard.areaScale ||
            detectAreaScale(
              wizard.cityPick?.name || wizard.cityQuery,
              wizard.cityPick?.displayName,
              resolvedStyle.mobility,
            )

          let city
          if (wizard.cityPick) {
            city = {
              name: wizard.cityPick.name,
              displayName: wizard.cityPick.displayName,
              lat: wizard.cityPick.lat,
              lng: wizard.cityPick.lng,
              bbox: bboxForScale(
                wizard.cityPick.lat,
                wizard.cityPick.lng,
                areaScale,
                dayCount,
              ),
              scale: areaScale,
            }
          } else {
            city = await geocodeCity(wizard.cityQuery.trim())
            city = { ...city, scale: areaScale, bbox: bboxForScale(city.lat, city.lng, areaScale, dayCount) }
          }

          let logistics: TripLogistics = {
            arrivalTime: wizard.arrivalTime || '15:00',
            departureTime: wizard.departureTime || '18:00',
            hotel: null,
            airport: wizard.airportPick
              ? {
                  name: wizard.airportPick.name,
                  code: wizard.airportPick.code,
                  lat: wizard.airportPick.lat,
                  lng: wizard.airportPick.lng,
                }
              : null,
          }

          if (wizard.hotelPick) {
            logistics = {
              ...logistics,
              hotel: {
                name: wizard.hotelPick.name,
                query: wizard.hotelQuery.trim() || wizard.hotelPick.name,
                lat: wizard.hotelPick.lat,
                lng: wizard.hotelPick.lng,
              },
            }
          } else if (wizard.hotelQuery.trim()) {
            const hotelGeo = await geocodeHotel(wizard.hotelQuery.trim(), city.name)
            logistics = {
              ...logistics,
              hotel: {
                name: hotelGeo.name,
                query: wizard.hotelQuery.trim(),
                lat: hotelGeo.lat,
                lng: hotelGeo.lng,
              },
            }
          }

          const rawPlaces = await discoverPlaces(
            city,
            normalizePreferences(wizard.preferences),
            resolvedStyle,
            dayCount,
          )
          const mustPlaces: GeoPlace[] = (wizard.mustVisits ?? []).map((m, i) => ({
            id: `must-${i}-${m.lat.toFixed(4)}-${m.lng.toFixed(4)}`,
            name: m.name,
            lat: m.lat,
            lng: m.lng,
            category: 'must_see' as const,
            tier: 'must' as const,
            source: 'manual' as const,
            notes: 'Sí o sí · lo pedisteis',
            score: 130,
            tags: ['must_visit'],
          }))
          const places = boostSponsoredPlaces(
            mergeLandmarks(
              [...mustPlaces, ...rawPlaces],
              landmarksForDestination(city.name, city.displayName),
            ),
          )
          if (!places.length) {
            throw new Error(
              'No pudimos cargar sitios ahora (mapas libres saturados). Probá de nuevo en unos segundos.',
            )
          }

          const days = buildDayPlans(
            places,
            wizard.startDate,
            wizard.endDate,
            {
              ...resolvedStyle,
              preferCentral: resolvedStyle.preferCentral !== false,
            },
            logistics,
            { lat: city.lat, lng: city.lng },
            normalizePreferences(wizard.preferences),
          )

          const trip: Trip = {
            id: uid('trip'),
            title: city.name,
            city,
            startDate: wizard.startDate,
            endDate: wizard.endDate,
            preferences: { ...wizard.preferences },
            routeStyle: { ...resolvedStyle },
            logistics,
            places,
            days,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          set((s) => ({
            trips: [trip, ...s.trips],
            activeTripId: trip.id,
            generating: false,
            view: { name: 'trip', tripId: trip.id },
            wizard: initialWizard(),
          }))
          scheduleSync(trip)
        } catch (err) {
          set({
            generating: false,
            error: err instanceof Error ? err.message : 'Error al generar el viaje',
          })
        }
      },

      deleteTrip: (id) => {
        set((s) => ({
          trips: s.trips.filter((t) => t.id !== id),
          activeTripId: s.activeTripId === id ? null : s.activeTripId,
          view: { name: 'home' },
        }))
        scheduleDelete(id)
      },

      setActiveTrip: (id) => set({ activeTripId: id }),

      updateDayStops: (tripId, dayId, updater) =>
        set((s) => ({
          trips: s.trips.map((t) => {
            if (t.id !== tripId) return t
            const days = t.days.map((d) => (d.id === dayId ? updater(t, dayId) : d))
            const next = { ...t, days, updatedAt: new Date().toISOString() }
            scheduleSync(next)
            return next
          }),
        })),

      optimizeDay: (tripId, dayId) => {
        get().updateDayStops(tripId, dayId, (t, id) => {
          const day = t.days.find((d) => d.id === id)!
          const hotel = t.logistics?.hotel ?? null
          const ordered = optimizeKeepingDayArc(
            day.stops,
            hotel ? { lat: hotel.lat, lng: hotel.lng } : null,
          )
          return rebuildDayTransport(
            { ...day, stops: ordered },
            t.routeStyle.mobility,
            t.routeStyle,
            parkPool(t),
            { retime: true, hotel, wishlist: t.places },
          )
        })
      },

      setDayFocus: (tripId, dayId, focus) => {
        get().updateDayStops(tripId, dayId, (t, id) => {
          const day = t.days.find((d) => d.id === id)!
          const reserved = new Set<string>()
          for (const d of t.days) {
            if (d.id === id) continue
            for (const s of d.stops) {
              if (!s.isHotel && s.placeId) reserved.add(s.placeId)
            }
          }
          return replanDayForFocus(
            day,
            t.places,
            focus,
            t.routeStyle,
            t.logistics ?? DEFAULT_LOGISTICS,
            { lat: t.city.lat, lng: t.city.lng },
            reserved,
            normalizePreferences(t.preferences),
          )
        })
      },

      setStopTransitMode: (tripId, dayId, stopId, mode) => {
        get().updateDayStops(tripId, dayId, (t, id) => {
          const day = t.days.find((d) => d.id === id)!
          const hint: 'walk' | 'transit' | 'drive' =
            mode === 'walk' ? 'walk' : mode === 'taxi' || mode === 'drive' ? 'drive' : 'transit'
          const stops = day.stops.map((s) =>
            s.id === stopId
              ? {
                  ...s,
                  transitMode: mode,
                  transportToNext: hint,
                  transportReason:
                    mode === 'metro'
                      ? 'Metro/Tube — abrí Maps para ver la línea exacta.'
                      : mode === 'bus'
                        ? 'Bus — abrí Maps para ver número de línea.'
                        : mode === 'train'
                          ? 'Tren — abrí Maps para ver el servicio.'
                          : mode === 'walk'
                            ? 'Tramo a pie.'
                            : 'Taxi/coche.',
                }
              : s,
          )
          return { ...day, stops }
        })
      },

      setStopUserNotes: (tripId, dayId, stopId, userNotes) => {
        get().updateDayStops(tripId, dayId, (t, id) => {
          const day = t.days.find((d) => d.id === id)!
          return {
            ...day,
            stops: day.stops.map((s) =>
              s.id === stopId ? { ...s, userNotes: userNotes || undefined } : s,
            ),
          }
        })
      },

      setStopVisitStatus: (tripId, dayId, stopId, status) => {
        get().updateDayStops(tripId, dayId, (t, id) => {
          const day = t.days.find((d) => d.id === id)!
          return {
            ...day,
            stops: day.stops.map((s) =>
              s.id === stopId ? { ...s, visitStatus: status } : s,
            ),
          }
        })
      },

      setStopReaction: (tripId, dayId, stopId, reaction) => {
        set((s) => {
          const trips = s.trips.map((t) => {
            if (t.id !== tripId) return t
            const days = t.days.map((d) => {
              if (d.id !== dayId) return d
              return {
                ...d,
                stops: d.stops.map((stop) => {
                  if (stop.id !== stopId) return stop
                  return {
                    ...stop,
                    reaction: reaction ?? undefined,
                  }
                }),
              }
            })
            const stop = t.days.flatMap((d) => d.stops).find((x) => x.id === stopId)
            const places = t.places.map((p) => {
              if (!stop || p.id !== stop.placeId) return p
              return { ...p, reaction: reaction ?? undefined }
            })
            const next = { ...t, days, places, updatedAt: new Date().toISOString() }
            scheduleSync(next)
            return next
          })
          return { trips }
        })
      },

      deferStopToLater: (tripId, dayId, stopId) => {
        set((s) => {
          const trips = s.trips.map((t) => {
            if (t.id !== tripId) return t
            const day = t.days.find((d) => d.id === dayId)
            const stop = day?.stops.find((x) => x.id === stopId)
            if (!day || !stop || stop.isHotel) return t

            let places = [...t.places]
            const existing = places.find((p) => p.id === stop.placeId)
            if (existing) {
              places = places.map((p) =>
                p.id === stop.placeId
                  ? { ...p, deferred: true, score: Math.min(100, p.score + 15) }
                  : p,
              )
            } else {
              places.push({
                id: stop.placeId,
                name: stop.name,
                lat: stop.lat,
                lng: stop.lng,
                category: stop.category,
                tier: 'recommended',
                source: 'manual',
                score: 85,
                deferred: true,
                notes: 'Pospuesto para otro día',
              })
            }

            const nextDay = rebuildDayTransport(
              {
                ...day,
                stops: day.stops.filter((s) => s.id !== stopId),
              },
              t.routeStyle.mobility,
              t.routeStyle,
              parkPool({ ...t, places }),
              { retime: true, hotel: t.logistics?.hotel ?? null, wishlist: places },
            )

            const next: Trip = {
              ...t,
              places,
              days: t.days.map((d) => (d.id === dayId ? nextDay : d)),
              updatedAt: new Date().toISOString(),
            }
            scheduleSync(next)
            return next
          })
          return { trips }
        })
      },

      addDeferredToDay: (tripId, dayId, placeId) => {
        set((s) => {
          const trips = s.trips.map((t) => {
            if (t.id !== tripId) return t
            const place = t.places.find((p) => p.id === placeId)
            const day = t.days.find((d) => d.id === dayId)
            if (!place || !day) return t
            const nextDay = addPlaceAsStop(
              day,
              place,
              t.routeStyle.mobility,
              t.routeStyle,
              parkPool(t),
            )
            const places = t.places.map((p) =>
              p.id === placeId ? { ...p, deferred: false } : p,
            )
            const next: Trip = {
              ...t,
              places,
              days: t.days.map((d) => (d.id === dayId ? nextDay : d)),
              updatedAt: new Date().toISOString(),
            }
            scheduleSync(next)
            return next
          })
          return { trips }
        })
      },

      chaosReplan: (tripId, dayId, mode) => {
        get().updateDayStops(tripId, dayId, (t, id) => {
          const day = t.days.find((d) => d.id === id)!
          const reserved = new Set<string>()
          for (const d of t.days) {
            if (d.id === id) continue
            for (const s of d.stops) {
              if (!s.isHotel && s.placeId) reserved.add(s.placeId)
            }
          }
          return chaosReplanDay(
            day,
            mode,
            t.places,
            t.routeStyle,
            t.logistics ?? DEFAULT_LOGISTICS,
            { lat: t.city.lat, lng: t.city.lng },
            reserved,
          )
        })
      },

      setCustomDayPlaces: (tripId, dayId, places) => {
        get().updateDayStops(tripId, dayId, (t, id) => {
          const day = t.days.find((d) => d.id === id)!
          const hotel = t.logistics?.hotel ?? null
          const visits = places.map((p, i) => ({
            id: uid('stop'),
            placeId: p.id,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            category: p.category,
            notes: p.notes,
            order: i,
            slot: p.bestSlot,
          }))
          const ordered = optimizeOrder(
            visits,
            hotel ? { lat: hotel.lat, lng: hotel.lng } : null,
          )
          return rebuildDayTransport(
            { ...day, stops: ordered, planSource: 'custom' },
            t.routeStyle.mobility,
            t.routeStyle,
            parkPool(t),
            { retime: true, hotel, wishlist: t.places },
          )
        })
      },

      moveDayStop: (tripId, dayId, stopId, dir) => {
        get().updateDayStops(tripId, dayId, (t, id) => {
          const day = t.days.find((d) => d.id === id)!
          // No mover anclas de hotel
          const stop = day.stops.find((s) => s.id === stopId)
          if (stop?.isHotel) return day
          const next = moveStop(day, stopId, dir, t.routeStyle.mobility, t.routeStyle, parkPool(t))
          return rebuildDayTransport(next, t.routeStyle.mobility, t.routeStyle, parkPool(t), {
            retime: true,
            hotel: t.logistics?.hotel ?? null,
            wishlist: t.places,
          })
        })
      },

      removeDayStop: (tripId, dayId, stopId) => {
        get().updateDayStops(tripId, dayId, (t, id) => {
          const day = t.days.find((d) => d.id === id)!
          const stop = day.stops.find((s) => s.id === stopId)
          if (stop?.isHotel) return day
          const next = removeStop(day, stopId, t.routeStyle.mobility, t.routeStyle, parkPool(t))
          return rebuildDayTransport(next, t.routeStyle.mobility, t.routeStyle, parkPool(t), {
            retime: true,
            hotel: t.logistics?.hotel ?? null,
            wishlist: t.places,
          })
        })
      },

      addManualPlaceToDay: (tripId, dayId, data) => {
        const placeId = uid('place')
        get().updateDayStops(tripId, dayId, (t, id) => {
          const day = t.days.find((d) => d.id === id)!
          return addManualStop(day, data, t.routeStyle.mobility, t.routeStyle, parkPool(t))
        })
        set((s) => ({
          trips: s.trips.map((t) => {
            if (t.id !== tripId) return t
            const place: GeoPlace = {
              id: placeId,
              name: data.name,
              lat: data.lat,
              lng: data.lng,
              category: 'custom',
              tier: 'must',
              source: 'manual',
              notes: data.notes,
              score: 100,
              bestSlot: 'afternoon',
            }
            const next = {
              ...t,
              places: [place, ...t.places],
              updatedAt: new Date().toISOString(),
            }
            scheduleSync(next)
            return next
          }),
        }))
      },

      addSuggestedToDay: (tripId, dayId, place) => {
        get().updateDayStops(tripId, dayId, (t, id) => {
          const day = t.days.find((d) => d.id === id)!
          return addPlaceAsStop(day, place, t.routeStyle.mobility, t.routeStyle, parkPool(t))
        })
      },

      replanTripStyle: async (tripId, patch, opts) => {
        const trip = get().trips.find((t) => t.id === tripId)
        if (!trip) return
        set({ generating: true, error: null })
        try {
          const preferences = normalizePreferences({
            ...trip.preferences,
            ...(patch.preferences ?? {}),
          })
          const routeStyle: RouteStyle = {
            ...trip.routeStyle,
            ...(patch.routeStyle ?? {}),
            preferCentral:
              (patch.routeStyle?.preferCentral ?? trip.routeStyle.preferCentral) !== false,
          }

          let places = trip.places
          if (opts?.rediscover) {
            const dayCount = Math.max(1, trip.days.length)
            const raw = await discoverPlaces(trip.city, preferences, routeStyle, dayCount)
            const mustKeep = trip.places.filter(
              (p) => p.tier === 'must' || p.source === 'manual' || p.tags?.includes('must_visit'),
            )
            places = boostSponsoredPlaces(
              mergeLandmarks(
                [...mustKeep, ...raw],
                landmarksForDestination(trip.city.name, trip.city.displayName),
              ),
            )
            if (!places.length) places = trip.places
          }

          const days = buildDayPlans(
            places,
            trip.startDate,
            trip.endDate,
            routeStyle,
            trip.logistics ?? DEFAULT_LOGISTICS,
            { lat: trip.city.lat, lng: trip.city.lng },
            preferences,
          )

          const next: Trip = {
            ...trip,
            preferences,
            routeStyle,
            places,
            days,
            updatedAt: new Date().toISOString(),
          }
          set((s) => ({
            trips: s.trips.map((t) => (t.id === tripId ? next : t)),
            generating: false,
          }))
          scheduleSync(next)
        } catch (err) {
          set({
            generating: false,
            error: err instanceof Error ? err.message : 'No se pudo rearmar el plan',
          })
        }
      },

      importTrips: (trips) =>
        set((s) => {
          const next = [
            ...trips.map(normalizeTrip),
            ...s.trips.filter((t) => !trips.some((x) => x.id === t.id)),
          ]
          for (const t of trips.map(normalizeTrip)) scheduleSync(t)
          return { trips: next }
        }),
    }),
    {
      name: 'rutados-storage',
      partialize: (s) => ({ trips: s.trips, activeTripId: s.activeTripId }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | undefined
        return {
          ...current,
          ...p,
          trips: (p?.trips ?? current.trips).map(normalizeTrip),
        }
      },
    },
  ),
)
