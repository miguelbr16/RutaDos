import type { CityInfo } from '../types'
import {
  extractCoordsFromMapsUrl,
  extractNameFromMapsUrl,
  isGoogleMapsUrl,
  resolveGoogleMapsUrl,
} from './importGmaps'

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  name?: string
  class?: string
  type?: string
  importance?: number
  boundingbox?: [string, string, string, string]
}

export type PlaceSuggestion = {
  label: string
  shortName: string
  lat: number
  lng: number
  displayName: string
  kind: string
}

function kindLabel(hit: { type?: string; class?: string }): string {
  const t = hit.type || hit.class || ''
  const map: Record<string, string> = {
    city: 'ciudad',
    town: 'pueblo',
    municipality: 'municipio',
    administrative: 'área / admin.',
    state: 'región / estado',
    country: 'país',
    suburb: 'barrio',
    neighbourhood: 'barrio',
    village: 'pueblo',
    county: 'condado',
    hotel: 'hotel',
    house: 'dirección',
  }
  return map[t] || t || 'lugar'
}

async function nominatimSearch(
  query: string,
  limit: number,
  extra?: Record<string, string>,
): Promise<NominatimResult[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('addressdetails', '0')
  if (extra) {
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'es',
    },
  })
  if (!res.ok) return []
  return (await res.json()) as NominatimResult[]
}

function toSuggestion(hit: NominatimResult): PlaceSuggestion {
  return {
    label: hit.display_name,
    shortName: hit.name || hit.display_name.split(',')[0],
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    displayName: hit.display_name,
    kind: kindLabel(hit),
  }
}

function rankHit(hit: NominatimResult): number {
  let s = (hit.importance ?? 0) * 100
  if (hit.class === 'place' && (hit.type === 'city' || hit.type === 'town')) s += 40
  if (hit.type === 'country') s += 25
  if (hit.type === 'state' || hit.type === 'administrative') s += 10
  return s
}

export async function searchDestinations(
  query: string,
  limit = 8,
): Promise<PlaceSuggestion[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const data = await nominatimSearch(q, Math.max(limit, 10))
  const seen = new Set<string>()
  const out: PlaceSuggestion[] = []

  for (const hit of [...data].sort((a, b) => rankHit(b) - rankHit(a))) {
    const key = hit.display_name
    if (seen.has(key)) continue
    seen.add(key)
    out.push(toSuggestion(hit))
    if (out.length >= limit) break
  }
  return out
}

export async function searchCities(query: string, limit = 6): Promise<PlaceSuggestion[]> {
  return searchDestinations(query, limit)
}

function hitToCityInfo(hit: NominatimResult, preferredName?: string): CityInfo {
  const lat = Number(hit.lat)
  const lng = Number(hit.lon)

  let bbox: CityInfo['bbox']
  if (hit.boundingbox?.length === 4) {
    bbox = [
      Number(hit.boundingbox[0]),
      Number(hit.boundingbox[2]),
      Number(hit.boundingbox[1]),
      Number(hit.boundingbox[3]),
    ]
  } else {
    const d = hit.type === 'country' ? 2 : 0.15
    bbox = [lat - d, lng - d, lat + d, lng + d]
  }

  const maxDelta =
    hit.type === 'country' ? 8 : hit.type === 'state' ? 2.5 : 0.35
  // Solo recortar destinos urbanos muy mal geocodificados; países/regiones conservan bbox
  if (hit.type !== 'country' && hit.type !== 'state') {
    bbox = clampBbox(bbox, lat, lng, maxDelta)
  }

  return {
    name: preferredName || hit.name || hit.display_name.split(',')[0],
    displayName: hit.display_name,
    lat,
    lng,
    bbox,
  }
}

export function suggestionToCityInfo(s: PlaceSuggestion): CityInfo {
  const d = 0.18
  return {
    name: s.shortName,
    displayName: s.displayName,
    lat: s.lat,
    lng: s.lng,
    bbox: [s.lat - d, s.lng - d, s.lat + d, s.lng + d],
  }
}

export async function geocodeCity(query: string): Promise<CityInfo> {
  const data = await nominatimSearch(query.trim(), 8)
  if (!data.length) throw new Error(`No encontramos “${query}”`)
  const ranked = [...data].sort((a, b) => rankHit(b) - rankHit(a))
  return hitToCityInfo(ranked[0], query.split(',')[0].trim())
}

/** Photon (Komoot) — often finds hotels that OSM Nominatim misses (e.g. Booking names) */
async function photonSearch(query: string, limit = 8): Promise<PlaceSuggestion[]> {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('lang', 'en')

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return []
    const data = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] }
        properties?: {
          name?: string
          street?: string
          city?: string
          country?: string
          osm_value?: string
          osm_key?: string
          type?: string
        }
      }>
    }
    const out: PlaceSuggestion[] = []
    for (const f of data.features ?? []) {
      const coords = f.geometry?.coordinates
      const p = f.properties
      if (!coords || !p?.name) continue
      const [lng, lat] = coords
      const parts = [p.name, p.street, p.city, p.country].filter(Boolean)
      out.push({
        label: parts.join(', '),
        shortName: p.name,
        lat,
        lng,
        displayName: parts.join(', '),
        kind: p.osm_value === 'hotel' || p.osm_key === 'tourism' ? 'hotel' : kindLabel({ type: p.type || p.osm_value }),
      })
    }
    return out
  } catch {
    return []
  }
}

