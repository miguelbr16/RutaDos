/** Enlaces útiles para reservar / web / alojamiento (sin APIs de pago). */

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
  return u.toString()
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
