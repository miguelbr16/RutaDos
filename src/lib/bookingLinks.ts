/** Enlaces útiles para reservar / web / alojamiento (sin APIs de pago). */

/** Parámetros de afiliado Booking — activar solo tras aprobación (VITE_BOOKING_AID). */
function bookingAffiliateParams(): URLSearchParams {
  const params = new URLSearchParams()
  const aid = import.meta.env.VITE_BOOKING_AID as string | undefined
  if (aid?.trim()) {
    params.set('aid', aid.trim())
    params.set('label', 'rutados')
  }
  return params
}

function appendBookingParams(u: URL): string {
  for (const [k, v] of bookingAffiliateParams()) {
    u.searchParams.set(k, v)
  }
  return u.toString()
}

export function normalizeWebsite(raw?: string | null): string | undefined {
  if (!raw) return undefined
  const t = raw.trim()
  if (!t) return undefined
  if (/^https?:\/\//i.test(t)) return t
  if (/^www\./i.test(t)) return `https://${t}`
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(t)) return `https://${t}`
  return undefined
}

export function extractOsmWebsite(tags: Record<string, string | undefined>): string | undefined {
  return normalizeWebsite(
    tags.website || tags['contact:website'] || tags.url || tags['contact:url'],
  )
}

export function extractOsmPhone(tags: Record<string, string | undefined>): string | undefined {
  const p = (tags.phone || tags['contact:phone'] || tags['contact:mobile'] || '').trim()
  return p || undefined
}

/** ¿La web parece un canal de reserva online? */
export function looksLikeBookingSite(url: string): boolean {
  return /thefork|eltenedor|opentable|resy|sevenrooms|covermanager|quandoo|yelp\.|bookatable|tablecheck|tock\.com|exploretock|bookings?\./i.test(
    url,
  )
}

export function googleMapsPlaceUrl(lat: number, lng: number, name?: string): string {
  if (name?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${name} @${lat},${lng}`,
    )}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

/** Reserva: web oficial si es booking, si no Google “reservar mesa…”. */
export function restaurantReserveUrl(opts: {
  name: string
  lat: number
  lng: number
  website?: string | null
  city?: string
}): string {
  const web = normalizeWebsite(opts.website)
  if (web && looksLikeBookingSite(web)) return web
  const q = `reservar mesa ${opts.name}${opts.city ? ` ${opts.city}` : ''}`
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}

/** Web del sitio, o Maps si no hay. */
export function restaurantWebUrl(opts: {
  name: string
  lat: number
  lng: number
  website?: string | null
}): string {
  return normalizeWebsite(opts.website) ?? googleMapsPlaceUrl(opts.lat, opts.lng, opts.name)
}

/** Booking.com búsqueda por nombre + ciudad (afiliado futuro: añadir aid=). */
export function hotelBookingUrl(opts: {
  name: string
  city?: string
  lat?: number
  lng?: number
}): string {
  const ss = [opts.name, opts.city].filter(Boolean).join(' ').trim() || opts.name
  const u = new URL('https://www.booking.com/searchresults.html')
  u.searchParams.set('ss', ss)
  if (opts.lat != null && opts.lng != null) {
    u.searchParams.set('latitude', String(opts.lat))
    u.searchParams.set('longitude', String(opts.lng))
  }
  return appendBookingParams(u)
}

/** Buscar hoteles en la ciudad (con fechas del viaje si las hay). */
export function hotelCitySearchUrl(opts: {
  city: string
  lat?: number
  lng?: number
  checkin?: string
  checkout?: string
}): string {
  const u = new URL('https://www.booking.com/searchresults.html')
  u.searchParams.set('ss', opts.city)
  if (opts.lat != null && opts.lng != null) {
    u.searchParams.set('latitude', String(opts.lat))
    u.searchParams.set('longitude', String(opts.lng))
  }
  if (opts.checkin) u.searchParams.set('checkin', opts.checkin)
  if (opts.checkout) u.searchParams.set('checkout', opts.checkout)
  u.searchParams.set('group_adults', '2')
  u.searchParams.set('no_rooms', '1')
  return appendBookingParams(u)
}

/** Google Hotels / Maps hoteles cerca. */
export function hotelMapsSearchUrl(opts: { city: string; lat?: number; lng?: number }): string {
  if (opts.lat != null && opts.lng != null) {
    return `https://www.google.com/maps/search/hotels/@${opts.lat},${opts.lng},14z`
  }
  return `https://www.google.com/maps/search/${encodeURIComponent(`hoteles ${opts.city}`)}`
}

