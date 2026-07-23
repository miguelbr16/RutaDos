import { searchDestinations, type PlaceSuggestion } from './geocode'

export type AirportOption = {
  name: string
  code?: string
  lat: number
  lng: number
  blurb?: string
}

const KNOWN: Record<string, AirportOption[]> = {
  londres: [
    { name: 'Heathrow', code: 'LHR', lat: 51.47, lng: -0.4543, blurb: 'Principal · Piccadilly / Elizabeth' },
    { name: 'Gatwick', code: 'LGW', lat: 51.1537, lng: -0.1821, blurb: 'Sur · tren Gatwick Express' },
    { name: 'Stansted', code: 'STN', lat: 51.886, lng: 0.2389, blurb: 'NE · Stansted Express' },
    { name: 'Luton', code: 'LTN', lat: 51.8747, lng: -0.3683, blurb: 'Norte · bus/tren a St Pancras' },
    { name: 'London City', code: 'LCY', lat: 51.5053, lng: 0.0553, blurb: 'Este · DLR' },
  ],
  madrid: [
    { name: 'Adolfo Suárez Madrid-Barajas', code: 'MAD', lat: 40.4983, lng: -3.5676, blurb: 'Metro L8 / Cercanías' },
  ],
  barcelona: [
    { name: 'El Prat', code: 'BCN', lat: 41.2971, lng: 2.0785, blurb: 'Aerobus / Renfe' },
  ],
  roma: [
    { name: 'Fiumicino', code: 'FCO', lat: 41.8003, lng: 12.2389, blurb: 'Leonardo Express' },
    { name: 'Ciampino', code: 'CIA', lat: 41.7994, lng: 12.5949, blurb: 'Buses al centro' },
  ],
  paris: [
    { name: 'Charles de Gaulle', code: 'CDG', lat: 49.0097, lng: 2.5479 },
    { name: 'Orly', code: 'ORY', lat: 48.7233, lng: 2.3794 },
  ],
  nuremberg: [
    { name: 'Nürnberg', code: 'NUE', lat: 49.4987, lng: 11.078, blurb: 'U2 al centro' },
  ],
  boston: [
    { name: 'Logan', code: 'BOS', lat: 42.3656, lng: -71.0096 },
  ],
  'san diego': [
    { name: 'San Diego Intl', code: 'SAN', lat: 32.7338, lng: -117.1933 },
  ],
  tokio: [
    { name: 'Narita', code: 'NRT', lat: 35.772, lng: 140.3929 },
    { name: 'Haneda', code: 'HND', lat: 35.5494, lng: 139.7798 },
  ],
  tokyo: [
    { name: 'Narita', code: 'NRT', lat: 35.772, lng: 140.3929 },
    { name: 'Haneda', code: 'HND', lat: 35.5494, lng: 139.7798 },
  ],
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function knownAirportsForCity(cityName: string, displayName?: string): AirportOption[] {
  const blob = norm(`${cityName} ${displayName ?? ''}`)
  for (const [key, list] of Object.entries(KNOWN)) {
    if (blob.includes(key)) return list
  }
  if (blob.includes('london') || blob.includes('londres') || blob.includes('greater london')) {
    return KNOWN.londres
  }
  if (blob.includes('nurem') || blob.includes('nuernberg')) return KNOWN.nuremberg
  if (blob.includes('rome')) return KNOWN.roma
  if (blob.includes('japon') || blob.includes('japan') || blob.includes('osaka')) {
    return [...KNOWN.tokio]
  }
  return []
}

/** Lista curada + búsqueda Nominatim de aeropuertos cerca del destino. */
export async function findAirportsForCity(
  cityName: string,
  displayName?: string,
  lat?: number,
  lng?: number,
): Promise<AirportOption[]> {
  const known = knownAirportsForCity(cityName, displayName)
  const seen = new Set(known.map((a) => a.code || a.name.toLowerCase()))
  const nearKey = (la: number, ln: number) => `${la.toFixed(3)},${ln.toFixed(3)}`
  const seenNear = new Set(known.map((a) => nearKey(a.lat, a.lng)))

  try {
    const q = `airport ${cityName}`
    const hits: PlaceSuggestion[] = await searchDestinations(q, 10)
    for (const h of hits) {
      const blob = norm(h.label + h.shortName)
      if (!blob.includes('airport') && !blob.includes('aeropuerto') && !blob.includes('aeroport')) {
        continue
      }
      if (lat != null && lng != null) {
        const dlat = Math.abs(h.lat - lat)
        const dlng = Math.abs(h.lng - lng)
        if (dlat > 1.2 || dlng > 1.2) continue
      }
      const nameKey = h.shortName.toLowerCase()
      const geo = nearKey(h.lat, h.lng)
      if (seen.has(nameKey) || seenNear.has(geo)) continue
      // Evitar duplicar un aeropuerto curado (mismo sitio, otro nombre)
      const overlapsKnown = known.some(
        (a) => Math.abs(a.lat - h.lat) < 0.08 && Math.abs(a.lng - h.lng) < 0.08,
      )
      if (overlapsKnown) continue
      seen.add(nameKey)
      seenNear.add(geo)
      known.push({ name: h.shortName, lat: h.lat, lng: h.lng, blurb: h.kind })
    }
  } catch {
    /* keep known only */
  }

  return known
}
