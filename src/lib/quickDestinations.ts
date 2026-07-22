import { detectAreaScale, type AreaScale } from './tripScale'
import type { Mobility } from '../types'

export type QuickDestination = {
  label: string
  name: string
  displayName: string
  lat: number
  lng: number
  hint?: string
  /** Texto corto para la card en home */
  tagline?: string
  scale?: AreaScale
  mobility?: Mobility
  /** Gradiente CSS para cards visuales */
  accent: string
}

/** Destinos curados — home + wizard */
export const QUICK_DESTINATIONS: QuickDestination[] = [
  {
    label: 'Londres',
    name: 'Londres',
    displayName: 'London, England, United Kingdom',
    lat: 51.5074,
    lng: -0.1278,
    tagline: 'Metro y museos',
    scale: 'city',
    accent: 'linear-gradient(145deg, #1a3a52 0%, #2a8f7a 55%, #0b1f24 100%)',
  },
  {
    label: 'Núremberg',
    name: 'Núremberg',
    displayName: 'Nuremberg, Bavaria, Germany',
    lat: 49.4521,
    lng: 11.0767,
    hint: 'Navidad',
    tagline: 'Mercados y castillo',
    scale: 'city',
    accent: 'linear-gradient(145deg, #4a2020 0%, #c96f28 50%, #2a1a10 100%)',
  },
  {
    label: 'Japón',
    name: 'Japón',
    displayName: 'Japan',
    lat: 36.2048,
    lng: 138.2529,
    tagline: 'Tren y templos',
    scale: 'country',
    mobility: 'transit',
    accent: 'linear-gradient(145deg, #2c1054 0%, #b54a6a 45%, #1a0a20 100%)',
  },
  {
    label: 'Madrid',
    name: 'Madrid',
    displayName: 'Madrid, Comunidad de Madrid, España',
    lat: 40.4168,
    lng: -3.7038,
    tagline: 'Arte y tapas',
    scale: 'city',
    accent: 'linear-gradient(145deg, #8b4510 0%, #e08a3c 50%, #3a2010 100%)',
  },
  {
    label: 'Roma',
    name: 'Roma',
    displayName: 'Rome, Lazio, Italy',
    lat: 41.9028,
    lng: 12.4964,
    tagline: 'Historia a pie',
    scale: 'city',
    accent: 'linear-gradient(145deg, #5c3d1e 0%, #c9a227 48%, #2a1810 100%)',
  },
  {
    label: 'Dolomitas',
    name: 'Dolomitas',
    displayName: 'Dolomites, Italy',
    lat: 46.4102,
    lng: 11.844,
    hint: 'ruta furgoneta',
    tagline: 'Carretera y miradores',
    scale: 'region',
    mobility: 'drive',
    accent: 'linear-gradient(145deg, #3a5a7a 0%, #8ab4d4 55%, #1a2838 100%)',
  },
  {
    label: 'Suiza',
    name: 'Suiza',
    displayName: 'Switzerland',
    lat: 46.8182,
    lng: 8.2275,
    tagline: 'Lagos y trenes',
    scale: 'country',
    mobility: 'transit',
    accent: 'linear-gradient(145deg, #1a4a6a 0%, #4a9fd4 50%, #0a2030 100%)',
  },
  {
    label: 'Boston',
    name: 'Boston',
    displayName: 'Boston, Massachusetts, United States',
    lat: 42.3601,
    lng: -71.0589,
    tagline: 'Freedom Trail',
    scale: 'city',
    accent: 'linear-gradient(145deg, #1a3050 0%, #5a7a9a 55%, #0a1520 100%)',
  },
  {
    label: 'San Diego',
    name: 'San Diego',
    displayName: 'San Diego, California, United States',
    lat: 32.7157,
    lng: -117.1611,
    tagline: 'Costa y barrios',
    scale: 'city',
    accent: 'linear-gradient(145deg, #0a4a5a 0%, #2aafb8 50%, #062028 100%)',
  },
]

/** Destinos destacados en la home (scroll horizontal) */
export const FEATURED_DESTINATIONS = QUICK_DESTINATIONS.filter((d) =>
  ['Londres', 'Roma', 'Madrid', 'Núremberg', 'Japón'].includes(d.label),
)

export function buildQuickDestinationPatch(
  d: QuickDestination,
  currentMobility?: Mobility | null,
): {
  cityQuery: string
  cityPick: { name: string; displayName: string; lat: number; lng: number }
  hotelPick: null
  hotelSkipped: false
  hotelQuery: string
  airportPick: null
  areaScale: AreaScale
} {
  const scale =
    d.scale ??
    detectAreaScale(d.name, d.displayName, d.mobility ?? currentMobility ?? undefined)
  return {
    cityQuery: d.name,
    cityPick: {
      name: d.name,
      displayName: d.displayName,
      lat: d.lat,
      lng: d.lng,
    },
    hotelPick: null,
    hotelSkipped: false,
    hotelQuery: '',
    airportPick: null,
    areaScale: scale,
  }
}
