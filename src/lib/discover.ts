import { uid } from './id'
import type {
  CityInfo,
  ExploreMode,
  GeoPlace,
  PlaceCategory,
  Preferences,
  RouteStyle,
  TimeSlot,
} from '../types'
import {
  hubsForDestination,
  hubSearchRadiusM,
  type AreaScale,
} from './tripScale'

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

function coordsOf(el: OverpassElement): { lat: number; lng: number } | null {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lng: el.lon }
  if (el.center) return { lat: el.center.lat, lng: el.center.lon }
  return null
}

function classify(tags: Record<string, string>, hint: PlaceCategory): PlaceCategory {
  const tourism = tags.tourism
  const amenity = tags.amenity
  const historic = tags.historic
  const leisure = tags.leisure

  if (tourism === 'museum' || tourism === 'gallery') return 'museum'
  if (tourism === 'viewpoint') return 'viewpoint'
  if (amenity === 'restaurant' || amenity === 'fast_food' || amenity === 'food_court') return 'food'
  if (amenity === 'cafe') return 'cafe'
  if (amenity === 'bar' || amenity === 'pub') return 'nightlife'
  if (amenity === 'theatre' || amenity === 'cinema' || amenity === 'arts_centre') return 'show'
  if (amenity === 'marketplace' || tags.shop === 'marketplace') return 'market'
  if (tags.shop === 'mall' || tags.shop === 'department_store') return 'shopping'
  if (leisure === 'park' || leisure === 'garden') return 'park'
  if (tags.place === 'neighbourhood' || tags.place === 'quarter') return 'local'
  if (historic || tourism === 'attraction' || tourism === 'artwork' || tags.building) {
    return hint === 'monument' || hint === 'must_see' ? 'monument' : hint
  }
  if (tags.shop === 'books' || tags.shop === 'bakery' || tourism === 'yes') {
    return hint === 'market' ? 'market' : 'hidden'
  }
  return hint
}

function bestSlotFor(category: PlaceCategory): TimeSlot {
  if (category === 'cafe') return 'morning'
  if (category === 'food') return 'lunch'
  if (category === 'nightlife') return 'night'
  if (category === 'show') return 'evening'
  if (category === 'viewpoint') return 'evening'
  if (category === 'park' || category === 'shopping' || category === 'market') return 'afternoon'
  if (category === 'museum') return 'morning'
  return 'afternoon'
}

function scorePlace(
  tags: Record<string, string>,
  category: PlaceCategory,
  explore: ExploreMode,
  city: CityInfo,
  lat: number,
  lng: number,
  foodBudget: RouteStyle['foodBudget'] = 'mid',
): { score: number; tier: GeoPlace['tier'] } {
  let score = 40

  if (tags.wikipedia || tags.wikidata) score += 35
  if (tags.tourism === 'attraction') score += 20
  if (tags.tourism === 'museum') score += 18
  if (tags.historic === 'monument' || tags.historic === 'castle') score += 22
  if (tags.tourism === 'viewpoint') score += 12
  if (category === 'food' || category === 'cafe') score += 5

  const streetish =
    tags.amenity === 'fast_food' ||
    tags.amenity === 'food_court' ||
    tags.cuisine === 'street_food' ||
    /street|takeaway/i.test(tags.cuisine || '')

  if (category === 'food' || category === 'market') {
    if (foodBudget === 'low' && streetish) score += 22
    if (foodBudget === 'high' && tags.amenity === 'restaurant' && !streetish) score += 18
    if (foodBudget === 'high' && streetish) score -= 12
    if (streetish) score += 8
  }

  const dist = haversineKm(city.lat, city.lng, lat, lng)
  if (explore === 'icons') {
    score += Math.max(0, 18 - dist * 6)
  } else if (explore === 'local') {
    if (dist > 1.2 && dist < 6) score += 16
    if (tags.wikipedia) score -= 8
  } else {
    score += Math.max(0, 10 - dist * 3)
    if (dist > 1.5 && dist < 5 && !tags.wikipedia) score += 8
  }

  if ((category === 'hidden' || category === 'local') && explore !== 'icons') score += 12

  let tier: GeoPlace['tier'] = 'recommended'
  if (score >= 78) tier = 'must'
  else if (score < 48) tier = 'optional'

  if (explore === 'icons' && (category === 'monument' || category === 'museum') && tags.wikipedia) {
    tier = 'must'
    score += 10
  }

  return { score, tier }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function fetchOverpass(query: string): Promise<OverpassElement[]> {
  let lastError: Error | null = null
  for (const endpoint of OVERPASS_URLS) {
    try {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), 18000)
      const res = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        signal: controller.signal,
      })
      window.clearTimeout(timer)
      if (!res.ok) throw new Error(`Overpass ${res.status}`)
      const text = await res.text()
      if (!text.trim().startsWith('{')) throw new Error('Overpass respuesta no JSON')
      const json = JSON.parse(text) as { elements?: OverpassElement[] }
      return json.elements ?? []
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Overpass falló')
    }
  }
  throw lastError ?? new Error('No se pudieron cargar sitios')
}

