import type { DayPlan, Trip } from '../types'

const KEY = 'rutados-offline-day-v1'

export type OfflineDaySnapshot = {
  savedAt: string
  tripId: string
  tripTitle: string
  day: DayPlan
  cityName: string
}

export function saveOfflineDay(trip: Trip, day: DayPlan): void {
  const snap: OfflineDaySnapshot = {
    savedAt: new Date().toISOString(),
    tripId: trip.id,
    tripTitle: trip.title,
    day: structuredClone(day),
    cityName: trip.city.displayName || trip.city.name,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(snap))
  } catch {
    /* quota */
  }
}

export function loadOfflineDay(): OfflineDaySnapshot | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as OfflineDaySnapshot
  } catch {
    return null
  }
}

export function clearOfflineDay(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* */
  }
}

export function useOnlineStatus(): { online: boolean } {
  // lightweight helper for components — prefer React state in UI
  return { online: typeof navigator !== 'undefined' ? navigator.onLine : true }
}
