import type {
  ExploreMode,
  GeoPlace,
  PlaceCategory,
  Preferences,
  RouteStyle,
} from '../types'

/** ¿Este tipo de sitio encaja con los gustos marcados? */
export function isCategoryWanted(category: PlaceCategory, prefs: Preferences): boolean {
  switch (category) {
    case 'museum':
      return prefs.museums
    case 'monument':
    case 'must_see':
      return prefs.monuments || prefs.architecture || prefs.hidden
    case 'viewpoint':
      return prefs.viewpoints || prefs.night_walks
    case 'park':
      return prefs.parks
    case 'food':
      return prefs.restaurants || prefs.street_food || prefs.markets
    case 'cafe':
      return prefs.cafes
    case 'nightlife':
      return prefs.nightlife
    case 'hidden':
      return prefs.hidden
    case 'local':
      return prefs.neighborhoods || prefs.hidden
    case 'shopping':
      return prefs.shopping
    case 'market':
      return prefs.markets
    case 'show':
      return prefs.shows
    case 'custom':
      return true
    default:
      return true
  }
}

export function placeAllowedByPrefs(place: GeoPlace, prefs: Preferences): boolean {
  if (place.tier === 'must' || place.tags?.includes('must_visit')) return true
  if (place.reaction === 'dislike') return false
  return isCategoryWanted(place.category, prefs)
}

/** Peso por estilo explore (iconos / mixto / local) + gustos marcados. */
export function exploreScore(place: GeoPlace, explore: ExploreMode, prefs?: Preferences): number {
  let s = place.score
  if (explore === 'icons') {
    if (place.tier === 'must') s += 45
    else if (place.tier === 'recommended') s += 18
    if (place.category === 'hidden' || place.category === 'local') s -= 25
    if (place.source === 'osm' && place.tier === 'optional') s -= 10
  } else if (explore === 'local') {
    if (place.category === 'hidden' || place.category === 'local') s += 40
    if (place.tags?.some((t) => /local|hidden|neighbour|barrio/i.test(t))) s += 15
    if (place.tier === 'must') s += 5 // siguen entrando, sin monopolizar
    if (place.category === 'must_see' && place.tier === 'recommended') s -= 8
  } else {
    // mixed: ligero boost a lo bien puntuado sin matar lo local
    if (place.tier === 'must') s += 20
    if (place.category === 'hidden' || place.category === 'local') s += 12
  }

  if (prefs) {
    if (prefs.museums && place.category === 'museum') s += 22
    if (prefs.monuments && (place.category === 'monument' || place.category === 'must_see')) s += 18
    if (prefs.architecture && place.category === 'monument') s += 10
    if (prefs.viewpoints && place.category === 'viewpoint') s += 20
    if (prefs.parks && place.category === 'park') s += 16
    if (prefs.hidden && (place.category === 'hidden' || place.category === 'local')) s += 18
    if (prefs.neighborhoods && place.category === 'local') s += 14
    if (prefs.shows && place.category === 'show') s += 16
    if (prefs.shopping && place.category === 'shopping') s += 12
    if (prefs.markets && place.category === 'market') s += 14
    if (prefs.nightlife && place.category === 'nightlife') s += 20
  }

  return s
}

function isStreetFoodish(p: GeoPlace): boolean {
  if (p.tags?.some((t) => /street|fast_food|food_court|takeaway|tapas/i.test(t))) return true
  const n = p.name.toLowerCase()
  return /street|food truck|kebab|taco|burger|pizza al corte|churro|helader/i.test(n)
}

/** Comida filtrada por gustos + presupuesto. */
export function filterFoodPlaces(
  places: GeoPlace[],
  prefs: Preferences,
  foodBudget: RouteStyle['foodBudget'],
): GeoPlace[] {
  return places
    .filter((p) => p.category === 'food' || p.category === 'cafe' || p.category === 'market')
    .filter((p) => placeAllowedByPrefs(p, prefs))
    .filter((p) => {
      if (p.category === 'cafe') return prefs.cafes
      if (p.category === 'market') return prefs.markets || prefs.street_food
      // food
      if (!prefs.restaurants && !prefs.street_food && !prefs.markets) return false
      if (foodBudget === 'low') {
        // prioriza street / markets; deja restaurantes si no hay alternativa
        return true
      }
      if (foodBudget === 'high' && isStreetFoodish(p) && prefs.restaurants) {
        // en presupuesto alto, street food solo si no hay restaurantes en pool
        return false
      }
      return true
    })
    .map((p) => {
      let score = p.score
      if (foodBudget === 'low' && (isStreetFoodish(p) || p.category === 'market')) score += 25
      if (foodBudget === 'high' && p.category === 'food' && !isStreetFoodish(p)) score += 20
      if (prefs.street_food && isStreetFoodish(p)) score += 30
      if (!prefs.restaurants && prefs.street_food && !isStreetFoodish(p) && p.category === 'food') {
        score -= 40
      }
      return { ...p, score }
    })
    .sort((a, b) => b.score - a.score)
}

/** Sightseeing filtrado y ordenado por gustos + explore. */
export function filterSightPlaces(
  places: GeoPlace[],
  prefs: Preferences,
  explore: ExploreMode,
): GeoPlace[] {
  return places
    .filter((p) => p.category !== 'food' && p.category !== 'cafe' && p.category !== 'nightlife')
    .filter((p) => placeAllowedByPrefs(p, prefs))
    .map((p) => ({ ...p, score: exploreScore(p, explore, prefs) }))
    .sort((a, b) => b.score - a.score)
}

export function filterNightlife(places: GeoPlace[], prefs: Preferences): GeoPlace[] {
  if (!prefs.nightlife) return []
  return places.filter((p) => p.category === 'nightlife').sort((a, b) => b.score - a.score)
}

export function prefsSummaryLine(prefs: Preferences, style: RouteStyle): string {
  const on = (Object.keys(prefs) as (keyof Preferences)[])
    .filter((k) => prefs[k])
    .slice(0, 6)
  const pace =
    style.pace === 'relaxed' ? 'ritmo tranquilo' : style.pace === 'intense' ? 'ritmo intenso' : 'ritmo normal'
  const food =
    style.foodBudget === 'low'
      ? 'comida económica'
      : style.foodBudget === 'high'
        ? 'comida especial'
        : 'comida media'
  const explore =
    style.explore === 'icons' ? 'iconos' : style.explore === 'local' ? 'local / barrios' : 'mixto'
  return `${pace} · ${food} · explorar ${explore}${on.length ? ` · gustos: ${on.join(', ')}` : ''}`
}
