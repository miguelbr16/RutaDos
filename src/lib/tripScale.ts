import type { CityInfo, Mobility } from '../types'

export type AreaScale = 'city' | 'region' | 'country'

export type TripHub = {
  name: string
  lat: number
  lng: number
}

/** Hubs conocidos para rutas por región/país (furgoneta, trenes…). */
const KNOWN_HUBS: Record<string, { scale: AreaScale; hubs: TripHub[] }> = {
  londres: {
    scale: 'city',
    hubs: [
      { name: 'Westminster / centro', lat: 51.5074, lng: -0.1278 },
      { name: 'Greenwich', lat: 51.4826, lng: -0.0077 },
      { name: 'Richmond / Kew', lat: 51.4613, lng: -0.3037 },
      { name: 'Hampstead / norte', lat: 51.556, lng: -0.178 },
      { name: 'Canary Wharf / este', lat: 51.5054, lng: -0.0235 },
      { name: 'Wimbledon / sur', lat: 51.4214, lng: -0.2064 },
      { name: 'Windsor (cerca)', lat: 51.4839, lng: -0.6044 },
      { name: 'Cambridge (día)', lat: 52.2053, lng: 0.1218 },
    ],
  },
  london: {
    scale: 'city',
    hubs: [],
  },
  dolomitas: {
    scale: 'region',
    hubs: [
      { name: 'Cortina d’Ampezzo', lat: 46.5369, lng: 12.1353 },
      { name: 'Ortisei / St. Ulrich', lat: 46.5761, lng: 11.6722 },
      { name: 'Canazei', lat: 46.4747, lng: 11.7706 },
      { name: 'Bolzano', lat: 46.4983, lng: 11.3548 },
      { name: 'Arabba', lat: 46.496, lng: 11.875 },
      { name: 'San Martino di Castrozza', lat: 46.2617, lng: 11.8028 },
      { name: 'Alpe di Siusi', lat: 46.541, lng: 11.61 },
    ],
  },
  dolomites: {
    scale: 'region',
    hubs: [], // alias → dolomitas
  },
  suiza: {
    scale: 'country',
    hubs: [
      { name: 'Zúrich', lat: 47.3769, lng: 8.5417 },
      { name: 'Lucerna', lat: 47.0502, lng: 8.3093 },
      { name: 'Interlaken', lat: 46.6863, lng: 7.8632 },
      { name: 'Berna', lat: 46.948, lng: 7.4474 },
      { name: 'Ginebra', lat: 46.2044, lng: 6.1432 },
      { name: 'Zermatt', lat: 46.0207, lng: 7.7491 },
      { name: 'Lugano', lat: 46.0037, lng: 8.9511 },
    ],
  },
  switzerland: {
    scale: 'country',
    hubs: [],
  },
  japon: {
    scale: 'country',
    hubs: [
      { name: 'Tokio', lat: 35.6762, lng: 139.6503 },
      { name: 'Kioto', lat: 35.0116, lng: 135.7681 },
      { name: 'Osaka', lat: 34.6937, lng: 135.5023 },
      { name: 'Hiroshima', lat: 34.3853, lng: 132.4553 },
      { name: 'Nara', lat: 34.6851, lng: 135.8048 },
      { name: 'Hakone', lat: 35.2324, lng: 139.1069 },
    ],
  },
  japan: {
    scale: 'country',
    hubs: [],
  },
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function resolveKnown(name: string, displayName?: string) {
  const blob = norm(`${name} ${displayName ?? ''}`)
  for (const [key, val] of Object.entries(KNOWN_HUBS)) {
    if (!blob.includes(key)) continue
    if (key === 'dolomites') return KNOWN_HUBS.dolomitas
    if (key === 'switzerland') return KNOWN_HUBS.suiza
    if (key === 'japan') return KNOWN_HUBS.japon
    if (key === 'london') return KNOWN_HUBS.londres
    if (val.hubs.length) return val
  }
  return null
}

export function detectAreaScale(
  name: string,
  displayName?: string,
  mobility?: Mobility,
  nominatimType?: string,
): AreaScale {
  const known = resolveKnown(name, displayName)
  if (known) return known.scale

  const blob = norm(`${name} ${displayName ?? ''}`)
  if (
    nominatimType === 'country' ||
    /\bpais\b|\bcountry\b/.test(blob) ||
    blob.includes('japan') ||
    blob.includes('japon') ||
    blob.includes('switzerland') ||
    blob.includes('suiza')
  ) {
    return 'country'
  }
  if (
    nominatimType === 'state' ||
    mobility === 'drive' ||
    /dolomit|alpes|alps|region|valley|valle|toscana|tuscany|bavaria|baviera|andalucia|provence/.test(
      blob,
    )
  ) {
    return 'region'
  }
  return 'city'
}

export function hubsForDestination(
  name: string,
  displayName: string | undefined,
  city: CityInfo,
  scale: AreaScale,
  dayCount: number,
): TripHub[] {
  const known = resolveKnown(name, displayName)
  if (known?.hubs.length) {
    // Ciudad: casi todos los hubs (afueras incluidas). Región/país: crece con días.
    const minHubs = scale === 'city' ? 6 : scale === 'region' ? 5 : 4
    const n = Math.min(known.hubs.length, Math.max(minHubs, dayCount + 3))
    return known.hubs.slice(0, n)
  }

  // Sin hubs curados: mallamos el bbox / radio según escala
  const [s, w, n, e] = city.bbox
  if (scale === 'city') {
    // 8 puntos: centro + anillo (afueras / municipios limítrofes)
    const stepLat = Math.min(0.18, Math.max(0.1, (n - s) / 2.5 || 0.12))
    const stepLng = Math.min(0.18, Math.max(0.1, (e - w) / 2.5 || 0.12))
    return [
      { name: city.name, lat: city.lat, lng: city.lng },
      { name: 'Norte / afueras', lat: city.lat + stepLat, lng: city.lng },
      { name: 'Sur / afueras', lat: city.lat - stepLat, lng: city.lng },
      { name: 'Este / afueras', lat: city.lat, lng: city.lng + stepLng },
      { name: 'Oeste / afueras', lat: city.lat, lng: city.lng - stepLng },
      { name: 'NE', lat: city.lat + stepLat * 0.7, lng: city.lng + stepLng * 0.7 },
      { name: 'SO', lat: city.lat - stepLat * 0.7, lng: city.lng - stepLng * 0.7 },
      { name: 'SE', lat: city.lat - stepLat * 0.7, lng: city.lng + stepLng * 0.7 },
    ]
  }

  // region / country: rejilla sobre el bbox
  const rows = scale === 'country' ? 3 : 2
  const cols = scale === 'country' ? 3 : 2
  const hubs: TripHub[] = [{ name: city.name, lat: city.lat, lng: city.lng }]
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const lat = s + ((n - s) * (i + 0.5)) / rows
      const lng = w + ((e - w) * (j + 0.5)) / cols
      hubs.push({ name: `Zona ${i + 1}-${j + 1}`, lat, lng })
    }
  }
  return hubs.slice(0, Math.min(hubs.length, scale === 'country' ? 9 : 7))
}

