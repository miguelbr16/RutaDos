import type { RouteStyle, Trip } from '../types'

export type BudgetEstimate = {
  perPersonPerDayMin: number
  perPersonPerDayMax: number
  totalMin: number
  totalMax: number
  days: number
  nights: number
  currency: 'EUR'
  band: 'low' | 'mid' | 'high'
  blurb: string
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function cityBand(cityName: string, displayName?: string): 'low' | 'mid' | 'high' {
  const blob = norm(`${cityName} ${displayName ?? ''}`)

  // Destinos caros (comida + transporte + entradas de turista, sin hotel)
  if (
    /\b(londres|london|paris|parís|nueva york|new york|nyc|tokio|tokyo|osaka|zuerich|zurich|ginebra|geneva|oslo|bergen|reikiavik|reykjav|copenhague|copenhagen|estocolmo|stockholm|amsterdam|dubai|singapur|singapore|hong kong|suiza|swiss|switzerland|noruega|norway|islandia|iceland|dinamarca|denmark)\b/.test(
      blob,
    ) ||
    blob.includes('united kingdom') ||
    blob.includes('reino unido') ||
    blob.includes('england')
  ) {
    return 'high'
  }

  if (
    /\b(portugal|lisboa|lisbon|oporto|porto|budapest|praga|prague|polonia|warsaw|varsovia|cracovia|grecia|atenas|athens|turquia|turkey|istanbul|estambul|bulgaria|rumania|bucharest|belgrado|sarajevo|albania|marruecos|morocco|egipto|egypt|vietnam|tailandia|thailand|mexico|mexico city)\b/.test(
      blob,
    )
  ) {
    return 'low'
  }

  return 'mid'
}

/** €/persona/día: comida + transporte local + entradas. Sin hotel ni vuelos. */
const BANDS = {
  low: { food: [20, 40], transit: [4, 12], tickets: [8, 22] },
  mid: { food: [32, 60], transit: [8, 20], tickets: [15, 40] },
  // Londres / París / NY: más realista para turista (pub lunch → cena + Tube + museos)
  high: { food: [55, 100], transit: [14, 32], tickets: [28, 75] },
} as const

function foodMult(budget: RouteStyle['foodBudget']): number {
  if (budget === 'low') return 0.78
  if (budget === 'high') return 1.3
  return 1
}

function paceTicketMult(pace: RouteStyle['pace']): number {
  if (pace === 'relaxed') return 0.85
  if (pace === 'intense') return 1.35
  return 1
}

function paceTransitMult(pace: RouteStyle['pace']): number {
  if (pace === 'relaxed') return 0.9
  if (pace === 'intense') return 1.2
  return 1
}

/** Estimación orientativa €/persona (comida + transporte + entradas). Sin hotel. */
export function estimateTripBudget(input: {
  cityName: string
  displayName?: string
  startDate: string
  endDate: string
  foodBudget?: RouteStyle['foodBudget']
  pace?: RouteStyle['pace']
  dayCount?: number
}): BudgetEstimate {
  const start = new Date(input.startDate + 'T12:00:00')
  const end = new Date(input.endDate + 'T12:00:00')
  const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
  const days = input.dayCount ?? Math.max(1, nights + 1)
  const band = cityBand(input.cityName, input.displayName)
  const b = BANDS[band]
  const fm = foodMult(input.foodBudget ?? 'mid')
  const tm = paceTicketMult(input.pace ?? 'normal')
  const tr = paceTransitMult(input.pace ?? 'normal')

  const perMin = Math.round(b.food[0] * fm + b.transit[0] * tr + b.tickets[0] * tm)
  const perMax = Math.round(b.food[1] * fm + b.transit[1] * tr + b.tickets[1] * tm)

  const bandLabel =
    band === 'high' ? 'destino caro' : band === 'low' ? 'destino asequible' : 'rango medio'
  const paceLabel =
    input.pace === 'intense'
      ? 'ritmo intenso (más entradas/transporte)'
      : input.pace === 'relaxed'
        ? 'ritmo tranquilo'
        : 'ritmo normal'

  return {
    perPersonPerDayMin: perMin,
    perPersonPerDayMax: perMax,
    totalMin: perMin * days,
    totalMax: perMax * days,
    days,
    nights,
    currency: 'EUR',
    band,
    blurb: `Orientativo · ${bandLabel} · ${paceLabel} · comida + transporte + entradas · sin hotel ni vuelos.`,
  }
}

export function estimateFromTrip(trip: Trip): BudgetEstimate {
  return estimateTripBudget({
    cityName: trip.city.name,
    displayName: trip.city.displayName,
    startDate: trip.startDate,
    endDate: trip.endDate,
    foodBudget: trip.routeStyle.foodBudget,
    pace: trip.routeStyle.pace,
    dayCount: trip.days.length || undefined,
  })
}
