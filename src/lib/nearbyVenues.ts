/**
 * Restaurantes / hoteles cercanos desde OpenStreetMap,
 * priorizando los que tienen web o teléfono (más “reales” para reservar).
 */
import {
  extractOsmPhone,
  extractOsmWebsite,
  venueLinks,
  type VenueKind,
  type VenueLinkSet,
} from './bookingLinks'
import { fetchOtmRadius, isOpenTripMapEnabled, otmKindsForVenue, otmPreviewUrl } from './opentripmap'

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

export type NearbyVenue = {
  id: string
  name: string
  lat: number
  lng: number
  kind: VenueKind
  category: string
  website?: string
  phone?: string
  cuisine?: string
  stars?: string
  distanceM: number
  links: VenueLinkSet
  source: 'osm' | 'otm'
  /** OpenTripMap rate 1–3 */
  rating?: number
  previewUrl?: string
  kinds?: string
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function queryFor(kind: VenueKind, lat: number, lng: number, radiusM: number): string {
  const around = `around:${radiusM},${lat},${lng}`
  if (kind === 'hotel') {
    return `
[out:json][timeout:25];
(
  node(${around})[tourism~"hotel|guest_house|hostel|motel"]["name"];
  way(${around})[tourism~"hotel|guest_house|hostel|motel"]["name"];
);
out center 40;
`
  }
  if (kind === 'cafe') {
    return `
[out:json][timeout:25];
(
  node(${around})[amenity=cafe]["name"];
  way(${around})[amenity=cafe]["name"];
  node(${around})[amenity=ice_cream]["name"];
  way(${around})[amenity=ice_cream]["name"];
);
out center 30;
`
  }
  return `
[out:json][timeout:25];
(
  node(${around})[amenity~"restaurant|cafe|fast_food|pub|bar"]["name"];
  way(${around})[amenity~"restaurant|cafe|fast_food|pub|bar"]["name"];
);
out center 45;
`
}

export async function fetchNearbyVenues(opts: {
  kind: VenueKind
  lat: number
  lng: number
  city?: string
  radiusM?: number
  limit?: number
}): Promise<NearbyVenue[]> {
  const radiusM = opts.radiusM ?? (opts.kind === 'hotel' ? 4500 : 1800)
  const limit = opts.limit ?? 10
  const query = queryFor(opts.kind, opts.lat, opts.lng, radiusM)
  let out: NearbyVenue[] = []

  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      if (!res.ok) continue
      const json = (await res.json()) as {
        elements?: Array<{
          id?: number
          lat?: number
          lon?: number
          center?: { lat: number; lon: number }
          tags?: Record<string, string>
        }>
      }
      const raw: NearbyVenue[] = []
      for (const el of json.elements ?? []) {
        const tags = el.tags ?? {}
        const name = tags.name || tags['name:es'] || tags['name:en']
        const plat = el.lat ?? el.center?.lat
        const plng = el.lon ?? el.center?.lon
        if (!name || plat == null || plng == null) continue
        const website = extractOsmWebsite(tags)
        const phone = extractOsmPhone(tags)
        const category =
          opts.kind === 'cafe'
            ? 'cafe'
            : tags.amenity || tags.tourism || (opts.kind === 'hotel' ? 'hotel' : 'restaurant')
        const distanceM = Math.round(haversineKm({ lat: opts.lat, lng: opts.lng }, { lat: plat, lng: plng }) * 1000)
        const venueKind: VenueKind = opts.kind === 'cafe' ? 'cafe' : opts.kind
        const venue: NearbyVenue = {
          id: `osm-${el.id ?? `${plat}-${plng}`}`,
          name,
          lat: plat,
          lng: plng,
          kind: venueKind,
          category,
          website,
          phone,
          cuisine: tags.cuisine,
          stars: tags.stars,
          distanceM,
          links: venueLinks(venueKind, {
            name,
            lat: plat,
            lng: plng,
            website,
            phone,
            city: opts.city,
          }),
          source: 'osm',
        }
        raw.push(venue)
      }

      // Prioridad: con web → restaurante (no solo bar) → más cerca
      raw.sort((a, b) => {
        const aw = a.website ? 0 : 1
        const bw = b.website ? 0 : 1
        if (aw !== bw) return aw - bw
        if (opts.kind === 'restaurant') {
          const ar = a.category === 'restaurant' ? 0 : 1
          const br = b.category === 'restaurant' ? 0 : 1
          if (ar !== br) return ar - br
        }
        if (opts.kind === 'hotel') {
          const ah = a.category === 'hotel' ? 0 : 1
          const bh = b.category === 'hotel' ? 0 : 1
          if (ah !== bh) return ah - bh
        }
        return a.distanceM - b.distanceM
      })

      const seen = new Set<string>()
      const batch: NearbyVenue[] = []
      for (const v of raw) {
        const k = v.name.toLowerCase()
        if (seen.has(k)) continue
        seen.add(k)
        batch.push(v)
        if (batch.length >= limit) break
      }
      if (batch.length) {
        out = batch
        break
      }
    } catch {
      /* next mirror */
    }
  }

  const merged = await mergeOtmVenues(out, opts)
  return merged.length ? merged : out
}

async function mergeOtmVenues(
  osm: NearbyVenue[],
  opts: {
    kind: VenueKind
    lat: number
    lng: number
    city?: string
    radiusM?: number
    limit?: number
  },
): Promise<NearbyVenue[]> {
  if (!isOpenTripMapEnabled() || opts.kind === 'hotel') {
    return osm
  }

  const radiusM = opts.radiusM ?? 1800
  const limit = opts.limit ?? 10
  const otmPlaces = await fetchOtmRadius({
    lat: opts.lat,
    lng: opts.lng,
    radiusM,
    kinds: otmKindsForVenue(opts.kind === 'cafe' ? 'cafe' : 'restaurant'),
    limit: 25,
    rateMin: 2,
  })

  const seen = new Set(osm.map((v) => v.name.toLowerCase()))
  const extras: NearbyVenue[] = []

  for (const p of otmPlaces) {
    const key = p.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const distanceM = Math.round(
      haversineKm({ lat: opts.lat, lng: opts.lng }, { lat: p.lat, lng: p.lng }) * 1000,
    )
    const kind = opts.kind
    extras.push({
      id: `otm-${p.xid ?? `${p.lat}-${p.lng}`}`,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      kind,
      category: kind === 'cafe' ? 'cafe' : 'restaurant',
      distanceM,
      kinds: p.kinds.split(',').slice(0, 4).join(' · '),
      rating: p.rate,
      previewUrl: p.xid ? otmPreviewUrl(p.xid, 160) : undefined,
      links: venueLinks(kind, {
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        city: opts.city,
      }),
      source: 'otm',
    })
  }

  extras.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.distanceM - b.distanceM)

  const combined = [...osm, ...extras]
  combined.sort((a, b) => {
    const ar = a.source === 'otm' ? (a.rating ?? 0) * 10 : 0
    const br = b.source === 'otm' ? (b.rating ?? 0) * 10 : 0
    const aw = a.website ? 5 : 0
    const bw = b.website ? 5 : 0
    const scoreA = ar + aw - a.distanceM / 500
    const scoreB = br + bw - b.distanceM / 500
    if (scoreA !== scoreB) return scoreB - scoreA
    return a.distanceM - b.distanceM
  })

  const deduped: NearbyVenue[] = []
  const names = new Set<string>()
  for (const v of combined) {
    const k = v.name.toLowerCase()
    if (names.has(k)) continue
    names.add(k)
    deduped.push(v)
    if (deduped.length >= limit) break
  }
  return deduped
}
