import { uid } from './id'
import type { GeoPlace } from '../types'

export type ImportedPoint = {
  name: string
  lat: number
  lng: number
  notes?: string
}

/** Parse KML / KMZ-exported KML text from Google My Maps / Takeout */
export function parseKml(text: string): ImportedPoint[] {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('KML inválido')
  }

  const points: ImportedPoint[] = []
  const placemarks = Array.from(doc.getElementsByTagName('Placemark'))

  for (const pm of placemarks) {
    const name =
      pm.getElementsByTagName('name')[0]?.textContent?.trim() || 'Sitio importado'
    const desc =
      pm.getElementsByTagName('description')[0]?.textContent?.trim() || undefined
    const coordText =
      pm.getElementsByTagName('coordinates')[0]?.textContent?.trim() || ''
    if (!coordText) continue

    const first = coordText.split(/\s+/)[0]
    const [lngStr, latStr] = first.split(',')
    const lng = Number(lngStr)
    const lat = Number(latStr)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    points.push({ name, lat, lng, notes: desc })
  }

  return points
}

/** GeoJSON FeatureCollection or Feature from exports */
export function parseGeoJson(text: string): ImportedPoint[] {
  const data = JSON.parse(text) as {
    type?: string
    features?: Array<{
      type: string
      geometry?: { type: string; coordinates: number[] | number[][] }
      properties?: Record<string, unknown>
    }>
    geometry?: { type: string; coordinates: number[] }
    properties?: Record<string, unknown>
  }

  const features =
    data.type === 'FeatureCollection'
      ? data.features ?? []
      : data.type === 'Feature'
        ? [data as NonNullable<typeof data.features>[number]]
        : []

  const points: ImportedPoint[] = []
  for (const f of features) {
    if (!f.geometry) continue
    let lat: number | null = null
    let lng: number | null = null
    if (f.geometry.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
      lng = Number(f.geometry.coordinates[0])
      lat = Number(f.geometry.coordinates[1])
    }
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue
    }
    const name =
      String(f.properties?.name ?? f.properties?.Name ?? 'Sitio importado')
    const notes = f.properties?.description
      ? String(f.properties.description)
      : undefined
    points.push({ name, lat, lng, notes })
  }
  return points
}

/**
 * Parse pasted Google Maps links / place names (one per line).
 * Links with @lat,lng or !3dLAT!4dLNG are resolved without API key.
 * Short links (maps.app.goo.gl) need resolveGoogleMapsUrl() first.
 */
export function parseMapsLinks(text: string): ImportedPoint[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const points: ImportedPoint[] = []
  for (const line of lines) {
    const coords = extractCoordsFromMapsUrl(line)
    if (coords) {
      const name =
        extractNameFromMapsUrl(line) ||
        `Punto ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
      points.push({ name, ...coords })
      continue
    }
    // bare "name" lines or short URLs (resolved async by caller)
    if (!/^https?:\/\//i.test(line)) {
      points.push({ name: line, lat: NaN, lng: NaN })
    } else if (isGoogleMapsUrl(line)) {
      points.push({ name: line, lat: NaN, lng: NaN, notes: 'maps-url' })
    }
  }
  return points
}

export function isGoogleMapsUrl(text: string): boolean {
  const t = text.trim()
  return /https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.|www\.google\.[^/]+\/maps|google\.[^/]+\/maps)/i.test(
    t,
  )
}

export function isShortMapsUrl(text: string): boolean {
  return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(text.trim())
}

export function extractCoordsFromMapsUrl(
  url: string,
): { lat: number; lng: number } | null {
  // Pin del sitio (más preciso que el centro del mapa @)
  const pin = url.match(/!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
  if (pin) return { lat: Number(pin[1]), lng: Number(pin[2]) }

  const bang = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
  if (bang) return { lat: Number(bang[1]), lng: Number(bang[2]) }

  const at = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (at) return { lat: Number(at[1]), lng: Number(at[2]) }

  const q = url.match(/[?&](?:q|query)=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (q) return { lat: Number(q[1]), lng: Number(q[2]) }

  const dest = url.match(/destination=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/i)
  if (dest) return { lat: Number(dest[1]), lng: Number(dest[2]) }

  return null
}

export function extractNameFromMapsUrl(url: string): string | null {
  const place = url.match(/\/place\/([^/@]+)/)
  if (place) {
    try {
      return decodeURIComponent(place[1].replace(/\+/g, ' '))
    } catch {
      return place[1].replace(/\+/g, ' ')
    }
  }
  return null
}

function extractFromExpandedText(text: string): {
  lat: number
  lng: number
  name?: string
} | null {
  // Full maps URL embedded in redirect / HTML
  const embedded = text.match(
    /https?:\/\/(?:www\.)?google\.[^/\s"']+\/maps\/[^\s"'<>]+/i,
  )
  if (embedded) {
    const u = embedded[0].replace(/&amp;/g, '&')
    const coords = extractCoordsFromMapsUrl(u)
    if (coords) {
      return { ...coords, name: extractNameFromMapsUrl(u) || undefined }
    }
  }

  const coords = extractCoordsFromMapsUrl(text)
  if (coords) {
    const name =
      extractNameFromMapsUrl(text) ||
      text.match(/property="og:title"\s+content="([^"]+)"/i)?.[1] ||
      text.match(/<title>([^<]+)/i)?.[1]?.replace(/\s*-?\s*Google Maps.*$/i, '').trim()
    return { ...coords, name: name || undefined }
  }

  const nameOnly =
    extractNameFromMapsUrl(text) ||
    text.match(/\/place\/([^/@]+)/)?.[1]?.replace(/\+/g, ' ')
  if (nameOnly) {
    try {
      return { lat: NaN, lng: NaN, name: decodeURIComponent(nameOnly) }
    } catch {
      return { lat: NaN, lng: NaN, name: nameOnly }
    }
  }
  return null
}

async function fetchExpandProxies(url: string): Promise<string | null> {
  const attempts: Array<() => Promise<string | null>> = [
    // 1) Redirect Location (funciona en algunos entornos; en browser a veces CORS lo bloquea)
    async () => {
      const res = await fetch(url, { method: 'GET', redirect: 'manual', mode: 'cors' })
      const loc = res.headers.get('location') || res.headers.get('Location')
      if (loc && /google\.|maps/.test(loc)) return loc
      if (res.type === 'opaqueredirect') return null
      return null
    },
    // 2) Microlink: título genérico del lugar (cualquier sitio de Maps)
    async () => {
      const res = await fetch(
        `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
      )
      if (!res.ok) return null
      const data = (await res.json()) as {
        status?: string
        data?: { title?: string; url?: string; description?: string }
      }
      if (data.status !== 'success' || !data.data?.title) return null
      const title = data.data.title
      const placeName =
        title.split('·')[0]?.trim() ||
        title.replace(/\s*[-–—]\s*Google Maps.*/i, '').trim()
      return `/place/${encodeURIComponent(placeName).replace(/%20/g, '+')}/ · ${title}`
    },
    // 3) Follow redirects if allowed
    async () => {
      const res = await fetch(url, { method: 'GET', redirect: 'follow', mode: 'cors' })
      if (res.url && res.url !== url && /google\.|maps/.test(res.url)) return res.url
      return (await res.text()).slice(0, 80000)
    },
    // 4) allorigins
    async () => {
      const res = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      )
      if (!res.ok) return null
      const text = await res.text()
      if (text.startsWith('Oops') || text[0] !== '{') return null
      const data = JSON.parse(text) as { contents?: string }
      return data.contents ?? null
    },
  ]

  for (const run of attempts) {
    try {
      const body = await run()
      if (body) return body
    } catch {
      /* try next */
    }
  }
  return null
}

