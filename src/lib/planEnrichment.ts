import type { DayIntensity, GeoPlace, Stop } from '../types'

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

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/** Tips de reserva / entrada (estilo guía París) según el nombre del sitio. */
const BOOKING_HINTS: { match: RegExp; tip: string }[] = [
  { match: /eiffel|torre eiffel/, tip: 'Reserva online con antelación (toureiffel.paris).' },
  { match: /sainte-?chapelle/, tip: 'Reserva online obligatoria en temporada.' },
  {
    match: /louvre/,
    tip: 'Si entráis, comprad franja online; el exterior/pirámide se puede ver sin ticket.',
  },
  { match: /disney/, tip: 'Tickets online con antelación; zonas de transporte amplias.' },
  { match: /tower of london/, tip: 'Entrada Tower of London: comprad online.' },
  { match: /london eye/, tip: 'London Eye: reserva franja si es temporada alta.' },
  { match: /westminster abbey/, tip: 'Westminster Abbey: entrada de pago, mejor online.' },
  {
    match: /british museum|national gallery|tate modern/,
    tip: 'Colección permanente suele ser gratuita; cola menor con franja.',
  },
  { match: /colosseo|coliseo|vatican|vaticani/, tip: 'Reserva con mucha antelación.' },
  { match: /prado|reina sofia|thyssen/, tip: 'Reserva entrada online.' },
  { match: /sagrada|alhambra|park guell|guell/, tip: 'Entrada con hora fija: comprad ya.' },
  { match: /bateaux|crucero/, tip: 'Crucero: comprad franja (atardecer/noche suele moler más).' },
]

const PASS_BY_CATS = new Set(['monument', 'viewpoint', 'museum', 'park', 'must_see', 'local'])

const MAPS_LINE_HINT = 'Tocá «Ver línea en Maps» para la línea exacta.'

function baseNotes(notes?: string): string {
  if (!notes) return ''
  return notes
    .replace(/\s*De pasada cerca:[^.]*\.?/gi, '')
    .replace(/\s*Reserva online[^.]*\.?/gi, '')
    .replace(/\s*Tickets online[^.]*\.?/gi, '')
    .replace(/\s*Entrada[^.]*online[^.]*\.?/gi, '')
    .replace(/\s*Colección permanente[^.]*\.?/gi, '')
    .replace(/\s*Si entráis[^.]*\.?/gi, '')
    .replace(/\s*Crucero:[^.]*\.?/gi, '')
    .replace(/\s*Westminster Abbey:[^.]*\.?/gi, '')
    .replace(/\s*London Eye:[^.]*\.?/gi, '')
    .replace(/\s*Tocá «Ver línea en Maps» para la línea exacta\.?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Ideas de la guía París aplicadas a cualquier ciudad:
 * - monumentos “de pasada” cerca de cada parada
 * - tips de reserva
 * - nota de arco del día (mañana → noche, vuelta hotel)
 */
export function enrichDayStops(
  stops: Stop[],
  wishlist: GeoPlace[],
  intensity: DayIntensity,
): { stops: Stop[]; dayNoteExtra: string } {
  const onRoute = new Set(stops.map((s) => s.placeId).filter(Boolean))
  const pool = wishlist.filter(
    (p) => !onRoute.has(p.id) && PASS_BY_CATS.has(p.category) && p.score >= 70,
  )

  const usedPassBy = new Set<string>()
  const enriched = stops.map((s) => {
    if (s.isHotel) return s
    const bits: string[] = []
    const core = baseNotes(s.notes)
    if (core) bits.push(core)

    const booking = BOOKING_HINTS.find((h) => h.match.test(norm(s.name)))
    if (booking) bits.push(booking.tip)

    const nearby = pool
      .filter((p) => !usedPassBy.has(p.id))
      .map((p) => ({ p, d: haversineKm(s.lat, s.lng, p.lat, p.lng) }))
      .filter((x) => x.d > 0.05 && x.d <= 0.45)
      .sort((a, b) => a.d - b.d || b.p.score - a.p.score)
      .slice(0, 3)

    if (nearby.length) {
      nearby.forEach((x) => usedPassBy.add(x.p.id))
      bits.push(`De pasada cerca: ${nearby.map((x) => x.p.name).join(' · ')}.`)
    }

    return bits.length ? { ...s, notes: bits.join(' ') } : { ...s, notes: undefined }
  })

  const withTransitCopy = enriched.map((s, i) => {
    const next = enriched[i + 1]
    if (!next || !s.transportReason) return s
    if (s.transitMode === 'metro' || s.transitMode === 'bus' || s.transitMode === 'train') {
      const reason = baseNotes(s.transportReason).replace(/\s*Tocá «Ver línea en Maps»[^.]*\.?/g, '').trim()
      // transportReason isn't notes — strip maps hint simply
      const clean = (s.transportReason || '').replace(/\s*Tocá «Ver línea en Maps» para la línea exacta\.?/g, '').trim()
      return {
        ...s,
        transportReason: `${clean || reason} ${MAPS_LINE_HINT}`.trim(),
      }
    }
    return s
  })

  const visits = withTransitCopy.filter((s) => !s.isHotel)
  const arc =
    visits.length >= 2
      ? `Arco del día: ${visits
          .slice(0, 4)
          .map((s) => s.name.replace(/\s*\(.*?\)\s*/g, '').slice(0, 28))
          .join(' → ')}${visits.length > 4 ? '…' : ''}.`
      : ''

  const hotelBack = intensity === 'departure' ? '' : ' Vuelta al hotel de noche (~22–00).'

  return {
    stops: withTransitCopy,
    dayNoteExtra: [arc, hotelBack].filter(Boolean).join(''),
  }
}