/** Consultas por hub: ciudad, región (pueblos) o país (varias ciudades). */
function buildAroundQueries(
  city: CityInfo,
  prefs: Preferences,
  dayCount: number,
  scale: AreaScale,
): Array<{ hint: PlaceCategory; query: string }> {
  const hubs = hubsForDestination(city.name, city.displayName, city, scale, dayCount)
  const radiusM = hubSearchRadiusM(scale)
  const foodR = Math.min(radiusM, scale === 'city' ? 16000 : 10000)
  const centers = hubs.map((h) => ({ lat: h.lat, lng: h.lng }))
  const foodCenters = centers.slice(0, scale === 'city' ? 5 : Math.min(4, centers.length))

  const mk = (
    filters: string[],
    hint: PlaceCategory,
    limit: number,
    pts: Array<{ lat: number; lng: number }>,
    r: number,
  ) => {
    const parts = pts.flatMap(({ lat, lng }) => {
      const around = `around:${r},${lat},${lng}`
      return filters.flatMap((f) => [`node(${around})${f};`, `way(${around})${f};`])
    })
    return {
      hint,
      query: `
        [out:json][timeout:18];
        (
          ${parts.join('\n')}
        );
        out center ${limit};
      `,
    }
  }

  const out: Array<{ hint: PlaceCategory; query: string }> = []
  const sightLimit = scale === 'country' ? 60 : scale === 'region' ? 55 : 50

  if (prefs.monuments || prefs.architecture || prefs.hidden || scale !== 'city') {
    out.push(
      mk(
        [
          `["tourism"="attraction"]["name"]`,
          `["historic"~"monument|castle|memorial"]["name"]`,
        ],
        'monument',
        sightLimit,
        centers,
        radiusM,
      ),
    )
  }
  if (prefs.museums) {
    out.push(
      mk(
        [`["tourism"="museum"]["name"]`, `["tourism"="gallery"]["name"]`],
        'museum',
        35,
        centers,
        radiusM,
      ),
    )
  }
  if (prefs.parks || prefs.viewpoints || scale === 'region') {
    out.push(
      mk(
        [
          `["leisure"="park"]["name"]`,
          `["tourism"="viewpoint"]["name"]`,
          `["natural"="peak"]["name"]`,
        ],
        scale === 'region' ? 'viewpoint' : 'park',
        30,
        centers,
        radiusM,
      ),
    )
  }
  if (prefs.viewpoints || prefs.night_walks) {
    out.push(mk([`["tourism"="viewpoint"]["name"]`], 'viewpoint', 20, centers, radiusM))
  }
  if (prefs.shows) {
    out.push(mk([`["amenity"="theatre"]["name"]`], 'show', 18, centers, radiusM))
  }
  if (prefs.markets) {
    out.push(mk([`["amenity"="marketplace"]["name"]`], 'market', 14, centers, radiusM))
  }
  if (prefs.neighborhoods || prefs.hidden || scale !== 'city') {
    out.push(
      mk(
        [
          `["place"="neighbourhood"]["name"]`,
          `["place"="village"]["name"]`,
          `["place"="town"]["name"]`,
        ],
        'local',
        scale === 'city' ? 12 : 25,
        centers,
        radiusM,
      ),
    )
  }
  if (prefs.restaurants) {
    out.push(mk([`["amenity"="restaurant"]["name"]`], 'food', 20, foodCenters, foodR))
  }
  if (prefs.cafes) {
    out.push(mk([`["amenity"="cafe"]["name"]`], 'cafe', 14, foodCenters, foodR))
  }
  if (prefs.street_food) {
    out.push(
      mk(
        [
          `["amenity"="fast_food"]["name"]`,
          `["amenity"="food_court"]["name"]`,
          `["cuisine"="street_food"]["name"]`,
        ],
        'food',
        18,
        foodCenters,
        foodR,
      ),
    )
  }
  if (prefs.shopping) {
    out.push(
      mk(
        [`["shop"="mall"]["name"]`, `["shop"="department_store"]["name"]`, `["tourism"="yes"]["shop"]["name"]`],
        'shopping',
        12,
        foodCenters,
        Math.min(foodR, 12000),
      ),
    )
  }
  if (prefs.nightlife) {
    out.push(
      mk(
        [
          `["amenity"="bar"]["name"]`,
          `["amenity"="pub"]["name"]`,
          `["amenity"="nightclub"]["name"]`,
        ],
        'nightlife',
        18,
        foodCenters,
        Math.min(foodR, 10000),
      ),
    )
  }

  if (!out.length) {
    out.push(
      mk(
        [`["tourism"="attraction"]["name"]`, `["tourism"="museum"]["name"]`],
        'monument',
        sightLimit,
        centers,
        radiusM,
      ),
    )
  }

  return out
}

