import type { Stop } from '../types'

export function googleMapsDirectionsUrl(stops: Stop[]): string {
  const ordered = [...stops].sort((a, b) => a.order - b.order)
  if (!ordered.length) return 'https://www.google.com/maps'
  if (ordered.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${ordered[0].lat},${ordered[0].lng}`
  }

  const origin = `${ordered[0].lat},${ordered[0].lng}`
  const destination = `${ordered[ordered.length - 1].lat},${ordered[ordered.length - 1].lng}`
  const middle = ordered.slice(1, -1)
  // Google free URL supports up to ~10 waypoints in practice; chunk if needed
  const waypoints = middle
    .slice(0, 8)
    .map((s) => `${s.lat},${s.lng}`)
    .join('|')

  const url = new URL('https://www.google.com/maps/dir/?api=1')
  url.searchParams.set('origin', origin)
  url.searchParams.set('destination', destination)
  url.searchParams.set('travelmode', 'walking')
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

export function travelModeForTransit(
  mode?: string,
): 'walking' | 'transit' | 'driving' {
  if (mode === 'walk') return 'walking'
  if (mode === 'taxi' || mode === 'drive') return 'driving'
  return 'transit'
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