export function hotelWebUrl(opts: {
  name: string
  lat: number
  lng: number
  website?: string | null
  city?: string
}): string {
  return normalizeWebsite(opts.website) ?? hotelBookingUrl(opts)
}

/** Entradas / visita: web oficial o búsqueda de tickets. */
export function attractionTicketsUrl(opts: {
  name: string
  lat: number
  lng: number
  website?: string | null
  city?: string
}): string {
  const web = normalizeWebsite(opts.website)
  if (web) return web
  const q = `entradas ${opts.name}${opts.city ? ` ${opts.city}` : ''}`
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}

/** Acciones rápidas según tipo de parada. */
export function placeQuickLinks(opts: {
  name: string
  lat: number
  lng: number
  category?: string
  listingKind?: string
  website?: string | null
  isHotel?: boolean
  city?: string
}): Array<{ label: string; href: string; primary?: boolean }> {
  const maps = googleMapsPlaceUrl(opts.lat, opts.lng, opts.name)
  if (opts.isHotel || opts.listingKind === 'hotel') {
    return [
      { label: 'Booking', href: hotelBookingUrl(opts), primary: true },
      { label: 'Maps', href: maps },
    ]
  }
  if (
    opts.category === 'food' ||
    opts.category === 'cafe' ||
    opts.listingKind === 'restaurant'
  ) {
    return [
      {
        label: 'Reservar',
        href: restaurantReserveUrl(opts),
        primary: true,
      },
      { label: opts.website ? 'Web' : 'Maps', href: restaurantWebUrl(opts) },
    ]
  }
  if (
    opts.category === 'museum' ||
    opts.category === 'monument' ||
    opts.category === 'must_see' ||
    opts.category === 'show' ||
    opts.category === 'viewpoint'
  ) {
    return [
      {
        label: opts.website ? 'Web / entradas' : 'Entradas',
        href: attractionTicketsUrl(opts),
        primary: true,
      },
      { label: 'Maps', href: maps },
    ]
  }
  return [
    { label: 'Maps', href: maps, primary: true },
    ...(opts.website
      ? [{ label: 'Web', href: restaurantWebUrl(opts) }]
      : []),
  ]
}

export type VenueKind = 'restaurant' | 'hotel' | 'cafe'

export type VenueLinkSet = {
  maps: string
  web: string
  reserveOrBook: string
  reserveLabel: string
  phone?: string
  hasOfficialWeb: boolean
}

export function venueLinks(
  kind: VenueKind,
  opts: {
    name: string
    lat: number
    lng: number
    website?: string | null
    phone?: string | null
    city?: string
  },
): VenueLinkSet {
  const hasOfficialWeb = !!normalizeWebsite(opts.website)
  if (kind === 'hotel') {
    return {
      maps: googleMapsPlaceUrl(opts.lat, opts.lng, opts.name),
      web: hotelWebUrl(opts),
      reserveOrBook: hotelBookingUrl(opts),
      reserveLabel: 'Booking',
      phone: opts.phone || undefined,
      hasOfficialWeb,
    }
  }
  // restaurant + cafe
  return {
    maps: googleMapsPlaceUrl(opts.lat, opts.lng, opts.name),
    web: restaurantWebUrl(opts),
    reserveOrBook: restaurantReserveUrl(opts),
    reserveLabel: kind === 'cafe' ? 'Maps' : 'Reservar',
    phone: opts.phone || undefined,
    hasOfficialWeb,
  }
}
