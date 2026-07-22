import type { DayPlan, Stop, Trip } from '../types'
import {
  googleMapsDirectionsUrl,
  googleMapsPlaceUrl,
  googleMapsTransitLegUrl,
  travelModeForTransit,
} from './mapsUrl'
import { TRANSIT_MODE_LABELS, TRANSPORT_LABELS } from '../types'

const KEY = 'rutados-offline-day-v2'
const KEY_LEGACY = 'rutados-offline-day-v1'

export type OfflineLeg = {
  toName: string
  modeLabel: string
  minutes?: number
  reason?: string
  mapsUrl: string
}

export type OfflineStopCard = {
  id: string
  name: string
  time?: string
  category?: string
  lat: number
  lng: number
  isHotel?: boolean
  visitStatus?: Stop['visitStatus']
  placeMapsUrl: string
  notes?: string
  userNotes?: string
  openingHours?: string
  legToNext?: OfflineLeg
}

export type OfflineDayPack = {
  version: 2
  savedAt: string
  tripId: string
  tripTitle: string
  cityName: string
  dayId: string
  dayLabel: string
  dayDate: string
  dayMapsUrl: string
  hotelName?: string
  stops: OfflineStopCard[]
  /** Copia completa por si hace falta reabrir el día */
  day: DayPlan
}

function modeLabel(stop: Stop): string {
  if (stop.transitMode) return TRANSIT_MODE_LABELS[stop.transitMode]
  if (stop.transportToNext) return TRANSPORT_LABELS[stop.transportToNext]
  return 'A pie'
}

function buildStopCards(day: DayPlan): OfflineStopCard[] {
  const ordered = [...day.stops].sort((a, b) => a.order - b.order)
  return ordered.map((stop, i) => {
    const next = ordered[i + 1]
    const card: OfflineStopCard = {
      id: stop.id,
      name: stop.name,
      time: stop.suggestedTime,
      category: stop.category,
      lat: stop.lat,
      lng: stop.lng,
      isHotel: stop.isHotel,
      visitStatus: stop.visitStatus,
      placeMapsUrl: googleMapsPlaceUrl(stop.lat, stop.lng, stop.name),
      notes: stop.notes && stop.notes !== 'start' && stop.notes !== 'end' ? stop.notes : undefined,
      userNotes: stop.userNotes,
      openingHours: stop.openingHours,
    }
    if (next) {
      card.legToNext = {
        toName: next.name,
        modeLabel: modeLabel(stop),
        minutes: stop.minutesToNext,
        reason: stop.transportReason,
        mapsUrl: googleMapsTransitLegUrl(stop, next, travelModeForTransit(stop.transitMode)),
      }
    }
    return card
  })
}

export function buildOfflineDayPack(trip: Trip, day: DayPlan): OfflineDayPack {
  const ordered = [...day.stops].sort((a, b) => a.order - b.order)
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    tripId: trip.id,
    tripTitle: trip.title,
    cityName: trip.city.displayName || trip.city.name,
    dayId: day.id,
    dayLabel: day.label,
    dayDate: day.date,
    dayMapsUrl: googleMapsDirectionsUrl(ordered),
    hotelName: trip.logistics?.hotel?.name,
    stops: buildStopCards(day),
    day: structuredClone(day),
  }
}

export function saveOfflineDay(trip: Trip, day: DayPlan): OfflineDayPack {
  const pack = buildOfflineDayPack(trip, day)
  try {
    localStorage.setItem(KEY, JSON.stringify(pack))
    localStorage.removeItem(KEY_LEGACY)
  } catch {
    /* quota */
  }
  return pack
}

export function loadOfflineDay(): OfflineDayPack | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as OfflineDayPack
      if (parsed?.version === 2 && parsed.stops?.length) return parsed
    }
    // legacy v1 → adaptar lo mínimo
    const legacy = localStorage.getItem(KEY_LEGACY)
    if (!legacy) return null
    const old = JSON.parse(legacy) as {
      savedAt: string
      tripId: string
      tripTitle: string
      day: DayPlan
      cityName: string
    }
    if (!old?.day) return null
    return {
      version: 2,
      savedAt: old.savedAt,
      tripId: old.tripId,
      tripTitle: old.tripTitle,
      cityName: old.cityName,
      dayId: old.day.id,
      dayLabel: old.day.label,
      dayDate: old.day.date,
      dayMapsUrl: googleMapsDirectionsUrl(old.day.stops ?? []),
      stops: buildStopCards(old.day),
      day: old.day,
    }
  } catch {
    return null
  }
}

export function clearOfflineDay(): void {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(KEY_LEGACY)
  } catch {
    /* */
  }
}

export function formatOfflineSavedAt(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
