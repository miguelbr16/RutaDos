// Supabase Edge Function — Telegram bot (FREE via Bot API).
// Deploy: supabase functions deploy telegram-bot --no-verify-jwt
// Secrets: TELEGRAM_BOT_TOKEN, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL
// Webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<project>.supabase.co/functions/v1/telegram-bot
//
// Link a trip: user opens share link in app, then in Telegram sends:
//   /start SHARETOKEN
// Then: "ruta", "qué toca", "cómo llego", or send a location pin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SB_URL') ?? ''
const SERVICE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''

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
    }>
  }>
  places: Array<{ name: string; lat: number; lng: number; category: string }>
}

function tgApi(method: string, body: Record<string, unknown>) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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

function mapsDir(from: { lat: number; lng: number }, to: { lat: number; lng: number }, mode = 'transit') {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=${mode}`
}

function answer(text: string, trip: TripRow, here?: { lat: number; lng: number }) {
  const t = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  const day = activeDay(trip)
  if (!day) return 'No hay días en este viaje.'

  const pend = pending(day)
  const next = pend[0]

  if (/(cerca|monument|zona|interes)/.test(t) && here) {
    const near = (trip.places ?? [])
      .map((p) => ({ ...p, km: haversineKm(here, p) }))
      .filter((p) => p.km <= 1.2)
      .sort((a, b) => a.km - b.km)
      .slice(0, 6)
    const lines = [`${trip.title} · cerca de vosotros:`, ...near.map((p) => `• ${p.name} (~${(p.km * 1000) | 0} m)`)]
    if (next) {
      lines.push('', `Siguiente del plan: ${next.name}`, mapsDir(here, next))
    }
    return lines.join('\n') || 'Nada del viaje a <1.2 km.'
  }

  if (/(como llego|transporte|metro|linea|optima)/.test(t) && next) {
    const from = here ?? next
    const mode = next.transitMode === 'walk' ? 'walking' : next.transitMode === 'taxi' || next.transitMode === 'drive' ? 'driving' : 'transit'
    return [
      `Hacia: ${next.name}`,
      `Modo: ${next.transitMode || 'transporte'}`,
      next.transportReason || 'Abrí el link para ver la línea exacta en Maps.',
      mapsDir(from, next, mode),
    ].join('\n')
  }

  if (/(siguiente|que toca|ahora)/.test(t)) {
    if (!next) return 'No hay parada pendiente.'
    return [`Ahora: ${next.name}`, next.suggestedTime ? `~${next.suggestedTime}` : '', next.transitMode ? `Luego: ${next.transitMode}` : '']
      .filter(Boolean)
      .join('\n')
  }

  if (/(ruta|plan|paradas)/.test(t) || true) {
    const list = (pend.length ? pend : visits(day)).slice(0, 10)
    return [
      `${trip.title} · ${day.label}`,
      ...list.map((s) => `• ${s.suggestedTime ? s.suggestedTime + ' · ' : ''}${s.name}${s.transitMode ? ' → ' + s.transitMode : ''}`),
      next ? mapsDir(next, list[list.length - 1] || next) : '',
    ]
      .filter(Boolean)
      .join('\n')
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')
  if (!TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response('missing env', { status: 500 })
  }

  const update = await req.json()
  const msg = update.message
  if (!msg) return new Response('ok')

  const chatId = msg.chat.id as number
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const text: string = msg.text || msg.caption || ''
  if (text.startsWith('/start')) {
    const token = text.replace('/start', '').trim()
    if (!token) {
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: 'Enlazad un viaje: generad Compartir en RutaDos y enviad aquí:\n/start TOKEN',
      })
      return new Response('ok')
    }
    const { data, error } = await supabase.rpc('link_telegram_chat', {
      p_chat_id: chatId,
      p_token: token,
    })
    if (error) {
      await tgApi('sendMessage', { chat_id: chatId, text: `No pude enlazar: ${error.message}` })
    } else {
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: `Viaje enlazado ✓ (${data}). Decid: ruta · qué toca · cómo llego · o mandad ubicación.`,
      })
    }
    return new Response('ok')
  }

  const { data: link } = await supabase
    .from('telegram_chats')
    .select('trip_id')
    .eq('chat_id', chatId)
    .maybeSingle()

  if (!link?.trip_id) {
    await tgApi('sendMessage', {
      chat_id: chatId,
      text: 'Primero /start TOKEN (el token del link Compartir de RutaDos).',
    })
    return new Response('ok')
  }

  const { data: trip } = await supabase.from('trips').select('*').eq('id', link.trip_id).maybeSingle()
  if (!trip) {
    await tgApi('sendMessage', { chat_id: chatId, text: 'Viaje no encontrado.' })
    return new Response('ok')
  }

  const row: TripRow = {
    id: trip.id,
    title: trip.title,
    days: trip.days ?? [],
    places: trip.places ?? [],
  }

  let here: { lat: number; lng: number } | undefined
  if (msg.location) {
    here = { lat: msg.location.latitude, lng: msg.location.longitude }
  }

  const reply = answer(text || (here ? 'cerca' : 'ruta'), row, here)
  await tgApi('sendMessage', { chat_id: chatId, text: reply.slice(0, 3900) })
  return new Response('ok')
})
