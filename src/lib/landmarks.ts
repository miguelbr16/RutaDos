import { uid } from './id'
import type { GeoPlace } from '../types'

type Landmark = {
  name: string
  lat: number
  lng: number
  category: GeoPlace['category']
  bestSlot?: GeoPlace['bestSlot']
}

const LONDON: Landmark[] = [
  { name: 'Big Ben / Elizabeth Tower', lat: 51.5007, lng: -0.1246, category: 'monument', bestSlot: 'afternoon' },
  { name: 'Houses of Parliament', lat: 51.4994, lng: -0.1245, category: 'monument', bestSlot: 'afternoon' },
  { name: 'London Eye', lat: 51.5033, lng: -0.1195, category: 'viewpoint', bestSlot: 'evening' },
  { name: 'Tower Bridge', lat: 51.5055, lng: -0.0754, category: 'monument', bestSlot: 'afternoon' },
  { name: 'Tower of London', lat: 51.5081, lng: -0.0759, category: 'monument', bestSlot: 'morning' },
  { name: 'Buckingham Palace', lat: 51.5014, lng: -0.1419, category: 'monument', bestSlot: 'morning' },
  { name: 'Trafalgar Square', lat: 51.508, lng: -0.1281, category: 'monument', bestSlot: 'afternoon' },
  { name: 'British Museum', lat: 51.5194, lng: -0.127, category: 'museum', bestSlot: 'morning' },
  { name: 'National Gallery', lat: 51.5089, lng: -0.1283, category: 'museum', bestSlot: 'afternoon' },
  { name: 'St Paul’s Cathedral', lat: 51.5138, lng: -0.0984, category: 'monument', bestSlot: 'morning' },
  { name: 'Millennium Bridge', lat: 51.5095, lng: -0.0985, category: 'monument', bestSlot: 'afternoon' },
  { name: 'Tate Modern', lat: 51.5076, lng: -0.0994, category: 'museum', bestSlot: 'afternoon' },
  { name: 'Borough Market', lat: 51.5055, lng: -0.091, category: 'market', bestSlot: 'lunch' },
  { name: 'Covent Garden', lat: 51.5117, lng: -0.1234, category: 'local', bestSlot: 'afternoon' },
  { name: 'Camden Market', lat: 51.5416, lng: -0.146, category: 'market', bestSlot: 'afternoon' },
  { name: 'Notting Hill / Portobello', lat: 51.5152, lng: -0.206, category: 'local', bestSlot: 'afternoon' },
  { name: 'Hyde Park', lat: 51.5073, lng: -0.1657, category: 'park', bestSlot: 'afternoon' },
  { name: 'Greenwich Park / Observatory', lat: 51.4769, lng: -0.0005, category: 'viewpoint', bestSlot: 'afternoon' },
  { name: 'Shakespeare’s Globe', lat: 51.5081, lng: -0.0972, category: 'show', bestSlot: 'evening' },
  { name: 'Westminster Abbey', lat: 51.4993, lng: -0.1273, category: 'monument', bestSlot: 'morning' },
]

const PARIS: Landmark[] = [
  { name: 'Torre Eiffel', lat: 48.8584, lng: 2.2945, category: 'monument', bestSlot: 'evening' },
  { name: 'Louvre', lat: 48.8606, lng: 2.3376, category: 'museum', bestSlot: 'morning' },
  { name: 'Notre-Dame', lat: 48.853, lng: 2.3499, category: 'monument', bestSlot: 'morning' },
  { name: 'Sacré-Cœur', lat: 48.8867, lng: 2.3431, category: 'monument', bestSlot: 'afternoon' },
  { name: 'Arco del Triunfo', lat: 48.8738, lng: 2.295, category: 'monument', bestSlot: 'morning' },
  { name: 'Ópera Garnier', lat: 48.8719, lng: 2.3316, category: 'monument', bestSlot: 'morning' },
  { name: 'Sainte-Chapelle', lat: 48.8554, lng: 2.345, category: 'monument', bestSlot: 'morning' },
  { name: 'Hôtel des Inválidos', lat: 48.855, lng: 2.3125, category: 'monument', bestSlot: 'afternoon' },
  { name: 'Pont Alexandre III', lat: 48.8638, lng: 2.3135, category: 'monument', bestSlot: 'afternoon' },
  { name: 'Palais Royal', lat: 48.8636, lng: 2.337, category: 'monument', bestSlot: 'morning' },
  { name: 'Galerie Vivienne', lat: 48.8664, lng: 2.3397, category: 'monument', bestSlot: 'morning' },
  { name: 'Jardín de Luxemburgo', lat: 48.8462, lng: 2.3372, category: 'park', bestSlot: 'afternoon' },
  { name: 'Panteón de París', lat: 48.8462, lng: 2.3461, category: 'monument', bestSlot: 'afternoon' },
  { name: 'Place des Vosges', lat: 48.8556, lng: 2.3655, category: 'monument', bestSlot: 'evening' },
  { name: 'Plaza de la Concordia', lat: 48.8656, lng: 2.3212, category: 'monument', bestSlot: 'afternoon' },
  { name: 'Galeries Lafayette', lat: 48.8738, lng: 2.3322, category: 'shopping', bestSlot: 'morning' },
  { name: 'Disneyland París', lat: 48.8674, lng: 2.7834, category: 'show', bestSlot: 'morning' },
  { name: 'Musée d’Orsay', lat: 48.86, lng: 2.3266, category: 'museum', bestSlot: 'morning' },
  { name: 'Centre Pompidou', lat: 48.8606, lng: 2.3522, category: 'museum', bestSlot: 'afternoon' },
  { name: 'Montmartre / Place du Tertre', lat: 48.8864, lng: 2.3408, category: 'local', bestSlot: 'afternoon' },
]

function normKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function landmarksForDestination(cityName: string, displayName?: string): GeoPlace[] {
  const blob = normKey(`${cityName} ${displayName ?? ''}`)
  let list: Landmark[] = []
  if (blob.includes('londres') || blob.includes('london')) list = LONDON
  else if (blob.includes('paris') || blob.includes('parís')) list = PARIS

  return list.map((l) => ({
    id: uid('place'),
    name: l.name,
    lat: l.lat,
    lng: l.lng,
    category: l.category,
    tier: 'must' as const,
    source: 'osm' as const,
    score: 98,
    tags: ['landmark', 'icon'],
    bestSlot: l.bestSlot ?? 'afternoon',
    notes: 'Icono imprescindible',
  }))
}

/** Une landmarks con el pool descubierto (sin duplicar por nombre aproximado). */
export function mergeLandmarks(discovered: GeoPlace[], landmarks: GeoPlace[]): GeoPlace[] {
  if (!landmarks.length) return discovered
  const seen = new Set(discovered.map((p) => normKey(p.name).slice(0, 18)))
  const extra: GeoPlace[] = []
  for (const l of landmarks) {
    const key = normKey(l.name).slice(0, 18)
    const overlap = [...seen].some((s) => s.includes(key.slice(0, 10)) || key.includes(s.slice(0, 10)))
    if (overlap) continue
    seen.add(key)
    extra.push(l)
  }
  return [...extra, ...discovered]
}
