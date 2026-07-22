import type { DayPlan, Stop, TransitMode, Trip } from '../types'
import {
  googleMapsDirectionsUrl,
  googleMapsPlaceUrl,
  googleMapsTransitLegUrl,
  travelModeForTransit,
} from './mapsUrl'
import { CATEGORY_LABELS, TRANSIT_MODE_LABELS } from '../types'

export type CopilotMsg = {
  id: string
  role: 'user' | 'assistant'
  text: string
  mapsUrl?: string
  at: string
}

export type CopilotHere = { lat: number; lng: number }

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function pickActiveDay(trip: Trip, dayId?: string): DayPlan | null {
  if (dayId) return trip.days.find((d) => d.id === dayId) ?? null
  const today = todayISO()
  return trip.days.find((d) => d.date === today) ?? trip.days[0] ?? null
}

function visitStops(day: DayPlan): Stop[] {
  return [...day.stops].filter((s) => !s.isHotel).sort((a, b) => a.order - b.order)
}

function nextPending(day: DayPlan): Stop | null {
  return visitStops(day).find((s) => (s.visitStatus ?? 'pending') === 'pending') ?? null
}

function nearestStop(
  stops: Stop[],
  here: CopilotHere,
): { stop: Stop; km: number } | null {
  let best: { stop: Stop; km: number } | null = null
  for (const s of stops) {
    if (s.isHotel) continue
    const km = haversineKm(here.lat, here.lng, s.lat, s.lng)
    if (!best || km < best.km) best = { stop: s, km }
  }
  return best
}

function modeLabel(mode?: TransitMode): string {
  if (!mode) return 'el mejor modo'
  return TRANSIT_MODE_LABELS[mode]
}

/** Sitios de interés cerca (Overpass, gratis). Falla soft. */
export async function fetchNearbySights(
  lat: number,
  lng: number,
  radiusM = 900,
): Promise<Array<{ name: string; lat: number; lng: number; kind: string; km: number }>> {
  const around = `around:${radiusM},${lat},${lng}`
  const query = `
[out:json][timeout:20];
(
  node(${around})[tourism~"attraction|museum|gallery|viewpoint"];
  node(${around})[historic];
  way(${around})[tourism~"attraction|museum|gallery"];
  way(${around})[historic];
);
out center 20;
`
  const urls = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ]
  for (const endpoint of urls) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      if (!res.ok) continue
      const json = (await res.json()) as {
        elements?: Array<{
          lat?: number
          lon?: number
          center?: { lat: number; lon: number }
          tags?: Record<string, string>
        }>
      }
      const out: Array<{ name: string; lat: number; lng: number; kind: string; km: number }> = []
      const seen = new Set<string>()
      for (const el of json.elements ?? []) {
        const plat = el.lat ?? el.center?.lat
        const plng = el.lon ?? el.center?.lon
        const name = el.tags?.name
        if (plat == null || plng == null || !name) continue
        const key = name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        const kind =
          el.tags?.tourism === 'museum'
            ? 'museo'
            : el.tags?.tourism === 'viewpoint'
              ? 'mirador'
              : el.tags?.historic
                ? 'histórico'
                : 'atracción'
        out.push({
          name,
          lat: plat,
          lng: plng,
          kind,
          km: haversineKm(lat, lng, plat, plng),
        })
      }
      return out.sort((a, b) => a.km - b.km).slice(0, 8)
    } catch {
      /* try next */
    }
  }
  return []
}

function replyRoute(trip: Trip, day: DayPlan, here?: CopilotHere): CopilotMsg {
  const visits = visitStops(day)
  const pending = visits.filter((s) => (s.visitStatus ?? 'pending') === 'pending')
  const lines: string[] = [
    `📍 ${trip.title} · ${day.label}`,
    pending.length
      ? `Os quedan ${pending.length} paradas pendientes:`
      : 'No hay pendientes (todas hechas o saltadas).',
  ]
  for (const s of (pending.length ? pending : visits).slice(0, 10)) {
    const st = s.visitStatus ?? 'pending'
    const mark = st === 'done' ? '✓' : st === 'skipped' ? '–' : '•'
    lines.push(
      `${mark} ${s.suggestedTime ? s.suggestedTime + ' · ' : ''}${s.name}${
        s.transitMode ? ` → ${modeLabel(s.transitMode)}` : ''
      }`,
    )
  }
  if (here) {
    const near = nearestStop(visits, here)
    if (near) {
      lines.push(
        `\nEstáis a ~${near.km < 1 ? Math.round(near.km * 1000) + ' m' : near.km.toFixed(1) + ' km'} de «${near.stop.name}».`,
      )
    }
  }
  const mapsStops = pending.length ? pending : visits
  return {
    id: `a-${Date.now()}`,
    role: 'assistant',
    text: lines.join('\n'),
    mapsUrl: mapsStops.length ? googleMapsDirectionsUrl(mapsStops) : undefined,
    at: new Date().toISOString(),
  }
}