/** Expande goo.gl / maps.app.goo.gl y URLs largas hasta lat/lng (+ nombre si hay). */
export async function resolveGoogleMapsUrl(
  input: string,
): Promise<{ lat: number; lng: number; name: string } | null> {
  const url = input.trim()
  if (!url) return null

  const direct = extractCoordsFromMapsUrl(url)
  if (direct) {
    return {
      ...direct,
      name: extractNameFromMapsUrl(url) || 'Ubicación de Maps',
    }
  }

  if (!isGoogleMapsUrl(url)) return null

  const expanded = await fetchExpandProxies(url)
  if (!expanded) return null

  const parsed = extractFromExpandedText(expanded)
  if (!parsed) {
    // Solo nombre desde metadata (cualquier lugar)
    const name = extractNameFromMapsUrl(expanded)
    if (name) return { lat: NaN, lng: NaN, name }
    return null
  }

  if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      name: parsed.name || extractNameFromMapsUrl(expanded) || 'Ubicación de Maps',
    }
  }

  if (parsed.name) {
    return { lat: NaN, lng: NaN, name: parsed.name }
  }
  return null
}

export async function resolveNamedPlaces(
  pending: ImportedPoint[],
  cityHint: string,
  geocode: (q: string) => Promise<{ lat: number; lng: number; name?: string }>,
): Promise<ImportedPoint[]> {
  const out: ImportedPoint[] = []
  for (const p of pending) {
    if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
      out.push(p)
      continue
    }

    // Short / maps URL pending expansion
    if (p.notes === 'maps-url' || isGoogleMapsUrl(p.name)) {
      try {
        const resolved = await resolveGoogleMapsUrl(p.name)
        if (resolved && Number.isFinite(resolved.lat) && Number.isFinite(resolved.lng)) {
          out.push({ name: resolved.name, lat: resolved.lat, lng: resolved.lng })
          continue
        }
        if (resolved?.name) {
          const g = await geocode(`${resolved.name}, ${cityHint}`)
          out.push({ name: resolved.name, lat: g.lat, lng: g.lng })
          continue
        }
      } catch {
        /* fall through */
      }
    }

    try {
      const g = await geocode(`${p.name}, ${cityHint}`)
      out.push({
        name: p.name,
        lat: g.lat,
        lng: g.lng,
        notes: p.notes,
      })
    } catch {
      // skip unresolved
    }
  }
  return out
}

export function importedToPlaces(points: ImportedPoint[]): GeoPlace[] {
  return points
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map((p) => ({
      id: uid('place'),
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      category: 'custom' as const,
      tier: 'must' as const,
      source: 'manual' as const,
      notes: p.notes ? stripHtml(p.notes).slice(0, 280) : 'Importado de Google Maps',
      score: 95,
    }))
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function parseImportFile(file: File): Promise<ImportedPoint[]> {
  const text = await file.text()
  const name = file.name.toLowerCase()
  if (name.endsWith('.kml') || text.includes('<kml')) return parseKml(text)
  if (name.endsWith('.geojson') || name.endsWith('.json') || text.trim().startsWith('{')) {
    try {
      return parseGeoJson(text)
    } catch {
      if (text.includes('<kml')) return parseKml(text)
      throw new Error('No se pudo leer el archivo')
    }
  }
  if (text.includes('<kml')) return parseKml(text)
  return parseMapsLinks(text)
}