async function wikiAt(lat: number, lng: number): Promise<GeoPlace[]> {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('list', 'geosearch')
  url.searchParams.set('gscoord', `${lat}|${lng}`)
  url.searchParams.set('gsradius', '10000') // máximo de la API
  url.searchParams.set('gslimit', '35')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return []
    const data = (await res.json()) as {
      query?: { geosearch?: Array<{ title: string; lat: number; lon: number; dist: number }> }
    }
    return (data.query?.geosearch ?? []).map((g) => {
      const title = g.title
      const lower = title.toLowerCase()
      let category: PlaceCategory = 'monument'
      if (/museum|gallery/.test(lower)) category = 'museum'
      else if (/park|garden|square|green/.test(lower)) category = 'park'
      else if (/theatre|theater|opera/.test(lower)) category = 'show'
      else if (/bridge|palace|castle|cathedral|abbey|tower|monument/.test(lower)) {
        category = 'monument'
      }
      const distKm = (g.dist || 0) / 1000
      const score = Math.max(48, 90 - distKm * 3)
      return {
        id: uid('place'),
        name: title,
        lat: g.lat,
        lng: g.lon,
        category,
        tier: score >= 78 ? ('must' as const) : ('recommended' as const),
        source: 'osm' as const,
        score,
        tags: ['wikipedia'],
        bestSlot: bestSlotFor(category),
        notes: 'Wikipedia',
      }
    })
  } catch {
    return []
  }
}

/** Wikipedia en varios hubs (ciudad / pueblos / ciudades del país). */
async function fetchWikipediaNearby(
  city: CityInfo,
  dayCount: number,
  scale: AreaScale,
): Promise<GeoPlace[]> {
  const hubs = hubsForDestination(city.name, city.displayName, city, scale, dayCount)
  const lists = await Promise.all(hubs.map((h) => wikiAt(h.lat, h.lng)))
  return lists.flat()
}

