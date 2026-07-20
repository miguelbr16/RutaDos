import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { geocodeCity, geocodeHotel } from './lib/geocode'
import { discoverPlaces } from './lib/discover'
import { landmarksForDestination, mergeLandmarks } from './lib/landmarks'
import {
  addManualStop,
  addPlaceAsStop,
  buildDayPlans,
  moveStop,
  optimizeOrder,
  rebuildDayTransport,
  removeStop,
} from './lib/plan'
import { uid } from './lib/id'
import {
  DEFAULT_LOGISTICS,
  DEFAULT_PREFERENCES,
  DEFAULT_ROUTE_STYLE,
  type AreaScale,
  type DayFocus,
  type GeoPlace,
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
  routeStyle: RouteStyle
  arrivalTime: string
  departureTime: string
  hotelQuery: string
  hotelPick: { name: string; lat: number; lng: number } | null
  hotelSkipped: boolean
  airportPick: { name: string; code?: string; lat: number; lng: number } | null
  areaScale: AreaScale
}

type View =
  | { name: 'home' }
  | { name: 'wizard'; step: number }
  | { name: 'trip'; tripId: string }
  | { name: 'day'; tripId: string; dayId: string }
  | { name: 'onroute'; tripId: string; dayId: string }
  | { name: 'guides'; tripId: string }
  | { name: 'build'; tripId: string; dayId?: string }
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
  setCustomDayPlaces: (tripId: string, dayId: string, places: GeoPlace[]) => void
  importTrips: (trips: Trip[]) => void
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
  preferences: { ...DEFAULT_PREFERENCES, nightlife: false },
  routeStyle: { ...DEFAULT_ROUTE_STYLE },
  arrivalTime: '15:00',
  departureTime: '18:00',
  hotelQuery: '',
  hotelPick: null,
  hotelSkipped: false,
  airportPick: null,
  areaScale: 'city',
})

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

        set({ generating: true, error: null })
        try {
          const dayCount = Math.max(
            1,
            Math.round(
              (Date.parse(wizard.endDate) - Date.parse(wizard.startDate)) / 86400000,
            ) + 1,
          )

          const areaScale: AreaScale =
            wizard.areaScale ||
            detectAreaScale(
              wizard.cityPick?.name || wizard.cityQuery,
              wizard.cityPick?.displayName,
              wizard.routeStyle.mobility,
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
            wizard.routeStyle,
            dayCount,
          )
          const places = mergeLandmarks(
            rawPlaces,
            landmarksForDestination(city.name, city.displayName),
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
              ...wizard.routeStyle,
              preferCentral: wizard.routeStyle.preferCentral !== false,
            },
            logistics,
            { lat: city.lat, lng: city.lng },
          )

          const trip: Trip = {
            id: uid('trip'),
            title: city.name,
            city,
            startDate: wizard.startDate,
            endDate: wizard.endDate,
            preferences: { ...wizard.preferences },
            routeStyle: { ...wizard.routeStyle },
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
          const ordered = optimizeOrder(
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
          return { ...day, focus }
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

      importTrips: (trips) =>
        set((s) => {
          const normalized = trips.map(normalizeTrip)
          const next = [
            ...normalized,
            ...s.trips.filter((t) => !normalized.some((x) => x.id === t.id)),
          ]
          for (const t of normalized) scheduleSync(t)
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
