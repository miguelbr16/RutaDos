import type { GeoPlace } from '../types'

/**
 * Future hook for sponsored partner listings.
 * Currently a no-op so the planner API stays stable when partners go live.
 */
export function boostSponsoredPlaces(places: GeoPlace[]): GeoPlace[] {
  if (!places.length) return places
  const sponsored = places.filter((p) => p.sponsored)
  if (!sponsored.length) return places
  // Mild score bump for sponsored (when any exist)
  return places.map((p) =>
    p.sponsored ? { ...p, score: Math.min(100, p.score + 8) } : p,
  )
}