/** Radio de búsqueda local en cada hub (metros). */
export function hubSearchRadiusM(scale: AreaScale): number {
  // Ciudad: afueras + pueblos colindantes (Gran Londres ~25–30 km)
  if (scale === 'city') return 28000
  if (scale === 'region') return 22000
  return 14000 // país: cada ciudad-hub con radio urbano amplio
}

export function bboxForScale(
  lat: number,
  lng: number,
  scale: AreaScale,
  dayCount: number,
): CityInfo['bbox'] {
  // Ciudad grande + afueras; región/país mucho más
  const base =
    scale === 'country' ? 1.8 : scale === 'region' ? 0.55 : 0.32
  const grow = scale === 'city' ? dayCount * 0.025 : dayCount * 0.04
  const d = Math.min(scale === 'country' ? 4 : scale === 'region' ? 1.2 : 0.45, base + grow)
  return [lat - d, lng - d, lat + d, lng + d]
}

export const AREA_SCALE_OPTIONS: Array<{
  value: AreaScale
  title: string
  desc: string
}> = [
  {
    value: 'city',
    title: 'Ciudad + afueras',
    desc: 'Centro, barrios, afueras y pueblos cercanos (Gran Londres…)',
  },
  {
    value: 'region',
    title: 'Región / pueblos',
    desc: 'Varias zonas en furgoneta o coche (Dolomitas, Alpes…)',
  },
  {
    value: 'country',
    title: 'País / ruta larga',
    desc: 'Varias ciudades del país (Suiza, Japón…)',
  },
]
