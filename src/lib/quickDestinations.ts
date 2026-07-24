import { detectAreaScale, type AreaScale } from './tripScale'
import type { Mobility } from '../types'

/** Fotos Unsplash (licencia Unsplash — uso gratuito) */
export const HERO_PHOTO =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1920&q=80'

export type QuickDestination = {
  label: string
  name: string
  displayName: string
  lat: number
  lng: number
  hint?: string
  tagline?: string
  scale?: AreaScale
  mobility?: Mobility
  accent: string
  /** Imagen card (Unsplash) */
  photo: string
}

export const QUICK_DESTINATIONS: QuickDestination[] = [
  {
    label: 'Londres',
    name: 'Londres',
    displayName: 'London, England, United Kingdom',
    lat: 51.5074,
    lng: -0.1278,
    tagline: 'Metro y museos',
    scale: 'city',
    accent: 'linear-gradient(145deg, #1a3a52, #2a8f7a)',
    photo:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
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
    accent: 'linear-gradient(145deg, #4a2020, #c96f28)',
    photo:
      'https://images.unsplash.com/photo-1508086171957-7e2d64a75c6a?auto=format&fit=crop&w=800&q=80',
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
    accent: 'linear-gradient(145deg, #2c1054, #b54a6a)',
    photo:
      'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Madrid',
    name: 'Madrid',
    displayName: 'Madrid, Comunidad de Madrid, España',
    lat: 40.4168,
    lng: -3.7038,
    tagline: 'Arte y tapas',
    scale: 'city',
    accent: 'linear-gradient(145deg, #8b4510, #e08a3c)',
    photo:
      'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Roma',
    name: 'Roma',
    displayName: 'Rome, Lazio, Italy',
    lat: 41.9028,
    lng: 12.4964,
    tagline: 'Historia a pie',
    scale: 'city',
    accent: 'linear-gradient(145deg, #5c3d1e, #c9a227)',
    photo:
      'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
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
    accent: 'linear-gradient(145deg, #3a5a7a, #8ab4d4)',
    photo:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
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
    accent: 'linear-gradient(145deg, #1a4a6a, #4a9fd4)',
    photo:
      'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Boston',
    name: 'Boston',
    displayName: 'Boston, Massachusetts, United States',
    lat: 42.3601,
    lng: -71.0589,
    tagline: 'Freedom Trail',
    scale: 'city',
    accent: 'linear-gradient(145deg, #1a3050, #5a7a9a)',
    photo:
      'https://images.unsplash.com/photo-1560799260-b737af7dd0fc?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'San Diego',
    name: 'San Diego',
    displayName: 'San Diego, California, United States',
    lat: 32.7157,
    lng: -117.1611,
    tagline: 'Costa y barrios',
    scale: 'city',
    accent: 'linear-gradient(145deg, #0a4a5a, #2aafb8)',
    photo:
      'https://images.unsplash.com/photo-1754122978824-4b2fe8ebd5c7?auto=format&fit=crop&w=800&q=80',
  },
]

export const FEATURED_DESTINATIONS: QuickDestination[] = [
  QUICK_DESTINATIONS[0], // Londres
  QUICK_DESTINATIONS[4], // Roma
  QUICK_DESTINATIONS[3], // Madrid
  QUICK_DESTINATIONS[1], // Núremberg
  QUICK_DESTINATIONS[2], // Japón
].filter(Boolean)

export function photoForDestination(name: string): string | undefined {
  return QUICK_DESTINATIONS.find(
    (d) => d.name.toLowerCase() === name.toLowerCase() || d.label.toLowerCase() === name.toLowerCase(),
  )?.photo
}

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
