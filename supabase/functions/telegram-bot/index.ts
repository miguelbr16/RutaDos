// RutaDos Telegram bot — abre en la app de Telegram (gratis).
// Deploy: supabase functions deploy telegram-bot --no-verify-jwt
// Secrets: TELEGRAM_BOT_TOKEN (+ SUPABASE_URL / SERVICE_ROLE inyectados)
//
// Capacidades:
// - Ubicación → recomendaciones in situ
// - Restaurantes / Hoteles con Web · Reservar · Booking · Maps
// - Ruta / siguiente / cómo llegar (viaje enlazado)
// - Pines + Google Maps
//
// /start TOKEN  → enlaza viaje (token de Compartir en RutaDos)
// /start        → menú sin viaje

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SB_URL') ?? ''
const SERVICE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''

type Place = {
  name: string
  lat: number
  lng: number
  category?: string
  website?: string
  phone?: string
}

type TripRow = {
  id: string
  title: string
  days: Array<{
    id: string
    date: string
    label: string
    stops: Array<{
      name: string
      lat: number
      lng: number
      isHotel?: boolean
      suggestedTime?: string
      transitMode?: string
      visitStatus?: string
      transportReason?: string
      minutesToNext?: number
      website?: string
      phone?: string
      category?: string
    }>
  }>
  places: Place[]
  preferences?: Record<string, boolean> | null
  route_style?: {
    pace?: string
    explore?: string
    foodBudget?: string
    mobility?: string
  } | null
  city?: { name?: string; lat?: number; lng?: number } | null
  logistics?: {
    hotel?: { name: string; lat?: number; lng?: number } | null
  } | null
}

type ChatRow = {
  chat_id: number
  trip_id: string | null
  last_lat: number | null
  last_lng: number | null
  last_nearby: Place[] | null
  picks: Place[] | null
  updated_at?: string | null
}

async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function activeDay(trip: TripRow) {
  return trip.days.find((d) => d.date === todayISO()) ?? trip.days[0]
}

function visits(day: TripRow['days'][0]) {
  return (day?.stops ?? []).filter((s) => !s.isHotel)
}