/** Nominatim por tipo turístico / pueblos en el alcance. */
async function fetchNominatimTourism(
  city: CityInfo,
  prefs: Preferences,
  dayCount: number,
  scale: AreaScale,
): Promise<GeoPlace[]> {
  const hubs = hubsForDestination(city.name, city.displayName, city, scale, dayCount)
  const queries: Array<{ q: string; category: PlaceCategory }> = []

  if (scale === 'region' || scale === 'country') {
    for (const h of hubs.slice(0, 6)) {
      queries.push({ q: `tourist attraction ${h.name}`, category: 'monument' })
      if (prefs.viewpoints || scale === 'region') {
        queries.push({ q: `viewpoint ${h.name}`, category: 'viewpoint' })
      }
    }
  } else {
    if (prefs.museums) queries.push({ q: `museum ${city.name}`, category: 'museum' })
    if (prefs.monuments || prefs.architecture) {
      queries.push({ q: `tourist attraction ${city.name}`, category: 'monument' })
    }
    if (prefs.parks) queries.push({ q: `park ${city.name}`, category: 'park' })
    if (prefs.markets) queries.push({ q: `market ${city.name}`, category: 'market' })
    if (prefs.shows) queries.push({ q: `theatre ${city.name}`, category: 'show' })
  }

  if (!queries.length) {
    queries.push({ q: `tourist attraction ${city.name}`, category: 'monument' })
  }

  const [s, w, n, e] = city.bbox
  const viewbox = `${w},${n},${e},${s}`

  const lists = await Promise.all(
    queries.slice(0, scale === 'city' ? 4 : 8).map(async ({ q, category }) => {
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search')
        url.searchParams.set('q', q)
        url.searchParams.set('format', 'json')
        url.searchParams.set('limit', scale === 'city' ? '15' : '10')
        url.searchParams.set('viewbox', viewbox)
        url.searchParams.set('bounded', scale === 'country' ? '0' : '1')
        const res = await fetch(url.toString(), {
          headers: { Accept: 'application/json', 'Accept-Language': 'en,es' },
        })
        if (!res.ok) return [] as GeoPlace[]
        const data = (await res.json()) as Array<{
          display_name: string
          lat: string
          lon: string
          name?: string
          type?: string
          class?: string
        }>
        return data.map((hit) => {
          const name = hit.name || hit.display_name.split(',')[0]
          return {
            id: uid('place'),
            name,
            lat: Number(hit.lat),
            lng: Number(hit.lon),
            category,
            tier: 'recommended' as const,
            source: 'osm' as const,
            score: 62,
            tags: [hit.type || hit.class || 'nominatim'],
            bestSlot: bestSlotFor(category),
            notes: 'Nominatim',
          }
        })
      } catch {
        return [] as GeoPlace[]
      }
    }),
  )

  return lists.flat()
}

