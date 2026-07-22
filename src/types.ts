export type PreferenceKey =
  | 'restaurants'
  | 'cafes'
  | 'museums'
  | 'monuments'
  | 'viewpoints'
  | 'nightlife'
  | 'hidden'
  | 'parks'
  | 'shopping'
  | 'markets'
  | 'street_food'
  | 'architecture'
  | 'shows'
  | 'neighborhoods'
  | 'night_walks'

export type PlaceCategory =
  | 'must_see'
  | 'museum'
  | 'monument'
  | 'viewpoint'
  | 'park'
  | 'food'
  | 'cafe'
  | 'nightlife'
  | 'hidden'
  | 'local'
  | 'custom'
  | 'shopping'
  | 'market'
  | 'show'

export interface Preferences {
  restaurants: boolean
  cafes: boolean
  museums: boolean
  monuments: boolean
  viewpoints: boolean
  nightlife: boolean
  hidden: boolean
  parks: boolean
  shopping: boolean
  markets: boolean
  street_food: boolean
  architecture: boolean
  shows: boolean
  neighborhoods: boolean
  night_walks: boolean
}

export type Pace = 'relaxed' | 'normal' | 'intense'
export type ExploreMode = 'icons' | 'mixed' | 'local'
export type Mobility = 'walk' | 'mixed' | 'transit' | 'drive'
export type TransportHint = 'walk' | 'transit' | 'drive'
/** Modo concreto del tramo (elegible por el usuario) */
export type TransitMode = 'walk' | 'metro' | 'bus' | 'train' | 'taxi' | 'drive'
export type TimeSlot = 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night'
export type DayIntensity = 'arrival' | 'full' | 'departure' | 'light'
/** Alcance geográfico del viaje */
export type AreaScale = 'city' | 'region' | 'country'
/** Enfoque del día: centro, mixto o afueras */
export type DayFocus = 'central' | 'mixed' | 'outskirts'

export interface RouteStyle {
  pace: Pace
  explore: ExploreMode
  mobility: Mobility
  detours: boolean
  detourMinutes: number
  foodBudget: 'low' | 'mid' | 'high'
  preferScenicWalks: boolean
  /** Preferir centro urbano en el plan sugerido (afueras quedan en wishlist / plan propio) */
  preferCentral: boolean
}

export interface HotelInfo {
  name: string
  query: string
  lat: number
  lng: number
}

export interface TripLogistics {
  arrivalTime: string // HH:mm on startDate
  departureTime: string // HH:mm on endDate
  hotel: HotelInfo | null
  airport: {
    name: string
    code?: string
    lat: number
    lng: number
  } | null
  /** Usuario pulsó «Seguir sin hotel» en el wizard */
  hotelSkipped?: boolean
}

export interface GeoPlace {
  id: string
  name: string
  lat: number
  lng: number
  category: PlaceCategory
  tier: 'must' | 'recommended' | 'optional'
  source: 'osm' | 'manual'
  notes?: string
  tags?: string[]
  score: number
  /** Preferred part of day for this kind of place */
  bestSlot?: TimeSlot
  photoUrl?: string
  /** Partner listing (future marketplace) */
  partnerId?: string
  sponsored?: boolean
  listingKind?: 'hotel' | 'restaurant' | 'experience' | 'agency'
  /** Sitio pospuesto desde otro día (prioridad en sugerencias) */
  deferred?: boolean
  reaction?: 'like' | 'dislike'
  /** Web / contacto OSM (si existe) */
  website?: string
  phone?: string
}

export interface Stop {
  id: string
  placeId: string
  name: string
  lat: number
  lng: number
  category: PlaceCategory
  notes?: string
  /** Notas de la pareja (reservas, tips propios) */
  userNotes?: string
  order: number
  slot?: TimeSlot
  suggestedTime?: string // HH:mm
  transportToNext?: TransportHint
  /** Modo elegido (metro/bus/tren/taxi/andar…) */
  transitMode?: TransitMode
  minutesToNext?: number
  transportReason?: string
  /** Parada hotel (inicio/fin del día) */
  isHotel?: boolean
  /** Check-in en ruta */
  visitStatus?: 'pending' | 'done' | 'skipped'
  /** Reacción compartida de la pareja */
  reaction?: 'like' | 'dislike'
  /** OSM opening_hours crudo */
  openingHours?: string
  photoUrl?: string
  /** Hasta ~3 thumbs (mapa / detalle) */
  photoUrls?: string[]
  partnerId?: string
  sponsored?: boolean
  listingKind?: 'hotel' | 'restaurant' | 'experience' | 'agency'
  website?: string
  phone?: string
}

