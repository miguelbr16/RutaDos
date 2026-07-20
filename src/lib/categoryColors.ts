import type { PlaceCategory } from '../types'

/** Colores de pines por tipo de sitio */
export const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  museum: '#3B6D9A',
  monument: '#8B5E3C',
  must_see: '#C45C26',
  viewpoint: '#2A9D8F',
  park: '#2D6A4F',
  food: '#E76F51',
  cafe: '#BC6C25',
  nightlife: '#6A4C93',
  show: '#9B5DE5',
  shopping: '#F4A261',
  market: '#E9C46A',
  hidden: '#457B9D',
  local: '#1D3557',
  custom: '#0B3D4A',
}

export function categoryColor(cat: PlaceCategory | undefined): string {
  return (cat && CATEGORY_COLORS[cat]) || CATEGORY_COLORS.custom
}
