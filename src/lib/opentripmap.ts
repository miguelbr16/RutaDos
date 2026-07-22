/**
 * OpenTripMap — POIs turísticos y gastronomía (plan free con API key).
 * https://opentripmap.io/product
 */

export type OtmPlace = {
  xid?: string
  name: string
  lat: number
  lng: number
  kinds: string
  rate: number
}

export function getOpenTripMapKey(): string | undefined {
  const key = import.meta.env.VITE_OPENTRIPMAP_KEY as string | undefined
  return key?.trim() || undefined
}

export function isOpenTripMapEnabled(): boolean {
  return !!getOpenTripMapKey()
}

/** Miniatura preview cuando hay xid (requiere key). */
export function otmPreviewUrl(xid: string, size = 120): string | undefined {
  const key = getOpenTripMapKey()
  if (!key || !xid) return undefined
  return `https://opentripmap.io/img/${size}x${size}/${xid}.jpg?apikey=${encodeURIComponent(key)}`
}

export async function fetchOtmRadius(opts: {
  lat: number
  lng: number
  radiusM: number
  kinds: string
  limit?: number
  rateMin?: number
}): Promise<OtmPlace[]> {
  const key = getOpenTripMapKey()
  if (!key) return []

  const url = new URL('https://api.opentripmap.com/0.1/en/places/radius')
  url.searchParams.set('radius', String(Math.min(opts.radiusM, 50000)))
  url.searchParams.set('lon', String(opts.lng))
  url.searchParams.set('lat', String(opts.lat))
  url.searchParams.set('kinds', opts.kinds)
  url.searchParams.set('rate', String(opts.rateMin ?? 1))
  url.searchParams.set('limit', String(opts.limit ?? 40))
  url.searchParams.set('apikey', key)

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return []
    const data = (await res.json()) as {
      features?: Array<{
        properties?: { xid?: string; name?: string; kinds?: string; rate?: number }
        geometry?: { coordinates?: [number, number] }
      }>
    }

    const out: OtmPlace[] = []
    for (const f of data.features ?? []) {
      const name = f.properties?.name?.trim()
      const coords = f.geometry?.coordinates
      if (!name || !coords) continue
      const [lng, lat] = coords
      out.push({
        xid: f.properties?.xid,
        name,
        lat,
        lng,
        kinds: f.properties?.kinds ?? '',
        rate: f.properties?.rate ?? 0,
      })
    }
    return out
  } catch {
    return []
  }
}

/** Kinds para restaurantes / cafés cerca de un punto. */
export function otmKindsForVenue(kind: 'restaurant' | 'cafe' | 'hotel'): string {
  if (kind === 'cafe') return 'cafes'
  if (kind === 'hotel') return 'hotels'
  return 'restaurants,foods,cafes'
}