function pending(day: TripRow['days'][0]) {
  return visits(day).filter((s) => (s.visitStatus ?? 'pending') === 'pending')
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function mapsDir(
  points: Array<{ lat: number; lng: number }>,
  mode: 'walking' | 'transit' | 'driving' = 'transit',
) {
  if (!points.length) return 'https://www.google.com/maps'
  if (points.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${points[0].lat},${points[0].lng}`
  }
  const origin = `${points[0].lat},${points[0].lng}`
  const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`
  const mid = points
    .slice(1, -1)
    .slice(0, 8)
    .map((p) => `${p.lat},${p.lng}`)
    .join('|')
  const u = new URL('https://www.google.com/maps/dir/?api=1')
  u.searchParams.set('origin', origin)
  u.searchParams.set('destination', destination)
  u.searchParams.set('travelmode', mode)
  if (mid) u.searchParams.set('waypoints', mid)
  return u.toString()
}

function normalizeWebsite(raw?: string | null): string | undefined {
  if (!raw) return undefined
  const t = raw.trim()
  if (!t) return undefined
  if (/^https?:\/\//i.test(t)) return t
  if (/^www\./i.test(t)) return `https://${t}`
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(t)) return `https://${t}`
  return undefined
}

function looksLikeBookingSite(url: string): boolean {
  return /thefork|eltenedor|opentable|resy|sevenrooms|covermanager|quandoo|yelp\.|bookatable|tablecheck|tock\.com|exploretock|bookings?\./i.test(
    url,
  )
}

function mapsPlace(name: string, lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} @${lat},${lng}`)}`
}

function restaurantReserveUrl(p: Place, city?: string) {
  const web = normalizeWebsite(p.website)
  if (web && looksLikeBookingSite(web)) return web
  const q = `reservar mesa ${p.name}${city ? ` ${city}` : ''}`
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}

function restaurantWebUrl(p: Place) {
  return normalizeWebsite(p.website) ?? mapsPlace(p.name, p.lat, p.lng)
}

function hotelBookingUrl(p: Place, city?: string) {
  const ss = [p.name, city].filter(Boolean).join(' ').trim() || p.name
  const u = new URL('https://www.booking.com/searchresults.html')
  u.searchParams.set('ss', ss)
  u.searchParams.set('latitude', String(p.lat))
  u.searchParams.set('longitude', String(p.lng))
  return u.toString()
}

type NearbyMode = 'sights' | 'food' | 'hotels' | 'all'

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

function rankNearby(lat: number, lng: number, places: Place[], limit = 8, preferWeb = false): Place[] {
  const seen = new Set<string>()
  return places
    .filter((p) => {
      const key = p.name.toLowerCase().trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((p) => ({
      ...p,
      _d: haversineKm({ lat, lng }, p),
      _w: preferWeb && p.website ? 0 : 1,
    }))
    .sort((a, b) => a._w - b._w || a._d - b._d)
    .slice(0, limit)
    .map(({ name, lat: plat, lng: plng, category, website, phone }) => ({
      name,
      lat: plat,
      lng: plng,
      category,
      website,
      phone,
    }))
}

function overpassQuery(lat: number, lng: number, mode: NearbyMode): string {
  const around = `around:2000,${lat},${lng}`
  if (mode === 'food') {
    return `
[out:json][timeout:25];
(
  node(${around})[amenity~"restaurant|cafe|fast_food|pub|bar"]["name"];
  way(${around})[amenity~"restaurant|cafe|fast_food|pub|bar"]["name"];
);
out center 45;
`
  }
  if (mode === 'hotels') {
    return `
[out:json][timeout:25];
(
  node(${around})[tourism~"hotel|guest_house|hostel|motel"]["name"];
  way(${around})[tourism~"hotel|guest_house|hostel|motel"]["name"];
);
out center 40;
`
  }
  if (mode === 'all') {
    return `
[out:json][timeout:25];
(
  node(${around})[tourism];
  node(${around})[historic];
  node(${around})[amenity~"museum|theatre|arts_centre|place_of_worship|fountain|restaurant|cafe"];
  way(${around})[tourism];
  way(${around})[historic];
  way(${around})[amenity~"museum|theatre|arts_centre|restaurant|cafe"];
);
out center 35;
`
  }
  return `
[out:json][timeout:25];
(
  node(${around})[tourism];
  node(${around})[historic];
  node(${around})[amenity~"museum|theatre|arts_centre|place_of_worship|fountain"];
  way(${around})[tourism];
  way(${around})[historic];
  way(${around})[amenity~"museum|theatre|arts_centre|place_of_worship"];
);
out center 30;
`
}

function osmContact(tags: Record<string, string> | undefined): { website?: string; phone?: string } {
  if (!tags) return {}
  const website = normalizeWebsite(
    tags.website || tags['contact:website'] || tags.url || tags['contact:url'],
  )
  const phone = (tags.phone || tags['contact:phone'] || tags['contact:mobile'] || '').trim() || undefined
  return { website, phone }
}

async function fetchOsmNearby(
  lat: number,
  lng: number,
  mode: NearbyMode = 'sights',
): Promise<Place[]> {
  const query = overpassQuery(lat, lng, mode)
  const preferWeb = mode === 'food' || mode === 'hotels'
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      if (!res.ok) continue
      const json = await res.json()
      const out: Place[] = []
      for (const el of json.elements ?? []) {
        const plat = el.lat ?? el.center?.lat
        const plng = el.lon ?? el.center?.lon
        const name = el.tags?.name || el.tags?.['name:es'] || el.tags?.['name:en']
        if (plat == null || plng == null || !name) continue
        const { website, phone } = osmContact(el.tags)
        out.push({
          name,
          lat: plat,
          lng: plng,
          category: el.tags?.tourism || el.tags?.historic || el.tags?.amenity || 'sight',
          website,
          phone,
        })
      }
      // Prefer restaurants over bars when food mode
      if (mode === 'food') {
        out.sort((a, b) => {
          const ar = a.category === 'restaurant' ? 0 : 1
          const br = b.category === 'restaurant' ? 0 : 1
          return ar - br
        })
      }
      if (mode === 'hotels') {
        out.sort((a, b) => {
          const ah = a.category === 'hotel' ? 0 : 1
          const bh = b.category === 'hotel' ? 0 : 1
          return ah - bh
        })
      }
      const ranked = rankNearby(lat, lng, out, 8, preferWeb)
      if (ranked.length) return ranked
    } catch {
      /* try next mirror */
    }
  }
  return mode === 'food' || mode === 'hotels' ? [] : fetchWikiNearby(lat, lng)
}

async function fetchWikiNearby(lat: number, lng: number): Promise<Place[]> {
  try {
    const u = new URL('https://es.wikipedia.org/w/api.php')
    u.searchParams.set('action', 'query')
    u.searchParams.set('list', 'geosearch')
    u.searchParams.set('gscoord', `${lat}|${lng}`)
    u.searchParams.set('gsradius', '2000')
    u.searchParams.set('gslimit', '10')
    u.searchParams.set('format', 'json')
    u.searchParams.set('origin', '*')
    const res = await fetch(u.toString(), {
      headers: { 'User-Agent': 'RutaDosBot/1.0 (trip planner)' },
    })
    if (!res.ok) return []
    const json = await res.json()
    const out: Place[] = []
    for (const hit of json.query?.geosearch ?? []) {
      if (hit.lat == null || hit.lon == null || !hit.title) continue
      out.push({ name: hit.title, lat: hit.lat, lng: hit.lon, category: 'wiki' })
    }
    return rankNearby(lat, lng, out, 8)
  } catch {
    return []
  }
}

function detectNearbyMode(t: string): NearbyMode {
  if (/hotel|aloj|hostel|hostal|dormir|booking/.test(t)) return 'hotels'
  if (
    /comer|cena|almorz|desayun|restoran|restaurante|cafe|café|tapas|bar |pizza|comida|🍽/.test(t)
  ) {
    return 'food'
  }
  if (/recomiend|suger|que hacer|qué hacer|insitu|in situ|ahora|aqui|aquí|plan libre|sin plan|✨/.test(t)) {
    return 'all'
  }
  return 'sights'
}

function helpText() {
  return [
    'Soy el copiloto RutaDos 🧭',
    '',
    '1) Mandad 📍 ubicación',
    '2) Tocad:',
    '   · 🍽 Restaurantes → web / reservar mesa',
    '   · 🏨 Hoteles → web / Booking',
    '   · ✨ Recomiéndame / 📍 Qué hay cerca',
    '3) ➕ marca pines → Abrir en Google Maps',
    '',
    'Con viaje (Compartir → /start TOKEN):',
    '· Ruta de hoy · Qué toca · Cómo llego',
    '',
    'Los enlaces Web/Reservar/Booking abren el sitio real cuando OSM lo tiene;',
    'si no, búsqueda en Google o Booking.',
  ].join('\n')
}

function mainMenu() {
  return {
    keyboard: [
      [{ text: '📍 Enviar ubicación', request_location: true }],
      [{ text: '🍽 Restaurantes' }, { text: '🏨 Hoteles' }],
      [{ text: '✨ Recomiéndame' }, { text: '📍 Qué hay cerca' }],
      [{ text: '✅ Mis pines' }, { text: '🗺 Abrir en Google Maps' }],
      [{ text: '🗺 Ruta de hoy' }, { text: '⏭ Qué toca' }],
      [{ text: '🚇 Cómo llego' }, { text: '❓ Ayuda' }],
    ],
    resize_keyboard: true,
  }
}

function venueInlineRows(merged: Place[], mode: NearbyMode, city?: string) {
  const rows: Array<Array<Record<string, string>>> = []
  for (let i = 0; i < merged.length; i++) {
    const p = merged[i]
    const row: Array<Record<string, string>> = [
      { text: `➕ ${p.name.slice(0, 22)}`, callback_data: `sel:${i}` },
    ]
    if (mode === 'food') {
      row.push({ text: 'Web', url: restaurantWebUrl(p) })
      row.push({ text: 'Reservar', url: restaurantReserveUrl(p, city) })
    } else if (mode === 'hotels') {
      const web = normalizeWebsite(p.website)
      if (web) row.push({ text: 'Web', url: web })
      row.push({ text: 'Booking', url: hotelBookingUrl(p, city) })
    } else {
      row.push({ text: 'Maps', url: mapsPlace(p.name, p.lat, p.lng) })
    }
    rows.push(row)
  }
  rows.push([{ text: '🗺 Abrir ruta con pines', callback_data: 'maps' }])
  return rows
}

async function sendNearbySuggestions(opts: {
  supabase: SupabaseClient
  chatId: number
  lat: number
  lng: number
  trip: TripRow | null
  mode?: NearbyMode
  intro?: string
}) {
  const { supabase, chatId, lat, lng, trip, mode = 'sights', intro } = opts
  const city = trip?.city?.name

  await tg('sendMessage', {
    chat_id: chatId,
    text:
      intro ||
      (mode === 'food'
        ? 'Buscando restaurantes cerca…'
        : mode === 'hotels'
          ? 'Buscando hoteles cerca…'
          : 'Buscando recomendaciones cerca…'),
    reply_markup: mainMenu(),
  })

  const fromTrip = (trip?.places ?? [])
    .filter((p) => {
      if (mode === 'food') {
        return p.category === 'food' || p.category === 'cafe' || p.category === 'restaurant'
      }
      if (mode === 'hotels') return p.category === 'hotel' || p.category === 'custom'
      if (!trip?.preferences) return true
      const cat = p.category
      if (!cat) return true
      const prefs = trip.preferences
      if (cat === 'museum') return prefs.museums !== false
      if (cat === 'park') return prefs.parks !== false
      if (cat === 'nightlife') return !!prefs.nightlife
      if (cat === 'food' || cat === 'cafe') {
        return prefs.restaurants !== false || prefs.cafes !== false || !!prefs.street_food
      }
      return true
    })
    .map((p) => ({ ...p, km: haversineKm({ lat, lng }, p) }))
    .filter((p) => p.km <= 2)
    .sort((a, b) => a.km - b.km)
    .slice(0, 5)

  const osm = await fetchOsmNearby(lat, lng, mode)
  const merged: Place[] = []
  const seen = new Set<string>()
  for (const p of [...fromTrip, ...osm]) {
    const k = p.name.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    merged.push({
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      category: p.category,
      website: p.website,
      phone: p.phone,
    })
    if (merged.length >= 8) break
  }

  await supabase
    .from('telegram_chats')
    .update({ last_nearby: merged, last_lat: lat, last_lng: lng, updated_at: new Date().toISOString() })
    .eq('chat_id', chatId)

  if (!merged.length) {
    await tg('sendMessage', {
      chat_id: chatId,
      text: [
        'No encontré sitios con nombre cerca.',
        'Probad otra ubicación (centro / zona animada).',
      ].join('\n'),
      reply_markup: mainMenu(),
    })
    return
  }

  const title =
    mode === 'food'
      ? '🍽 Restaurantes cerca (priorizo con web):'
      : mode === 'hotels'
        ? '🏨 Hoteles cerca (Web / Booking):'
        : trip
          ? `${trip.title} · cerca${tripStyleLine(trip) ? ` (${tripStyleLine(trip)})` : ''}:`
          : 'Recomendaciones in situ:'

  const lines = [
    title,
    ...merged.map((p, i) => {
      const m = Math.round(haversineKm({ lat, lng }, p) * 1000)
      const flags = [
        p.category,
        p.website ? 'web' : null,
        p.phone ? 'tel' : null,
      ]
        .filter(Boolean)
        .join(' · ')
      return `${i + 1}. ${p.name}${flags ? ` (${flags})` : ''} · ~${m} m`
    }),
    '',
    mode === 'food'
      ? 'Tocad Web / Reservar (abre el sitio o Google). ➕ para marcar.'
      : mode === 'hotels'
        ? 'Tocad Web / Booking. ➕ para marcar.'
        : 'Tocad ➕ para marcar. Luego «Abrir en Google Maps».',
  ]

  // Hotel del viaje → Booking directo
  if (mode === 'hotels' && trip?.logistics?.hotel?.name) {
    const h = trip.logistics.hotel
    const book = hotelBookingUrl(
      { name: h.name, lat: h.lat ?? lat, lng: h.lng ?? lng },
      city,
    )
    lines.push('', `Vuestro hotel: ${h.name}`, book)
  }

  await tg('sendMessage', {
    chat_id: chatId,
    text: lines.join('\n'),
    reply_markup: { inline_keyboard: venueInlineRows(merged, mode, city) },
    disable_web_page_preview: true,
  })

  for (const p of merged.slice(0, 1)) {
    await tg('sendVenue', {
      chat_id: chatId,
      latitude: p.lat,
      longitude: p.lng,
      title: p.name.slice(0, 64),
      address: p.category || 'RutaDos',
    })
  }
}

async function ensureChat(supabase: SupabaseClient, chatId: number): Promise<ChatRow> {
  const { data } = await supabase.from('telegram_chats').select('*').eq('chat_id', chatId).maybeSingle()
  if (data) return data as ChatRow
  await supabase.from('telegram_chats').upsert({ chat_id: chatId, trip_id: null })
  return {
    chat_id: chatId,
    trip_id: null,
    last_lat: null,
    last_lng: null,
    last_nearby: [],
    picks: [],
  }
}

async function saveLoc(supabase: SupabaseClient, chatId: number, lat: number, lng: number) {
  await supabase
    .from('telegram_chats')
    .upsert({ chat_id: chatId, last_lat: lat, last_lng: lng, updated_at: new Date().toISOString() })
}

async function loadTrip(supabase: SupabaseClient, tripId: string | null): Promise<TripRow | null> {
  if (!tripId) return null
  const { data } = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    title: data.title,
    days: data.days ?? [],
    places: data.places ?? [],
    preferences: data.preferences ?? null,
    route_style: data.route_style ?? null,
    city: data.city ?? null,
    logistics: data.logistics ?? null,
  }
}

