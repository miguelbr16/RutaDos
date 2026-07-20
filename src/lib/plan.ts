import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { uid } from './id'
import { enrichDayStops } from './planEnrichment'
import type {
  DayFocus,
  DayIntensity,
  DayPlan,
  GeoPlace,
  HotelInfo,
  Mobility,
  RouteStyle,
  Stop,
  TimeSlot,
  TransitMode,
  TransportHint,
  TripLogistics,
} from '../types'

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

function parseHour(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) + (m || 0) / 60
}

function formatHour(h: number): string {
  let hh = Math.floor(h)
  let mm = Math.round((h - Math.floor(h)) * 60)
  if (mm >= 60) {
    hh += 1
    mm = 0
  }
  // 24:00 → 00:00 (vuelta al hotel de madrugada)
  hh = ((hh % 24) + 24) % 24
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function isFoodish(p: GeoPlace | Stop): boolean {
  return p.category === 'food' || p.category === 'cafe' || p.category === 'nightlife'
}

function isSight(p: GeoPlace): boolean {
  return !isFoodish(p)
}

function stopsBudget(
  pace: RouteStyle['pace'],
  intensity: DayIntensity,
  arrivalHour: number,
  departureHour: number,
): { maxStops: number; startHour: number; endHour: number; note: string } {
  if (intensity === 'arrival') {
    // Día 1: plan hasta noche; vuelta al hotel ~22–00
    if (arrivalHour >= 18) {
      return {
        maxStops: pace === 'intense' ? 4 : 3,
        startHour: Math.min(arrivalHour + 1, 20),
        endHour: 23.5,
        note: 'Día de llegada tarde: cena/noche cerca del hotel; vuelta ~23–00.',
      }
    }
    if (arrivalHour >= 14) {
      return {
        maxStops: pace === 'relaxed' ? 4 : pace === 'intense' ? 6 : 5,
        startHour: Math.min(arrivalHour + 0.75, 16),
        endHour: 23,
        note: 'Día de llegada: tras el check-in, tarde + noche; vuelta al hotel ~22–00.',
      }
    }
    return {
      maxStops: pace === 'relaxed' ? 6 : pace === 'intense' ? 8 : 7,
      startHour: Math.max(arrivalHour + 0.75, 10),
      endHour: 23.5,
      note: 'Día de llegada temprano: jornada larga hasta la noche; vuelta ~00.',
    }
  }

  if (intensity === 'departure') {
    if (departureHour <= 12) {
      return {
        maxStops: 2,
        startHour: 8,
        endHour: Math.max(departureHour - 2, 9),
        note: 'Día de salida temprano: solo lo esencial cerca del hotel / camino al aeropuerto.',
      }
    }
    return {
      maxStops: pace === 'relaxed' ? 3 : 5,
      startHour: 9,
      endHour: Math.max(departureHour - 2.5, 12),
      note: 'Día de salida: mañana/mediodía y margen para el aeropuerto.',
    }
  }

  const max =
    pace === 'relaxed' ? 8 : pace === 'intense' ? 12 : 10
  return {
    maxStops: max,
    startHour: 9,
    endHour: 23.5,
    note: 'Día completo: mañana → noche; vuelta al hotel ~22–00.',
  }
}

export function optimizeOrder(
  stops: Stop[],
  startFrom?: { lat: number; lng: number } | null,
): Stop[] {
  // No reordenar anclas de hotel aquí; se reaplican con wrapWithHotelRoundTrip
  const visits = stops.filter((s) => !s.isHotel)
  if (visits.length <= 2) {
    return visits.map((s, i) => ({ ...s, order: i }))
  }

  const remaining = [...visits]
  let currentIdx = 0
  let best = Infinity

  if (startFrom) {
    remaining.forEach((s, i) => {
      const d = haversineKm(startFrom.lat, startFrom.lng, s.lat, s.lng)
      if (d < best) {
        best = d
        currentIdx = i
      }
    })
  } else {
    const centroid = {
      lat: remaining.reduce((a, s) => a + s.lat, 0) / remaining.length,
      lng: remaining.reduce((a, s) => a + s.lng, 0) / remaining.length,
    }
    remaining.forEach((s, i) => {
      const d = haversineKm(centroid.lat, centroid.lng, s.lat, s.lng)
      if (d < best) {
        best = d
        currentIdx = i
      }
    })
  }

  const ordered: Stop[] = []
  let current = remaining.splice(currentIdx, 1)[0]
  ordered.push(current)

  while (remaining.length) {
    let ni = 0
    let nd = Infinity
    remaining.forEach((s, i) => {
      const d = haversineKm(current.lat, current.lng, s.lat, s.lng)
      if (d < nd) {
        nd = d
        ni = i
      }
    })
    current = remaining.splice(ni, 1)[0]
    ordered.push(current)
  }

  return ordered.map((s, i) => ({ ...s, order: i }))
}

/** Radio máx. desde el centro de la ciudad según enfoque del día */
export function focusMaxKm(focus: DayFocus | undefined, preferCentral: boolean): number {
  const f = focus ?? (preferCentral ? 'central' : 'mixed')
  if (f === 'central') return 7.5
  if (f === 'outskirts') return 45
  return 16
}

export function filterByFocus(
  places: GeoPlace[],
  city: { lat: number; lng: number },
  focus: DayFocus | undefined,
  preferCentral: boolean,
): GeoPlace[] {
  const maxKm = focusMaxKm(focus, preferCentral)
  if (maxKm >= 40) return places
  const near = places.filter((p) => haversineKm(city.lat, city.lng, p.lat, p.lng) <= maxKm)
  return near.length >= 4 ? near : places
}

function makeHotelStop(
  hotel: HotelInfo,
  order: number,
  kind: 'start' | 'end',
  time?: string,
): Stop {
  return {
    id: uid('stop'),
    placeId: `hotel-${kind}`,
    name: kind === 'start' ? `Salida · ${hotel.name}` : `Vuelta · ${hotel.name}`,
    lat: hotel.lat,
    lng: hotel.lng,
    category: 'custom',
    notes: kind,
    order,
    slot: kind === 'start' ? 'morning' : 'night',
    suggestedTime: time,
    isHotel: true,
  }
}

/** Cada día: hotel → visitas → hotel */
export function wrapWithHotelRoundTrip(
  visits: Stop[],
  hotel: HotelInfo | null,
  startTime = '09:30',
  endTime = '00:00',
): Stop[] {
  const middle = visits.filter((s) => !s.isHotel).map((s, i) => ({ ...s, order: i + (hotel ? 1 : 0) }))
  if (!hotel) return middle.map((s, i) => ({ ...s, order: i }))
  const start = makeHotelStop(hotel, 0, 'start', startTime)
  const end = makeHotelStop(hotel, middle.length + 1, 'end', endTime)
  return [start, ...middle, end].map((s, i) => ({ ...s, order: i }))
}

function hintToMode(hint?: TransportHint): TransitMode {
  if (hint === 'walk') return 'walk'
  if (hint === 'drive') return 'taxi'
  if (hint === 'transit') return 'metro'
  return 'walk'
}

function scenicBonus(
  from: Stop,
  to: Stop,
  parksNearby: GeoPlace[],
  preferScenic: boolean,
): { preferWalk: boolean; reason?: string } {
  if (!preferScenic) return { preferWalk: false }
  const midLat = (from.lat + to.lat) / 2
  const midLng = (from.lng + to.lng) / 2
  const nearPark = parksNearby.find(
    (p) => haversineKm(midLat, midLng, p.lat, p.lng) < 0.45,
  )
  if (nearPark) {
    return {
      preferWalk: true,
      reason: `Mejor a pie: pasáis cerca de ${nearPark.name} (paseo agradable).`,
    }
  }
  // Short urban hop — walking often nicer than metro for 1 stop
  const km = haversineKm(from.lat, from.lng, to.lat, to.lng)
  if (km > 0.4 && km < 1.6 && (from.category === 'park' || to.category === 'park' || from.category === 'hidden' || to.category === 'local')) {
    return {
      preferWalk: true,
      reason: 'Mejor a pie: tramo corto por zona interesante, sin perderos el barrio.',
    }
  }
  return { preferWalk: false }
}

export function transportHint(
  km: number,
  mobility: Mobility,
  scenic?: { preferWalk: boolean; reason?: string },
): { hint: TransportHint; minutes: number; reason: string } {
  const walkMin = Math.round((km / 4.5) * 60)
  const transitMin = Math.round(8 + (km / 18) * 60)
  const driveMin = Math.round(5 + (km / 25) * 60)

  if (scenic?.preferWalk && km <= 2.2 && mobility !== 'transit') {
    return {
      hint: 'walk',
      minutes: walkMin,
      reason: scenic.reason || 'Andando aprovecháis mejor el entorno.',
    }
  }

  if (mobility === 'drive') {
    if (km < 0.5) {
      return {
        hint: 'walk',
        minutes: walkMin,
        reason: 'Tan cerca que no compensa mover la furgoneta/coche.',
      }
    }
    return {
      hint: 'drive',
      minutes: driveMin,
      reason: `En coche/furgoneta (~${km.toFixed(1)} km, ~${driveMin} min).`,
    }
  }

  if (mobility === 'walk') {
    if (km > 3.5) {
      return {
        hint: 'transit',
        minutes: transitMin,
        reason: `Son ~${km.toFixed(1)} km: transporte público evita cansancio innecesario.`,
      }
    }
    return {
      hint: 'walk',
      minutes: walkMin,
      reason: km < 1 ? 'Muy cerca: a pie es lo más rápido y flexible.' : 'Distancia cómoda andando.',
    }
  }

  if (mobility === 'transit') {
    if (km < 0.6) {
      return {
        hint: 'walk',
        minutes: walkMin,
        reason: 'Tan cerca que el transporte no compensa (espera + andares).',
      }
    }
    return {
      hint: 'transit',
      minutes: transitMin,
      reason: `Transporte público óptimo (~${km.toFixed(1)} km, ~${transitMin} min).`,
    }
  }

  // mixed — pick optimal
  if (km < 1.1 || scenic?.preferWalk) {
    return {
      hint: 'walk',
      minutes: walkMin,
      reason:
        scenic?.reason ||
        (km < 0.8
          ? 'A pie es lo más óptimo: cerca y sin esperas.'
          : 'Andando suele ganar en tramos urbanos cortos.'),
    }
  }
  if (km < 7) {
    return {
      hint: 'transit',
      minutes: transitMin,
      reason: `Transporte público: mejor tiempo/esfuerzo (~${km.toFixed(1)} km).`,
    }
  }
  return {
    hint: 'drive',
    minutes: driveMin,
    reason: `Tramo largo (~${km.toFixed(1)} km): taxi/coche ahorra tiempo.`,
  }
}

export function annotateTransport(
  stops: Stop[],
  mobility: Mobility,
  style?: RouteStyle,
  parkPool: GeoPlace[] = [],
): Stop[] {
  const preferScenic = style?.preferScenicWalks ?? true
  return stops.map((s, i) => {
    const next = stops[i + 1]
    if (!next) {
      return {
        ...s,
        transportToNext: undefined,
        minutesToNext: undefined,
        transportReason: undefined,
      }
    }
    const km = haversineKm(s.lat, s.lng, next.lat, next.lng)
    const scenic = scenicBonus(s, next, parkPool, preferScenic)
    const t = transportHint(km, mobility, scenic)
    return {
      ...s,
      transportToNext: t.hint,
      transitMode: s.transitMode ?? hintToMode(t.hint),
      minutesToNext: t.minutes,
      transportReason: t.reason,
    }
  })
}

function placeToStop(place: GeoPlace, order: number, slot?: TimeSlot, time?: string): Stop {
  return {
    id: uid('stop'),
    placeId: place.id,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    category: place.category,
    notes: place.notes,
    order,
    slot: slot ?? place.bestSlot,
    suggestedTime: time,
  }
}

function pickNear(
  pool: GeoPlace[],
  origin: { lat: number; lng: number },
  maxKm: number,
  count: number,
  used: Set<string>,
  predicate: (p: GeoPlace) => boolean = () => true,
): GeoPlace[] {
  return pool
    .filter((p) => !used.has(p.id) && predicate(p))
    .map((p) => ({ p, d: haversineKm(origin.lat, origin.lng, p.lat, p.lng) }))
    .filter((x) => x.d <= maxKm)
    .sort((a, b) => a.d - b.d || b.p.score - a.p.score)
    .slice(0, count)
    .map((x) => x.p)
}

function assignSlotsAndTimes(
  places: GeoPlace[],
  startHour: number,
  endHour: number,
  intensity: DayIntensity,
): { place: GeoPlace; slot: TimeSlot; time: string }[] {
  const slotsOrder: TimeSlot[] =
    intensity === 'arrival' && startHour >= 18
      ? ['evening', 'night']
      : intensity === 'arrival' && startHour >= 15
        ? ['afternoon', 'evening', 'night']
        : intensity === 'departure'
          ? ['morning', 'lunch']
          : ['morning', 'lunch', 'afternoon', 'evening', 'night']

  const bySlot: Record<TimeSlot, GeoPlace[]> = {
    morning: [],
    lunch: [],
    afternoon: [],
    evening: [],
    night: [],
  }

  const sorted = [...places].sort((a, b) => b.score - a.score)
  for (const p of sorted) {
    let slot: TimeSlot = p.bestSlot ?? 'afternoon'
    if (p.category === 'nightlife') slot = 'night'
    else if (p.category === 'food' && !bySlot.lunch.length) slot = 'lunch'
    else if (p.category === 'food') slot = 'evening'
    else if (p.category === 'cafe' && startHour < 12) slot = 'morning'
    else if (p.category === 'museum' || p.category === 'monument') {
      slot = bySlot.morning.length <= bySlot.afternoon.length ? 'morning' : 'afternoon'
    }
    if (!slotsOrder.includes(slot)) {
      slot = slotsOrder[0]
    }
    bySlot[slot].push(p)
  }

  // Cap per slot — días largos hasta la noche
  const caps: Record<TimeSlot, number> = {
    morning: intensity === 'full' ? 4 : 3,
    lunch: 1,
    afternoon: intensity === 'full' ? 4 : 3,
    evening: 2,
    night: intensity === 'departure' ? 0 : 2,
  }

  const timed: { place: GeoPlace; slot: TimeSlot; time: string }[] = []
  const span = Math.max(endHour - startHour, 2)
  let cursor = startHour

  for (const slot of slotsOrder) {
    const items = bySlot[slot].slice(0, caps[slot])
    for (const place of items) {
      if (cursor > endHour) break
      timed.push({ place, slot, time: formatHour(Math.min(cursor, endHour - 0.5)) })
      cursor += place.category === 'museum' ? 1.75 : place.category === 'food' ? 1.25 : 1.1
    }
    // jump toward typical slot hours
    if (slot === 'morning') cursor = Math.max(cursor, Math.min(startHour + 0.2, 11))
    if (slot === 'lunch') cursor = Math.max(cursor, 13)
    if (slot === 'afternoon') cursor = Math.max(cursor, 15.5)
    // Cena ~20–21; noche / vuelta hotel hasta ~00
    if (slot === 'evening') cursor = Math.max(cursor, 20)
    if (slot === 'night') cursor = Math.max(cursor, 22)
  }

  // If somehow empty, dump remaining with afternoon
  if (!timed.length) {
    return places.slice(0, 4).map((place, i) => ({
      place,
      slot: 'afternoon' as TimeSlot,
      time: formatHour(startHour + i * (span / 4)),
    }))
  }

  return timed
}

function geographicClusters(places: GeoPlace[], dayCount: number): GeoPlace[][] {
  if (dayCount <= 1) return [places]
  // Sort by angle from city centroid of the set for contiguous neighborhoods per day
  const lat0 = places.reduce((s, p) => s + p.lat, 0) / Math.max(places.length, 1)
  const lng0 = places.reduce((s, p) => s + p.lng, 0) / Math.max(places.length, 1)
  const sorted = [...places].sort((a, b) => {
    const aa = Math.atan2(a.lat - lat0, a.lng - lng0)
    const bb = Math.atan2(b.lat - lat0, b.lng - lng0)
    return aa - bb
  })
  const buckets: GeoPlace[][] = Array.from({ length: dayCount }, () => [])
  const size = Math.ceil(sorted.length / dayCount)
  sorted.forEach((p, i) => {
    buckets[Math.min(dayCount - 1, Math.floor(i / size))].push(p)
  })
  return buckets
}

export function buildDayPlans(
  places: GeoPlace[],
  startDate: string,
  endDate: string,
  style: RouteStyle,
  logistics: TripLogistics,
  cityCenter?: { lat: number; lng: number },
): DayPlan[] {
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  const dayCount = Math.max(1, differenceInCalendarDays(end, start) + 1)
  const arrivalH = parseHour(logistics.arrivalTime || '15:00')
  const departureH = parseHour(logistics.departureTime || '18:00')
  const hotel = logistics.hotel
  const hotelPoint = hotel ? { lat: hotel.lat, lng: hotel.lng } : null
  const center = cityCenter ?? hotelPoint ?? { lat: places[0]?.lat ?? 0, lng: places[0]?.lng ?? 0 }

  const preferCentral = style.preferCentral !== false
  const defaultFocus: DayFocus = preferCentral ? 'central' : 'mixed'

  const sightsAll = places.filter(isSight).sort((a, b) => b.score - a.score)
  const sights = filterByFocus(sightsAll, center, defaultFocus, preferCentral)
  const foods = filterByFocus(
    places.filter((p) => p.category === 'food' || p.category === 'cafe'),
    center,
    defaultFocus,
    preferCentral,
  )
  const nightlife = places.filter((p) => p.category === 'nightlife')
  const parks = filterByFocus(
    places.filter((p) => p.category === 'park'),
    center,
    defaultFocus,
    preferCentral,
  )

  // Full days get geographic clusters; arrival/departure handled near hotel
  const fullDayIndexes: number[] = []
  for (let i = 0; i < dayCount; i++) {
    const intensity: DayIntensity =
      dayCount === 1
        ? 'light'
        : i === 0
          ? 'arrival'
          : i === dayCount - 1
            ? 'departure'
            : 'full'
    if (intensity === 'full' || intensity === 'light') fullDayIndexes.push(i)
  }

  const clusterSource = sights.slice(0, Math.max(20, fullDayIndexes.length * 8))
  const clusters = geographicClusters(
    clusterSource,
    Math.max(1, fullDayIndexes.length || 1),
  )
  let clusterPtr = 0

  const used = new Set<string>()
  const days: DayPlan[] = []

  for (let i = 0; i < dayCount; i++) {
    const date = addDays(start, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const intensity: DayIntensity =
      dayCount === 1
        ? arrivalH >= 14
          ? 'arrival'
          : 'full'
        : i === 0
          ? 'arrival'
          : i === dayCount - 1
            ? 'departure'
            : 'full'

    const budget = stopsBudget(style.pace, intensity, arrivalH, departureH)
    const origin = hotelPoint ?? center

    let dayPlaces: GeoPlace[] = []
    // Llegada/salida: cerca del hotel. Días completos: cluster central (si preferCentral)
    const dayFocus: DayFocus =
      intensity === 'arrival' || intensity === 'departure' ? 'central' : defaultFocus

    if (intensity === 'arrival' || intensity === 'departure') {
      const driveLike = style.mobility === 'drive'
      const radius = intensity === 'arrival' ? (driveLike ? 8 : 2.2) : driveLike ? 12 : 2.8
      dayPlaces = [
        ...pickNear(sights, origin, radius, Math.ceil(budget.maxStops * 0.65), used),
        ...pickNear(foods, origin, radius, 1, used),
      ]
      if (style.pace !== 'relaxed' && intensity === 'arrival' && arrivalH < 19) {
        dayPlaces.push(...pickNear(parks, origin, radius, 1, used))
      }
      if (dayPlaces.length < 2) {
        dayPlaces = [
          ...pickNear(sights, origin, driveLike ? 25 : 5, budget.maxStops - 1, used),
          ...pickNear(foods, origin, driveLike ? 15 : 5, 1, used),
        ]
      }
    } else {
      const cluster = clusters[clusterPtr++] ?? sights
      const fromCluster = cluster.filter((p) => !used.has(p.id)).slice(0, budget.maxStops - 2)
      dayPlaces = [...fromCluster]
      const cLat =
        fromCluster.reduce((s, p) => s + p.lat, 0) / Math.max(fromCluster.length, 1) || origin.lat
      const cLng =
        fromCluster.reduce((s, p) => s + p.lng, 0) / Math.max(fromCluster.length, 1) || origin.lng
      const foodRadius = style.mobility === 'drive' ? 12 : 2.5
      dayPlaces.push(...pickNear(foods, { lat: cLat, lng: cLng }, foodRadius, 2, used))
      if (nightlife.length && budget.endHour >= 21) {
        dayPlaces.push(...pickNear(nightlife, { lat: cLat, lng: cLng }, 3, 1, used))
      }
    }

    dayPlaces = dayPlaces.slice(0, budget.maxStops)
    dayPlaces.forEach((p) => used.add(p.id))

    const timed = assignSlotsAndTimes(
      dayPlaces,
      budget.startHour,
      budget.endHour,
      intensity,
    )

    let stops = timed.map((t, idx) => placeToStop(t.place, idx, t.slot, t.time))
    stops = optimizeOrder(stops, hotelPoint)
    stops = [...stops]
      .sort((a, b) => (a.suggestedTime || '').localeCompare(b.suggestedTime || ''))
      .map((s, idx) => ({ ...s, order: idx }))
    stops = optimizeKeepingDayArc(stops, hotelPoint)
    stops = wrapWithHotelRoundTrip(
      stops,
      hotel,
      formatHour(budget.startHour),
      // Vuelta al hotel de noche (~22–00), no a media tarde
      formatHour(Math.max(budget.endHour, intensity === 'departure' ? budget.endHour : 23)),
    )
    stops = annotateTransport(stops, style.mobility, style, parks)
    const rich = enrichDayStops(stops, places, intensity)
    stops = rich.stops

    const focusNote =
      dayFocus === 'central'
        ? ' Enfoque: centro (podéis cambiar a afueras en el día).'
        : dayFocus === 'mixed'
          ? ' Enfoque: mixto centro / barrio.'
          : ' Enfoque: afueras / excursión.'

    days.push({
      id: uid('day'),
      date: dateStr,
      label: format(date, "EEEE d MMM", { locale: es }),
      intensity,
      note: [budget.note || '', focusNote, rich.dayNoteExtra].filter(Boolean).join(' ').trim(),
      stops,
      focus: dayFocus,
      planSource: 'suggested',
    })
  }

  return days
}

/** Optimize path while roughly keeping morning → night progression */
function optimizeKeepingDayArc(
  stops: Stop[],
  startFrom?: { lat: number; lng: number } | null,
): Stop[] {
  if (stops.length <= 3) return optimizeOrder(stops, startFrom)

  const slotRank: Record<TimeSlot, number> = {
    morning: 0,
    lunch: 1,
    afternoon: 2,
    evening: 3,
    night: 4,
  }

  const groups = new Map<number, Stop[]>()
  for (const s of stops) {
    const r = slotRank[s.slot ?? 'afternoon']
    if (!groups.has(r)) groups.set(r, [])
    groups.get(r)!.push(s)
  }

  const ordered: Stop[] = []
  let anchor = startFrom
  for (const r of [...groups.keys()].sort((a, b) => a - b)) {
    const group = optimizeOrder(groups.get(r)!, anchor)
    ordered.push(...group)
    const last = group[group.length - 1]
    if (last) anchor = { lat: last.lat, lng: last.lng }
  }

  return ordered.map((s, i) => ({ ...s, order: i }))
}

/** Recalcula horas según el orden actual (útil tras optimizar / añadir paradas). */
export function retimeStops(stops: Stop[], startHour = 9.5): Stop[] {
  const ordered = [...stops].sort((a, b) => a.order - b.order)
  let cursor = startHour

  return ordered.map((s, i) => {
    if (s.category === 'cafe' && cursor < 12) {
      cursor = Math.max(cursor, startHour)
    } else if (s.category === 'food' && (s.slot === 'lunch' || (cursor < 15 && cursor >= 12))) {
      cursor = Math.max(cursor, 13)
    } else if (
      s.category === 'food' ||
      s.slot === 'evening' ||
      (s.category === 'show' && cursor >= 17)
    ) {
      cursor = Math.max(cursor, 20)
    } else if (s.category === 'nightlife' || s.slot === 'night') {
      cursor = Math.max(cursor, 21.5)
    }

    const time = formatHour(cursor)
    const dur =
      s.category === 'museum'
        ? 1.75
        : s.category === 'food'
          ? 1.25
          : s.category === 'show'
            ? 2
            : 1.1
    cursor += dur

    const slot: TimeSlot =
      s.slot ??
      (cursor <= 12
        ? 'morning'
        : cursor <= 14.5
          ? 'lunch'
          : cursor <= 18
            ? 'afternoon'
            : cursor <= 21.5
              ? 'evening'
              : 'night')

    return { ...s, order: i, suggestedTime: time, slot }
  })
}

function startHourForDay(day: DayPlan): number {
  if (day.intensity === 'arrival') return 16
  if (day.intensity === 'departure') return 9
  if (day.intensity === 'light') return 10
  return 9.5
}

export function rebuildDayTransport(
  day: DayPlan,
  mobility: Mobility,
  style?: RouteStyle,
  parkPool: GeoPlace[] = [],
  opts?: { retime?: boolean; hotel?: HotelInfo | null; wishlist?: GeoPlace[] },
): DayPlan {
  let visits = [...day.stops].filter((s) => !s.isHotel).sort((a, b) => a.order - b.order)
  visits = visits.map((s, i) => ({ ...s, order: i }))
  const timed = opts?.retime === false ? visits : retimeStops(visits, startHourForDay(day))
  let stops = timed
  if (opts?.hotel) {
    stops = wrapWithHotelRoundTrip(timed, opts.hotel)
  }
  stops = annotateTransport(stops, mobility, style, parkPool)
  if (opts?.wishlist?.length) {
    const rich = enrichDayStops(stops, opts.wishlist, day.intensity)
    stops = rich.stops
  }
  return {
    ...day,
    stops,
  }
}

export function moveStop(
  day: DayPlan,
  stopId: string,
  direction: -1 | 1,
  mobility: Mobility,
  style?: RouteStyle,
  parkPool: GeoPlace[] = [],
): DayPlan {
  const stops = [...day.stops].sort((a, b) => a.order - b.order)
  const idx = stops.findIndex((s) => s.id === stopId)
  if (idx < 0) return day
  const j = idx + direction
  if (j < 0 || j >= stops.length) return day
  const tmp = stops[idx]
  stops[idx] = stops[j]
  stops[j] = tmp
  return rebuildDayTransport({ ...day, stops }, mobility, style, parkPool)
}

export function removeStop(
  day: DayPlan,
  stopId: string,
  mobility: Mobility,
  style?: RouteStyle,
  parkPool: GeoPlace[] = [],
): DayPlan {
  const stops = day.stops.filter((s) => s.id !== stopId)
  return rebuildDayTransport({ ...day, stops }, mobility, style, parkPool)
}

export function addManualStop(
  day: DayPlan,
  data: { name: string; lat: number; lng: number; notes?: string },
  mobility: Mobility,
  style?: RouteStyle,
  parkPool: GeoPlace[] = [],
): DayPlan {
  const stop: Stop = {
    id: uid('stop'),
    placeId: uid('manual'),
    name: data.name,
    lat: data.lat,
    lng: data.lng,
    category: 'custom',
    notes: data.notes,
    order: day.stops.length,
    slot: 'afternoon',
  }
  return rebuildDayTransport({ ...day, stops: [...day.stops, stop] }, mobility, style, parkPool)
}

export function addPlaceAsStop(
  day: DayPlan,
  place: GeoPlace,
  mobility: Mobility,
  style?: RouteStyle,
  parkPool: GeoPlace[] = [],
): DayPlan {
  if (day.stops.some((s) => s.placeId === place.id)) return day
  const stop = placeToStop(place, day.stops.length, place.bestSlot)
  return rebuildDayTransport({ ...day, stops: [...day.stops, stop] }, mobility, style, parkPool)
}
