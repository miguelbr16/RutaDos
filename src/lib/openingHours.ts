/** Horarios OSM (opening_hours) — fetch gratis + estado orientativo. */

type HoursCache = { raw: string; fetchedAt: number }
const cache = new Map<string, HoursCache | null>()

function cacheKey(name: string, lat: number, lng: number) {
  return `${name.toLowerCase().slice(0, 32)}_${lat.toFixed(3)}_${lng.toFixed(3)}`
}

export type OpenStatus = 'open' | 'closed' | 'unknown'

export type PlaceHours = {
  raw?: string
  status: OpenStatus
  label: string
}

/** Parser simple de opening_hours (no cubre todos los casos OSM). */
export function evaluateOpeningHours(
  raw: string | undefined,
  now = new Date(),
): PlaceHours {
  if (!raw?.trim()) {
    return { status: 'unknown', label: 'Horario no disponible' }
  }
  const text = raw.trim()

  // 24/7
  if (/^24\/7$/i.test(text)) {
    return { raw: text, status: 'open', label: 'Abierto 24/7' }
  }

  // "Mo-Su 09:00-18:00" or "Mo-Fr 10:00-19:00; Sa 10:00-14:00"
  const day = now.getDay() // 0 Sun
  const dayKeys = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const today = dayKeys[day]
  const minutes = now.getHours() * 60 + now.getMinutes()

  const rules = text.split(';').map((r) => r.trim())
  for (const rule of rules) {
    const m = rule.match(
      /^([A-Za-z]{2})(?:-([A-Za-z]{2}))?\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/,
    )
    if (!m) continue
    const from = m[1]
    const to = m[2] || m[1]
    const order = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
    const fi = order.indexOf(from)
    const ti = order.indexOf(to)
    const di = order.indexOf(today)
    if (fi < 0 || di < 0) continue
    const inRange = ti >= fi ? di >= fi && di <= ti : di >= fi || di <= ti
    if (!inRange) continue
    const start = Number(m[3]) * 60 + Number(m[4])
    const end = Number(m[5]) * 60 + Number(m[6])
    const open = end > start ? minutes >= start && minutes < end : minutes >= start || minutes < end
    const hh = (n: number) =>
      `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
    return {
      raw: text,
      status: open ? 'open' : 'closed',
      label: open
        ? `Abierto ahora · hoy ${hh(start)}–${hh(end)}`
        : `Cerrado ahora · hoy ${hh(start)}–${hh(end)}`,
    }
  }

  return { raw: text, status: 'unknown', label: text.length > 48 ? text.slice(0, 45) + '…' : text }
}

export async function fetchOpeningHours(
  name: string,
  lat: number,
  lng: number,
): Promise<string | null> {
  const key = cacheKey(name, lat, lng)
  if (cache.has(key)) return cache.get(key)?.raw ?? null

  const around = `around:120,${lat},${lng}`
  const query = `
[out:json][timeout:15];
(
  node(${around})[name][opening_hours];
  way(${around})[name][opening_hours];
);
out tags center 8;
`
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      if (!res.ok) continue
      const json = (await res.json()) as {
        elements?: Array<{ tags?: Record<string, string> }>
      }
      const nameLow = name.toLowerCase()
      const els = json.elements ?? []
      const exact = els.find((e) => (e.tags?.name || '').toLowerCase() === nameLow)
      const partial = els.find((e) => {
        const n = (e.tags?.name || '').toLowerCase()
        return n.includes(nameLow.slice(0, 12)) || nameLow.includes(n.slice(0, 12))
      })
      const hit = exact || partial || els[0]
      const raw = hit?.tags?.opening_hours ?? null
      cache.set(key, raw ? { raw, fetchedAt: Date.now() } : null)
      return raw
    } catch {
      /* next */
    }
  }
  cache.set(key, null)
  return null
}

export async function hoursForPlace(
  name: string,
  lat: number,
  lng: number,
): Promise<PlaceHours> {
  const raw = await fetchOpeningHours(name, lat, lng)
  return evaluateOpeningHours(raw ?? undefined)
}