function mergeSuggestions(lists: PlaceSuggestion[][], limit: number): PlaceSuggestion[] {
  const seen = new Set<string>()
  const out: PlaceSuggestion[] = []
  for (const list of lists) {
    for (const s of list) {
      const key = `${s.shortName.toLowerCase()}_${s.lat.toFixed(4)}_${s.lng.toFixed(4)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(s)
      if (out.length >= limit) return out
    }
  }
  return out
}

/**
 * Hotels / stays — Nominatim + Photon + Maps/Booking links with coordinates.
 * Accepts any matching place (not only tagged hotels) so Booking names work better.
 */
export async function searchHotels(
  query: string,
  cityName: string,
  limit = 10,
): Promise<PlaceSuggestion[]> {
  const q = query.trim()
  if (q.length < 2) return []

  // Enlace de Google Maps (corto o largo)
  if (isGoogleMapsUrl(q)) {
    const resolved = await resolveGoogleMapsUrl(q)
    if (resolved && Number.isFinite(resolved.lat) && Number.isFinite(resolved.lng)) {
      return [
        {
          label: `${resolved.name} (enlace Maps)`,
          shortName: resolved.name,
          lat: resolved.lat,
          lng: resolved.lng,
          displayName: resolved.name,
          kind: 'enlace',
        },
      ]
    }
  // Preferir búsqueda por nombre sin reentrar en lógica de URL
    if (resolved?.name) {
      const nameQ = resolved.name
      const city = cityName.trim()
      const nominatimLists = await Promise.all(
        [`${nameQ}, ${city}`, `hotel ${nameQ}, ${city}`, nameQ].map(async (attempt) => {
          const data = await nominatimSearch(attempt, 6)
          return data.map(toSuggestion)
        }),
      )
      const photonLists = await Promise.all([
        photonSearch(`${nameQ} ${city}`, 8),
        photonSearch(`hotel ${nameQ} ${city}`, 6),
      ])
      return mergeSuggestions([...photonLists, ...nominatimLists], limit)
    }
    return []
  }

  // Paste Google Maps / Apple Maps style URL with coords (ya expandido)
  const fromUrl = extractCoordsFromMapsUrl(q)
  if (fromUrl) {
    const name = extractNameFromMapsUrl(q) || (cityName ? `Hotel cerca de ${cityName}` : 'Ubicación pegada')
    return [
      {
        label: `${name} (${fromUrl.lat.toFixed(5)}, ${fromUrl.lng.toFixed(5)})`,
        shortName: name,
        lat: fromUrl.lat,
        lng: fromUrl.lng,
        displayName: q.slice(0, 120),
        kind: 'enlace',
      },
    ]
  }

  const city = cityName.trim()
  const queries = [
    `${q}, ${city}`,
    `hotel ${q}, ${city}`,
    `${q} ${city}`,
    q,
  ].filter((x, i, arr) => arr.indexOf(x) === i)

  const nominatimLists = await Promise.all(
    queries.slice(0, 3).map(async (attempt) => {
      const data = await nominatimSearch(attempt, 6)
      return data.map(toSuggestion)
    }),
  )

  const photonLists = await Promise.all([
    photonSearch(`${q} ${city}`, 8),
    photonSearch(`hotel ${q} ${city}`, 6),
  ])

  // Prefer photon/nominatim results that mention hotel or match query tokens
  const tokens = q.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
  const scored = mergeSuggestions([...photonLists, ...nominatimLists], 30).map((s) => {
    const blob = `${s.label} ${s.kind}`.toLowerCase()
    let score = 0
    if (/hotel|hostel|inn|apart|bnb|appart/.test(blob)) score += 5
    if (s.kind === 'hotel') score += 8
    for (const t of tokens) if (blob.includes(t)) score += 3
    if (city && blob.includes(city.toLowerCase())) score += 2
    return { s, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const out = scored.map((x) => x.s).slice(0, limit)

  if (!out.length) {
    const fallback = await nominatimSearch(`${q}, ${city}`, 6)
    return fallback.map(toSuggestion)
  }
  return out
}

export async function geocodeHotel(
  query: string,
  cityName: string,
): Promise<{ name: string; lat: number; lng: number }> {
  if (isGoogleMapsUrl(query)) {
    const resolved = await resolveGoogleMapsUrl(query)
    if (resolved && Number.isFinite(resolved.lat) && Number.isFinite(resolved.lng)) {
      return { name: resolved.name, lat: resolved.lat, lng: resolved.lng }
    }
    if (resolved?.name) {
      const results = await searchHotels(resolved.name, cityName, 5)
      if (results.length) {
        return { name: results[0].shortName, lat: results[0].lat, lng: results[0].lng }
      }
    }
    throw new Error('No pudimos abrir ese enlace de Maps. Probá pegarlo de nuevo o el nombre del hotel.')
  }

  const results = await searchHotels(query, cityName, 5)
  if (results.length) {
    return { name: results[0].shortName, lat: results[0].lat, lng: results[0].lng }
  }
  throw new Error(`No encontramos “${query.trim()}” cerca de ${cityName}`)
}

function clampBbox(
  bbox: CityInfo['bbox'],
  lat: number,
  lng: number,
  maxDelta: number,
): CityInfo['bbox'] {
  const [s, w, n, e] = bbox
  return [
    Math.max(s, lat - maxDelta),
    Math.max(w, lng - maxDelta),
    Math.min(n, lat + maxDelta),
    Math.min(e, lng + maxDelta),
  ]
}