function tripStyleLine(trip: TripRow | null): string {
  if (!trip?.route_style && !trip?.preferences) return ''
  const pace =
    trip.route_style?.pace === 'intense'
      ? 'ritmo intenso'
      : trip.route_style?.pace === 'relaxed'
        ? 'ritmo tranquilo'
        : 'ritmo normal'
  const food =
    trip.route_style?.foodBudget === 'low'
      ? 'comida económica'
      : trip.route_style?.foodBudget === 'high'
        ? 'comida especial'
        : 'comida media'
  const explore =
    trip.route_style?.explore === 'icons'
      ? 'iconos'
      : trip.route_style?.explore === 'local'
        ? 'local'
        : 'mixto'
  return `${pace} · ${food} · ${explore}`
}

function modeFromTrip(trip: TripRow | null, asked: NearbyMode): NearbyMode {
  if (asked === 'food' || asked === 'hotels') return asked
  if (trip?.preferences?.street_food && !trip?.preferences?.restaurants) return 'food'
  if (trip?.route_style?.explore === 'local') return asked === 'sights' ? 'all' : asked
  return asked
}

function modeOf(s?: string): 'walking' | 'transit' | 'driving' {
  if (s === 'walk') return 'walking'
  if (s === 'taxi' || s === 'drive') return 'driving'
  return 'transit'
}