export interface DayPlan {
  id: string
  date: string
  label: string
  intensity: DayIntensity
  note?: string
  stops: Stop[]
  /** Enfoque geográfico del día */
  focus?: DayFocus
  /** Sugerido por la app o armado a mano */
  planSource?: 'suggested' | 'custom'
}

export interface CityInfo {
  name: string
  displayName: string
  lat: number
  lng: number
  bbox: [number, number, number, number]
  /** Ciudad vs región (Dolomitas) vs país (Suiza) */
  scale?: AreaScale
}

export interface Trip {
  id: string
  title: string
  city: CityInfo
  startDate: string
  endDate: string
  preferences: Preferences
  routeStyle: RouteStyle
  logistics: TripLogistics
  places: GeoPlace[]
  days: DayPlan[]
  createdAt: string
  updatedAt: string
  /** Viaje recomendado / alojado por un partner (hotel, agencia) */
  hostedByPartnerId?: string
}

export const DEFAULT_PREFERENCES: Preferences = {
  restaurants: true,
  cafes: true,
  museums: true,
  monuments: true,
  viewpoints: true,
  nightlife: false,
  hidden: true,
  parks: true,
  shopping: false,
  markets: true,
  street_food: false,
  architecture: true,
  shows: false,
  neighborhoods: true,
  night_walks: true,
}

/** Wizard en blanco: nada marcado hasta que elijáis. */
export const EMPTY_PREFERENCES: Preferences = {
  restaurants: false,
  cafes: false,
  museums: false,
  monuments: false,
  viewpoints: false,
  nightlife: false,
  hidden: false,
  parks: false,
  shopping: false,
  markets: false,
  street_food: false,
  architecture: false,
  shows: false,
  neighborhoods: false,
  night_walks: false,
}

export const DEFAULT_ROUTE_STYLE: RouteStyle = {
  pace: 'normal',
  explore: 'mixed',
  mobility: 'mixed',
  detours: true,
  detourMinutes: 30,
  foodBudget: 'mid',
  preferScenicWalks: true,
  preferCentral: true,
}

export const DEFAULT_LOGISTICS: TripLogistics = {
  arrivalTime: '15:00',
  departureTime: '18:00',
  hotel: null,
  airport: null,
}

export const PREFERENCE_LABELS: Record<PreferenceKey, string> = {
  restaurants: 'Restaurantes',
  cafes: 'Cafés',
  museums: 'Museos',
  monuments: 'Monumentos',
  viewpoints: 'Miradores',
  nightlife: 'Vida nocturna',
  hidden: 'Joyas ocultas',
  parks: 'Parques y paseos',
  shopping: 'Compras',
  markets: 'Mercados',
  street_food: 'Street food',
  architecture: 'Arquitectura',
  shows: 'Teatro / espectáculos',
  neighborhoods: 'Barrios para callejear',
  night_walks: 'Paseos y vistas de noche',
}

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  must_see: 'Imprescindible',
  museum: 'Museo',
  monument: 'Monumento',
  viewpoint: 'Mirador',
  park: 'Parque',
  food: 'Comer',
  cafe: 'Café',
  nightlife: 'Noche',
  hidden: 'Secreto',
  local: 'Local',
  custom: 'Vuestro',
  shopping: 'Compras',
  market: 'Mercado',
  show: 'Espectáculo',
}

export const SLOT_LABELS: Record<TimeSlot, string> = {
  morning: 'Mañana',
  lunch: 'Comida',
  afternoon: 'Tarde',
  evening: 'Atardecer / cena',
  night: 'Noche',
}

export const TRANSPORT_LABELS: Record<TransportHint, string> = {
  walk: 'A pie',
  transit: 'Transporte público',
  drive: 'Taxi / coche',
}

export const TRANSIT_MODE_LABELS: Record<TransitMode, string> = {
  walk: 'Andando',
  metro: 'Metro / Tube',
  bus: 'Bus',
  train: 'Tren',
  taxi: 'Taxi',
  drive: 'Coche',
}

export const DAY_FOCUS_LABELS: Record<DayFocus, string> = {
  central: 'Solo centro',
  mixed: 'Centro + algo de afueras',
  outskirts: 'Afueras / cerca',
}