function replyNext(day: DayPlan, here?: CopilotHere): CopilotMsg {
  const next = nextPending(day)
  if (!next) {
    return {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: 'No hay una siguiente parada pendiente. Podéis marcar «Para otro día» en check-in o replanear el día.',
      at: new Date().toISOString(),
    }
  }
  const visits = visitStops(day)
  const idx = visits.findIndex((s) => s.id === next.id)
  const after = visits[idx + 1]
  const lines = [
    `Ahora toca: ${next.name}`,
    CATEGORY_LABELS[next.category],
    next.suggestedTime ? `Hora sugerida ~${next.suggestedTime}` : null,
    next.userNotes ? `Nota: ${next.userNotes}` : null,
  ].filter(Boolean) as string[]

  if (here) {
    const km = haversineKm(here.lat, here.lng, next.lat, next.lng)
    lines.push(
      `Desde vuestra ubicación: ~${km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km'}.`,
    )
  }

  if (after) {
    lines.push(`\nLuego: ${after.name}`)
    lines.push(
      `Cómo ir: ${modeLabel(next.transitMode)}${
        next.minutesToNext != null ? ` · ~${next.minutesToNext} min` : ''
      }`,
    )
    if (next.transportReason) lines.push(next.transportReason)
    lines.push(
      'Abrí «Tramo a Maps» para ver la línea exacta de metro/bus (Google la calcula en vivo).',
    )
  }

  const mapsUrl = after
    ? googleMapsTransitLegUrl(
        here ?? next,
        after,
        travelModeForTransit(next.transitMode),
      )
    : googleMapsPlaceUrl(next.lat, next.lng, next.name)

  return {
    id: `a-${Date.now()}`,
    role: 'assistant',
    text: lines.filter(Boolean).join('\n'),
    mapsUrl,
    at: new Date().toISOString(),
  }
}

function replyHowToGo(day: DayPlan, here?: CopilotHere): CopilotMsg {
  const next = nextPending(day)
  if (!next) {
    return {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: 'No hay destino pendiente. Decid «ruta» para ver el plan del día.',
      at: new Date().toISOString(),
    }
  }
  const from = here ?? next
  const mode = travelModeForTransit(next.transitMode)
  const lines = [
    `Ruta óptima hacia: ${next.name}`,
    `Modo sugerido: ${modeLabel(next.transitMode)} (${mode})`,
    next.transportReason ||
      'En Maps veréis la línea de metro/bus exacta y los trasbordos (cambia en tiempo real).',
    here
      ? `Partiendo de vuestra ubicación actual.`
      : 'Activad ubicación o mandad “estoy aquí” para calcular desde donde estáis.',
  ]
  return {
    id: `a-${Date.now()}`,
    role: 'assistant',
    text: lines.join('\n'),
    mapsUrl: googleMapsTransitLegUrl(from, next, mode),
    at: new Date().toISOString(),
  }
}

async function replyNearby(
  trip: Trip,
  day: DayPlan,
  here: CopilotHere,
): Promise<CopilotMsg> {
  const fromWishlist = trip.places
    .map((p) => ({
      name: p.name,
      kind: CATEGORY_LABELS[p.category],
      km: haversineKm(here.lat, here.lng, p.lat, p.lng),
      lat: p.lat,
      lng: p.lng,
    }))
    .filter((x) => x.km <= 1.2)
    .sort((a, b) => a.km - b.km)
    .slice(0, 5)

  const osm = await fetchNearbySights(here.lat, here.lng, 1000)
  const lines = [`Sitios de interés cerca de vosotros (~1 km):`, '']

  if (fromWishlist.length) {
    lines.push('Del viaje:')
    for (const x of fromWishlist) {
      lines.push(`• ${x.name} (${x.kind}) · ${x.km < 1 ? Math.round(x.km * 1000) + ' m' : x.km.toFixed(1) + ' km'}`)
    }
    lines.push('')
  }

  if (osm.length) {
    lines.push('Por la zona (mapa libre):')
    for (const x of osm.slice(0, 6)) {
      lines.push(
        `• ${x.name} (${x.kind}) · ${x.km < 1 ? Math.round(x.km * 1000) + ' m' : x.km.toFixed(1) + ' km'}`,
      )
    }
  }

  if (!fromWishlist.length && !osm.length) {
    lines.push('No encontré monumentos cerca ahora. Probad de nuevo en unos segundos.')
  }

  const next = nextPending(day)
  lines.push(
    '',
    next
      ? `Siguiente del plan: ${next.name} — ${modeLabel(next.transitMode)}.`
      : 'No hay siguiente parada pendiente en el plan.',
  )

  return {
    id: `a-${Date.now()}`,
    role: 'assistant',
    text: lines.join('\n'),
    mapsUrl: next
      ? googleMapsTransitLegUrl(here, next, travelModeForTransit(next.transitMode))
      : googleMapsPlaceUrl(here.lat, here.lng),
    at: new Date().toISOString(),
  }
}

