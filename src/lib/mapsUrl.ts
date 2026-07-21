import type { Stop, TransitMode } from '../types'

export function travelModeForTransit(
  mode?: string,
): 'walking' | 'transit' | 'driving' {
  if (mode === 'walk') return 'walking'
  if (mode === 'taxi' || mode === 'drive') return 'driving'
  return 'transit'
}

/** Modo dominante del día (Google Directions solo admite uno por URL). */
export function dominantTravelMode(stops: Stop[]): 'walking' | 'transit' | 'driving' {
  const visits = [...stops].filter((s) => !s.isHotel)
  const counts: Record<'walking' | 'transit' | 'driving', number> = {
    walking: 0,
    transit: 0,
    driving: 0,
  }
  for (const s of visits) {
    const m = travelModeForTransit(s.transitMode)
    counts[m] += 1
  }
  // Prefer transit if mixed urban day; else max
  const entries = Object.entries(counts) as Array<['walking' | 'transit' | 'driving', number]>
  entries.sort((a, b) => b[1] - a[1])
  if (entries[0][1] === 0) return 'walking'
  // Tie-break: transit > walking > driving for city trips
  const top = entries[0][1]
  const tied = entries.filter((e) => e[1] === top).map((e) => e[0])
  if (tied.includes('transit')) return 'transit'
  if (tied.includes('walking')) return 'walking'
  return 'driving'
}

/**
 * Ruta del día en Google Maps (orden + modo dominante).
 * Omite hoteles por defecto para no saturar waypoints; pasad `includeHotels: true` si hace falta.
 */
export function googleMapsDirectionsUrl(
  stops: Stop[],
  opts?: { includeHotels?: boolean; mode?: 'walking' | 'transit' | 'driving' },
): string {
  let ordered = [...stops].sort((a, b) => a.order - b.order)
  if (!opts?.includeHotels) {
    const withoutHotel = ordered.filter((s) => !s.isHotel)
    if (withoutHotel.length >= 1) ordered = withoutHotel
  }

  if (!ordered.length) return 'https://www.google.com/maps'
  if (ordered.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${ordered[0].lat},${ordered[0].lng}`
  }

  const origin = `${ordered[0].lat},${ordered[0].lng}`
  const destination = `${ordered[ordered.length - 1].lat},${ordered[ordered.length - 1].lng}`
  const middle = ordered.slice(1, -1)
  const waypoints = middle
    .slice(0, 8)
    .map((s) => `${s.lat},${s.lng}`)
    .join('|')

  const url = new URL('https://www.google.com/maps/dir/?api=1')
  url.searchParams.set('origin', origin)
  url.searchParams.set('destination', destination)
  url.searchParams.set('travelmode', opts?.mode ?? dominantTravelMode(ordered))
  if (waypoints) url.searchParams.set('waypoints', waypoints)
  return url.toString()
}

export function googleMapsPlaceUrl(lat: number, lng: number, name?: string): string {
  const q = name ? encodeURIComponent(name) : `${lat},${lng}`
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

/** Un tramo en transporte público (Google muestra líneas de metro/bus). */
export function googleMapsTransitLegUrl(
  from: { lat: number; lng: number; name?: string },
  to: { lat: number; lng: number; name?: string },
  mode: 'walking' | 'transit' | 'driving' = 'transit',
): string {
  const url = new URL('https://www.google.com/maps/dir/?api=1')
  url.searchParams.set('origin', `${from.lat},${from.lng}`)
  url.searchParams.set('destination', `${to.lat},${to.lng}`)
  url.searchParams.set('travelmode', mode)
  return url.toString()
}

/** Sample OSRM walking geometry for map display (optional enrichment) */
export async function fetchWalkingRoute(
  stops: Stop[],
): Promise<{ lat: number; lng: number }[] | null> {
  const ordered = [...stops].sort((a, b) => a.order - b.order)
  if (ordered.length < 2) return null

  const coords = ordered.map((s) => `${s.lng},${s.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/foot/${coords}?overview=simplified&geometries=geojson`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const line = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined
    if (!line) return null
    return line.map(([lng, lat]) => ({ lat, lng }))
  } catch {
    return null
  }
}

export type { TransitMode }