const seenUpdateIds = new Set<number>()
const SEEN_MAX = 200

function markSeen(updateId: number | undefined): boolean {
  if (updateId == null || !Number.isFinite(updateId)) return false
  if (seenUpdateIds.has(updateId)) return true
  seenUpdateIds.add(updateId)
  if (seenUpdateIds.size > SEEN_MAX) {
    const first = seenUpdateIds.values().next().value
    if (first != null) seenUpdateIds.delete(first)
  }
  return false
}

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void }

async function handleUpdate(
  update: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<void> {
  if (update.callback_query) {
    const cq = update.callback_query as {
      id: string
      data?: string
      message: { chat: { id: number } }
    }
    const chatId = cq.message.chat.id as number
    const data = String(cq.data || '')
    const chat = await ensureChat(supabase, chatId)
    const nearby = (chat.last_nearby ?? []) as Place[]
    let picks = [...((chat.picks ?? []) as Place[])]

    if (data.startsWith('sel:')) {
      const idx = Number(data.slice(4))
      const place = nearby[idx]
      if (place) {
        const exists = picks.findIndex(
          (p) => Math.abs(p.lat - place.lat) < 1e-5 && Math.abs(p.lng - place.lng) < 1e-5,
        )
        if (exists >= 0) picks.splice(exists, 1)
        else picks.push(place)
        await supabase
          .from('telegram_chats')
          .update({ picks, updated_at: new Date().toISOString() })
          .eq('chat_id', chatId)
        await tg('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: exists >= 0 ? `Quitado: ${place.name}` : `Añadido: ${place.name}`,
        })
        await tg('sendMessage', {
          chat_id: chatId,
          text: `Pines marcados (${picks.length}):\n${picks.map((p) => `• ${p.name}`).join('\n') || '—'}`,
          reply_markup: mainMenu(),
        })
      } else {
        await tg('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: 'Expirado; pedid cerca otra vez',
        })
      }
    } else if (data === 'maps') {
      await tg('answerCallbackQuery', { callback_query_id: cq.id })
      const here =
        chat.last_lat != null && chat.last_lng != null
          ? { lat: chat.last_lat, lng: chat.last_lng }
          : null
      const points = [...(here ? [here] : []), ...picks]
      const url = mapsDir(points, 'walking')
      await tg('sendMessage', {
        chat_id: chatId,
        text: `Google Maps (ruta con vuestros pines):\n${url}`,
        reply_markup: mainMenu(),
      })
    }
    return
  }

  const msg = update.message as
    | {
        chat: { id: number }
        text?: string
        caption?: string
        location?: { latitude: number; longitude: number }
      }
    | undefined
  if (!msg) return
  const chatId = msg.chat.id as number
  const text: string = (msg.text || msg.caption || '').trim()
  let chat = await ensureChat(supabase, chatId)

  if (text.startsWith('/start')) {
    const token = text.replace(/^\/start(@\w+)?/, '').trim()
    if (token) {
      const { error } = await supabase.rpc('link_telegram_chat', {
        p_chat_id: chatId,
        p_token: token,
      })
      if (error) {
        await tg('sendMessage', {
          chat_id: chatId,
          text: `No pude enlazar el viaje: ${error.message}`,
          reply_markup: mainMenu(),
        })
      } else {
        await tg('sendMessage', {
          chat_id: chatId,
          text: `Viaje enlazado ✓\nMandad ubicación y usad 🍽 Restaurantes / 🏨 Hoteles / Ruta de hoy.`,
          reply_markup: mainMenu(),
        })
      }
    } else {
      await tg('sendMessage', {
        chat_id: chatId,
        text: helpText(),
        reply_markup: mainMenu(),
      })
    }
    return
  }

  if (msg.location) {
    const lat = msg.location.latitude
    const lng = msg.location.longitude
    await saveLoc(supabase, chatId, lat, lng)
    const trip = await loadTrip(supabase, chat.trip_id)
    await sendNearbySuggestions({
      supabase,
      chatId,
      lat,
      lng,
      trip,
      mode: 'all',
      intro: 'Ubicación guardada ✓ Buscando recomendaciones in situ…',
    })
    return
  }

  chat = await ensureChat(supabase, chatId)
  const trip = await loadTrip(supabase, chat.trip_id)
  const here =
    chat.last_lat != null && chat.last_lng != null
      ? { lat: chat.last_lat, lng: chat.last_lng }
      : undefined
  const picks = (chat.picks ?? []) as Place[]
  const t = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

  if (/ayuda|help|\?/.test(t) || text === '❓ Ayuda') {
    await tg('sendMessage', { chat_id: chatId, text: helpText(), reply_markup: mainMenu() })
    return
  }

  if (/mis pines|pines|marcados/.test(t)) {
    await tg('sendMessage', {
      chat_id: chatId,
      text:
        picks.length === 0
          ? 'No hay pines marcados. Mandad ubicación → Tocad ➕.'
          : `Marcados:\n${picks.map((p) => `• ${p.name}`).join('\n')}`,
      reply_markup: mainMenu(),
    })
    return
  }

  if (/abrir en google|google maps|abrir en maps/.test(t)) {
    const day = trip ? activeDay(trip) : null
    const pend = day ? pending(day) : []
    const points: Array<{ lat: number; lng: number }> = []
    if (here) points.push(here)
    for (const p of picks) points.push(p)
    for (const s of pend.slice(0, 6)) {
      if (!points.some((x) => Math.abs(x.lat - s.lat) < 1e-5)) points.push(s)
    }
    const mode = pend[0] ? modeOf(pend[0].transitMode) : 'walking'
    const url = mapsDir(points.length ? points : here ? [here] : [], mode)
    await tg('sendMessage', {
      chat_id: chatId,
      text: ['Ruta en Google Maps:', url].join('\n'),
      reply_markup: mainMenu(),
      disable_web_page_preview: false,
    })
    return
  }

  if (
    /cerca|monument|interes|zona|recomiend|suger|que hacer|que me|donde comer|comer|cena|restoran|cafe|hotel|aloj|hostel|hostal|booking|✨|🍽|🏨/.test(
      t,
    ) ||
    text === '✨ Recomiéndame' ||
    text === '🍽 Restaurantes' ||
    text === '🍽 Dónde comer' ||
    text === '🏨 Hoteles' ||
    text === '📍 Qué hay cerca'
  ) {
    if (!here) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: 'Para recomendaros in situ necesito ubicación. Usad 📍 Enviar ubicación.',
        reply_markup: mainMenu(),
      })
      return
    }
    const nearby = (chat.last_nearby ?? []) as Place[]
    const updatedMs = chat.updated_at ? Date.parse(chat.updated_at) : 0
    const forceMode =
      text === '🍽 Restaurantes' || text === '🍽 Dónde comer'
        ? 'food'
        : text === '🏨 Hoteles'
          ? 'hotels'
          : null
    // Cooldown solo si pedís lo mismo genérico; botones dedicados siempre buscan
    if (!forceMode && nearby.length > 0 && updatedMs && Date.now() - updatedMs < 20_000) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: [
          'Ya os acabo de mandar recomendaciones ↑',
          'Tocad Web / Reservar / Booking o ➕.',
          'O pedid 🍽 Restaurantes / 🏨 Hoteles.',
        ].join('\n'),
        reply_markup: mainMenu(),
      })
      return
    }
    const asked = forceMode ?? detectNearbyMode(t + ' ' + text.toLowerCase())
    await sendNearbySuggestions({
      supabase,
      chatId,
      lat: here.lat,
      lng: here.lng,
      trip,
      mode: modeFromTrip(trip, asked),
      intro: trip
        ? `Según vuestro viaje (${tripStyleLine(trip) || trip.title})…`
        : undefined,
    })
    return
  }

  if (!trip) {
    await tg('sendMessage', {
      chat_id: chatId,
      text: [
        'Modo in situ (sin viaje enlazado):',
        '1) 📍 Enviar ubicación',
        '2) 🍽 Restaurantes / 🏨 Hoteles / Recomiéndame',
        '3) Web · Reservar · Booking · pines → Maps',
        '',
        'Con plan en RutaDos: Compartir → /start TOKEN.',
      ].join('\n'),
      reply_markup: mainMenu(),
    })
    return
  }

  const day = activeDay(trip)
  if (!day) {
    await tg('sendMessage', { chat_id: chatId, text: 'Viaje sin días.', reply_markup: mainMenu() })
    return
  }
  const pend = pending(day)
  const next = pend[0]

  if (/que toca|siguiente|ahora/.test(t)) {
    if (!next) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: 'No hay parada pendiente.',
        reply_markup: mainMenu(),
      })
      return
    }
    await tg('sendVenue', {
      chat_id: chatId,
      latitude: next.lat,
      longitude: next.lng,
      title: next.name.slice(0, 64),
      address: next.suggestedTime ? `~${next.suggestedTime}` : 'Siguiente',
    })
    const from = here ?? next
    const links: string[] = [
      `Ahora: ${next.name}`,
      next.transitMode ? `Modo: ${next.transitMode}` : '',
      next.transportReason || '',
      mapsDir([from, next], modeOf(next.transitMode)),
    ]
    if (next.category === 'food' || next.category === 'cafe') {
      links.push(
        `Reservar: ${restaurantReserveUrl({ name: next.name, lat: next.lat, lng: next.lng, website: next.website }, trip.city?.name)}`,
      )
    }
    await tg('sendMessage', {
      chat_id: chatId,
      text: links.filter(Boolean).join('\n'),
      reply_markup: mainMenu(),
    })
    return
  }

  if (/como llego|transporte|metro|linea|optima/.test(t)) {
    if (!next) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: 'No hay destino pendiente.',
        reply_markup: mainMenu(),
      })
      return
    }
    if (!here) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: 'Mandad ubicación para calcular el tramo.',
        reply_markup: mainMenu(),
      })
      return
    }
    await tg('sendMessage', {
      chat_id: chatId,
      text: [
        `Hacia: ${next.name}`,
        `Modo sugerido: ${next.transitMode || 'transporte'}`,
        mapsDir([here, next], modeOf(next.transitMode)),
      ].join('\n'),
      reply_markup: mainMenu(),
    })
    return
  }

  const list = (pend.length ? pend : visits(day)).slice(0, 10)
  const points = [...(here ? [here] : []), ...list]
  await tg('sendMessage', {
    chat_id: chatId,
    text: [
      `${trip.title} · ${day.label}`,
      ...list.map(
        (s) =>
          `• ${s.suggestedTime ? s.suggestedTime + ' · ' : ''}${s.name}${
            s.transitMode ? ` → ${s.transitMode}` : ''
          }`,
      ),
      '',
      mapsDir(points, modeOf(list[0]?.transitMode)),
    ].join('\n'),
    reply_markup: mainMenu(),
  })

  if (list[0]) {
    await tg('sendVenue', {
      chat_id: chatId,
      latitude: list[0].lat,
      longitude: list[0].lng,
      title: list[0].name.slice(0, 64),
      address: list[0].suggestedTime || trip.title,
    })
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')
  if (!TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response('missing env', { status: 500 })
  }

  let update: Record<string, unknown>
  try {
    update = await req.json()
  } catch {
    return new Response('ok')
  }

  const updateId = update.update_id as number | undefined
  if (markSeen(updateId)) {
    return new Response('ok')
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const work = handleUpdate(update, supabase).catch((err) => {
    console.error('telegram handleUpdate', err)
  })

  try {
    if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
      EdgeRuntime.waitUntil(work)
      return new Response('ok')
    }
  } catch {
    /* fall through */
  }

  await work
  return new Response('ok')
})