function detectIntent(raw: string): 'route' | 'next' | 'howto' | 'nearby' | 'help' | 'where' {
  const t = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  if (/(cerca|alrededor|zona|monument|interes|que hay|qué hay|alrededores)/.test(t)) {
    return 'nearby'
  }
  if (/(como llego|cómo llego|transporte|metro|bus|linea|línea|como ir|cómo ir|optima|óptima)/.test(t)) {
    return 'howto'
  }
  if (/(siguiente|que toca|qué toca|ahora|proximo|próximo)/.test(t)) return 'next'
  if (/(ruta|plan|paradas|itinerario|hoy)/.test(t)) return 'route'
  if (/(donde estoy|dónde estoy|estoy aqui|estoy aquí|ubicacion|ubicación|aqui|aquí)/.test(t)) {
    return 'where'
  }
  return 'help'
}

export function copilotHelpText(): string {
  return [
    'Soy vuestro copiloto (todo dentro de la app). Elegid:',
    '• Qué toca ahora · Ruta de hoy · Cómo llego · Qué hay cerca',
    '• Está cerrado · Hay mucha cola · Vamos tarde (ajuste fino)',
    '',
    'Ubicación: GPS o link de Google Maps / Apple Maps.',
  ].join('\n')
}

export async function answerCopilot(
  message: string,
  trip: Trip,
  opts?: { dayId?: string; here?: CopilotHere },
): Promise<CopilotMsg> {
  const day = pickActiveDay(trip, opts?.dayId)
  if (!day) {
    return {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: 'No hay un día activo en este viaje.',
      at: new Date().toISOString(),
    }
  }

  const intent = detectIntent(message)
  const here = opts?.here

  if (intent === 'help') {
    return {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: copilotHelpText(),
      at: new Date().toISOString(),
    }
  }

  if (intent === 'where' || intent === 'nearby') {
    if (!here) {
      return {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: 'Necesito vuestra ubicación. Tocad «Usar mi ubicación» y repetid la pregunta.',
        at: new Date().toISOString(),
      }
    }
    if (intent === 'where') {
      const near = nearestStop(visitStops(day), here)
      const next = nextPending(day)
      const lines = [
        'Ubicación recibida.',
        near
          ? `El punto del plan más cercano es «${near.stop.name}» (~${
              near.km < 1 ? Math.round(near.km * 1000) + ' m' : near.km.toFixed(1) + ' km'
            }).`
          : 'No hay paradas para comparar.',
        next ? `Siguiente pendiente: ${next.name}.` : null,
        'Decid «qué hay cerca» o «cómo llego» para más detalle.',
      ]
      return {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: lines.filter(Boolean).join('\n'),
        mapsUrl: next
          ? googleMapsTransitLegUrl(here, next, travelModeForTransit(next.transitMode))
          : undefined,
        at: new Date().toISOString(),
      }
    }
    return replyNearby(trip, day, here)
  }

  if (intent === 'howto') return replyHowToGo(day, here)
  if (intent === 'next') return replyNext(day, here)
  return replyRoute(trip, day, here)
}