export async function discoverPlaces(
  city: CityInfo,
  prefs: Preferences,
  style: RouteStyle,
  dayCount: number,
): Promise<GeoPlace[]> {
  const days = Math.max(1, dayCount)
  const scale: AreaScale = city.scale ?? 'city'
  const queries = buildAroundQueries(city, prefs, days, scale)

  const overpassPromise = Promise.all(
    queries.map(async (q) => {
      try {
        const els = await fetchOverpass(q.query)
        return els
          .map((el) => elementToPlace(el, q.hint, style, city))
          .filter((p): p is GeoPlace => Boolean(p))
      } catch {
        return [] as GeoPlace[]
      }
    }),
  )

  const [bucketResults, wiki, nominatim, otm] = await Promise.all([
    overpassPromise,
    fetchWikipediaNearby(city, days, scale).catch(() => [] as GeoPlace[]),
    fetchNominatimTourism(city, prefs, days, scale).catch(() => [] as GeoPlace[]),
    fetchOpenTripMap(city, prefs).catch(() => [] as GeoPlace[]),
  ])

  const seen = new Set<string>()
  const raw: GeoPlace[] = []

  for (const p of [...otm, ...bucketResults.flat(), ...wiki, ...nominatim]) {
    const key = `${p.name.toLowerCase()}_${p.lat.toFixed(3)}_${p.lng.toFixed(3)}`
    if (seen.has(key)) continue
    seen.add(key)
    raw.push(p)
  }

  for (const p of raw) {
    if (
      (style.explore === 'local' || style.explore === 'mixed') &&
      (p.category === 'monument' || p.category === 'park') &&
      p.tier === 'optional' &&
      prefs.hidden
    ) {
      p.category = style.explore === 'local' ? 'local' : 'hidden'
      p.bestSlot = bestSlotFor(p.category)
    }
  }

  const isNightFood = (p: GeoPlace) =>
    p.category === 'nightlife' || p.category === 'food' || p.category === 'cafe'
  const sights = raw.filter((p) => !isNightFood(p)).sort((a, b) => b.score - a.score)
  const foods = raw
    .filter((p) => p.category === 'food' || p.category === 'cafe')
    .sort((a, b) => b.score - a.score)
  const nights = raw.filter((p) => p.category === 'nightlife').sort((a, b) => b.score - a.score)

  const sightCap = Math.min(100, 40 + days * 12 + (scale === 'country' ? 20 : scale === 'region' ? 15 : 0))
  const foodCap = Math.min(24, 10 + days * 2)

  const picked = [
    ...sights.slice(0, sightCap),
    ...foods.slice(0, foodCap),
    ...(prefs.nightlife ? nights.slice(0, 8) : []),
  ]

  // Solo marcar "must" reales por score — no inflar artificialmente el top
  // (eso hacía que casi todo pareciera imprescindible).

  if (prefs.night_walks) {
    let n = 0
    for (const p of picked) {
      if (
        (p.category === 'monument' ||
          p.category === 'viewpoint' ||
          p.category === 'local' ||
          p.category === 'hidden') &&
        n < 10
      ) {
        p.bestSlot = 'evening'
        n += 1
      }
    }
  }

  return picked.sort((a, b) => b.score - a.score)
}

function otmKinds(prefs: Preferences): string {
  const kinds: string[] = []
  if (prefs.monuments) kinds.push('interesting_places', 'historic')
  if (prefs.museums) kinds.push('museums')
  if (prefs.viewpoints) kinds.push('view_points')
  if (prefs.parks) kinds.push('natural', 'gardens_and_parks')
  if (prefs.restaurants) kinds.push('restaurants')
  if (prefs.cafes) kinds.push('cafes')
  if (prefs.street_food) kinds.push('foods')
  if (prefs.nightlife) kinds.push('bars', 'pubs')
  if (prefs.hidden) kinds.push('architecture', 'cultural')
  if (prefs.architecture) kinds.push('architecture', 'churches')
  if (prefs.markets) kinds.push('foods')
  if (prefs.shopping) kinds.push('shops')
  if (prefs.shows) kinds.push('theatres_and_entertainments')
  if (prefs.night_walks) kinds.push('view_points', 'historic')
  return (kinds.length ? kinds : ['interesting_places']).join(',')
}

function otmCategory(kinds: string): PlaceCategory {
  if (kinds.includes('museum')) return 'museum'
  if (kinds.includes('restaurant') || kinds.includes('food')) return 'food'
  if (kinds.includes('cafe')) return 'cafe'
  if (kinds.includes('bar') || kinds.includes('pub')) return 'nightlife'
  if (kinds.includes('theatre') || kinds.includes('cinema')) return 'show'
  if (kinds.includes('shop')) return 'shopping'
  if (kinds.includes('view')) return 'viewpoint'
  if (kinds.includes('park') || kinds.includes('garden') || kinds.includes('natural')) return 'park'
  if (kinds.includes('historic') || kinds.includes('church')) return 'monument'
  return 'must_see'
}