/** Sin viaje: solo orientación por zona (OSM). */
export async function answerCopilotStandalone(
  message: string,
  here: CopilotHere,
): Promise<CopilotMsg> {
  const intent = detectIntent(message)
  if (intent === 'help') {
    return {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: [
        'Sin viaje todavía puedo:',
        '• Deciros qué hay cerca (monumentos / museos)',
        '• Abrir Maps desde vuestra ubicación',
        '',
        'Cread un viaje para ruta del día, transporte y check-in.',
      ].join('\n'),
      mapsUrl: googleMapsPlaceUrl(here.lat, here.lng),
      at: new Date().toISOString(),
    }
  }

  const osm = await fetchNearbySights(here.lat, here.lng, 1200)
  const lines = [
    'Estáis aquí (sin viaje planificado).',
    '',
    osm.length ? 'Sitios de interés cerca:' : 'No encontré atracciones cerca ahora.',
    ...osm.slice(0, 7).map(
      (x) =>
        `• ${x.name} (${x.kind}) · ${
          x.km < 1 ? Math.round(x.km * 1000) + ' m' : x.km.toFixed(1) + ' km'
        }`,
    ),
    '',
    'Cuando tengáis un viaje, os digo la ruta óptima y el transporte.',
  ]
  return {
    id: `a-${Date.now()}`,
    role: 'assistant',
    text: lines.join('\n'),
    mapsUrl: osm[0]
      ? googleMapsTransitLegUrl(here, osm[0], 'walking')
      : googleMapsPlaceUrl(here.lat, here.lng),
    at: new Date().toISOString(),
  }
}

/** Username del bot (sin @). Env de build, o fallback del bot de producción. */
function resolveTelegramBotUsername(botUsername?: string): string {
  return (
    botUsername ||
    import.meta.env.VITE_TELEGRAM_BOT ||
    'RutaDosGuia_bot'
  )
    .replace(/^@/, '')
    .trim()
}

/** Abre la app de Telegram (tg://) — username sin @ en VITE_TELEGRAM_BOT. */
export function telegramAppDeepLink(botUsername?: string, startPayload?: string): string | null {
  const user = resolveTelegramBotUsername(botUsername)
  if (!user) return null
  if (startPayload) {
    return `tg://resolve?domain=${encodeURIComponent(user)}&start=${encodeURIComponent(startPayload)}`
  }
  return `tg://resolve?domain=${encodeURIComponent(user)}`
}

/** Fallback https (escritorio / si tg:// no responde). */
export function telegramBotUrl(botUsername?: string, startPayload?: string): string | null {
  const user = resolveTelegramBotUsername(botUsername)
  if (!user) return null
  if (startPayload) return `https://t.me/${user}?start=${encodeURIComponent(startPayload)}`
  return `https://t.me/${user}`
}

export function openTelegramBot(startPayload?: string): boolean {
  const app = telegramAppDeepLink(undefined, startPayload)
  const web = telegramBotUrl(undefined, startPayload)
  if (!app || !web) return false
  // Intenta app nativa; si no, https
  window.location.href = app
  window.setTimeout(() => {
    // Si seguimos en la misma página (escritorio), ir a t.me
    if (!document.hidden) window.location.href = web
  }, 600)
  return true
}

export function shareAdviceTelegram(text: string, mapsUrl?: string): string {
  const body = mapsUrl ? `${text}\n\n${mapsUrl}` : text
  return `https://t.me/share/url?url=${encodeURIComponent(mapsUrl || 'https://t.me')}&text=${encodeURIComponent(body.slice(0, 1000))}`
}

export function isMapsLocationLink(text: string): boolean {
  const t = text.trim()
  return (
    /https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.|www\.google\.[^/]+\/maps|google\.[^/]+\/maps)/i.test(
      t,
    ) ||
    /https?:\/\/maps\.apple\.com/i.test(t) ||
    /^maps:\/\//i.test(t)
  )
}

/** Coordenadas desde Google Maps o Apple Maps (link pegado). */
export async function resolveLocationFromMapsLink(
  raw: string,
): Promise<{ lat: number; lng: number; label?: string } | null> {
  const text = raw.trim()
  if (!text) return null

  // Apple Maps: ?ll=lat,lng
  const appleLl = text.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/i)
  if (appleLl) {
    return { lat: Number(appleLl[1]), lng: Number(appleLl[2]), label: 'Apple Maps' }
  }
  const appleCoord = text.match(/[?&]coordinate=(-?\d+\.?\d*),(-?\d+\.?\d*)/i)
  if (appleCoord) {
    return { lat: Number(appleCoord[1]), lng: Number(appleCoord[2]), label: 'Apple Maps' }
  }

  const { extractCoordsFromMapsUrl, isGoogleMapsUrl, resolveGoogleMapsUrl } = await import(
    './importGmaps'
  )

  const direct = extractCoordsFromMapsUrl(text)
  if (direct && Number.isFinite(direct.lat) && Number.isFinite(direct.lng)) {
    return { ...direct, label: 'Maps' }
  }

  if (isGoogleMapsUrl(text)) {
    const resolved = await resolveGoogleMapsUrl(text)
    if (resolved && Number.isFinite(resolved.lat) && Number.isFinite(resolved.lng)) {
      return { lat: resolved.lat, lng: resolved.lng, label: resolved.name || 'Google Maps' }
    }
  }

  return null
}