async function fetchOpenTripMap(city: CityInfo, prefs: Preferences): Promise<GeoPlace[]> {
  const key = import.meta.env.VITE_OPENTRIPMAP_KEY as string | undefined
  if (!key) return []

  const url = new URL('https://api.opentripmap.com/0.1/en/places/radius')
  url.searchParams.set('radius', '25000')
  url.searchParams.set('lon', String(city.lng))
  url.searchParams.set('lat', String(city.lat))
  url.searchParams.set('kinds', otmKinds(prefs))
  url.searchParams.set('rate', '2')
  url.searchParams.set('limit', '120')
  url.searchParams.set('apikey', key)

  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = (await res.json()) as {
    features?: Array<{
      properties?: { name?: string; kinds?: string; rate?: number }
      geometry?: { coordinates?: [number, number] }
    }>
  }

  const places: GeoPlace[] = []
  for (const f of data.features ?? []) {
    const name = f.properties?.name?.trim()
    const coords = f.geometry?.coordinates
    if (!name || !coords) continue
    const [lng, lat] = coords
    const kinds = f.properties?.kinds ?? ''
    const category = otmCategory(kinds)
    const rate = f.properties?.rate ?? 0
    places.push({
      id: uid('place'),
      name,
      lat,
      lng,
      category,
      tier: rate >= 3 ? 'must' : rate >= 2 ? 'recommended' : 'optional',
      source: 'osm',
      score: 50 + rate * 12,
      tags: kinds.split(',').slice(0, 8),
      bestSlot: bestSlotFor(category),
      notes: 'OpenTripMap',
    })
  }
  return places
}

function elementToPlace(
  el: OverpassElement,
  hint: PlaceCategory,
  style: RouteStyle,
  city: CityInfo,
): GeoPlace | null {
  const tags = el.tags ?? {}
  const name = tags.name || tags['name:en'] || tags['name:es']
  if (!name) return null
  const c = coordsOf(el)
  if (!c) return null
  const category = classify(tags, hint)
  const { score, tier } = scorePlace(
    tags,
    category,
    style.explore,
    city,
    c.lat,
    c.lng,
    style.foodBudget,
  )
  const tagsList = Object.entries(tags)
    .filter(([k]) => ['tourism', 'historic', 'amenity', 'cuisine', 'shop'].includes(k))
    .map(([, v]) => v)
  if (tags.amenity === 'fast_food' || tags.amenity === 'food_court') tagsList.push('street_food')
  const website =
    tags.website || tags['contact:website'] || tags.url || tags['contact:url'] || undefined
  const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || undefined
  const webNorm = website
    ? /^https?:\/\//i.test(website)
      ? website
      : `https://${website.replace(/^\/\//, '')}`
    : undefined
  // Bonus leve si tiene web (más fácil reservar / verificar)
  let scoreAdj = score
  if (webNorm) scoreAdj += 8
  if (phone) scoreAdj += 3
  return {
    id: uid('place'),
    name,
    lat: c.lat,
    lng: c.lng,
    category,
    tier,
    source: 'osm',
    tags: [...new Set(tagsList)].slice(0, 12),
    score: scoreAdj,
    bestSlot: bestSlotFor(category),
    notes: tags.description || undefined,
    website: webNorm,
    phone: phone || undefined,
  }
}

export function filterAlongRoute(
  candidates: GeoPlace[],
  path: { lat: number; lng: number }[],
  maxDistanceKm = 0.35,
  limit = 8,
): GeoPlace[] {
  if (path.length < 2) return []
  const scored = candidates
    .map((p) => ({
      place: p,
      d: minDistanceToPathKm(p.lat, p.lng, path),
    }))
    .filter((x) => x.d <= maxDistanceKm)
    .sort((a, b) => a.d - b.d || b.place.score - a.place.score)

  const out: GeoPlace[] = []
  const used = new Set<string>()
  for (const item of scored) {
    if (used.has(item.place.id)) continue
    used.add(item.place.id)
    out.push(item.place)
    if (out.length >= limit) break
  }
  return out
}

function minDistanceToPathKm(
  lat: number,
  lng: number,
  path: { lat: number; lng: number }[],
): number {
  let min = Infinity
  for (const pt of path) {
    min = Math.min(min, haversineKm(lat, lng, pt.lat, pt.lng))
  }
  return min
}
