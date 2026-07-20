import type { GeoPlace, Stop, Trip } from '../types'
import { CATEGORY_LABELS } from '../types'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function placemark(opts: {
  name: string
  lat: number
  lng: number
  description?: string
}): string {
  const desc = opts.description ? `<description>${esc(opts.description)}</description>` : ''
  return `
    <Placemark>
      <name>${esc(opts.name)}</name>
      ${desc}
      <Point><coordinates>${opts.lng},${opts.lat},0</coordinates></Point>
    </Placemark>`
}

function stopDesc(s: Stop, dayLabel?: string): string {
  const parts = [
    dayLabel,
    s.suggestedTime,
    CATEGORY_LABELS[s.category] || s.category,
    s.notes,
  ].filter(Boolean)
  return parts.join(' · ')
}

function placeDesc(p: GeoPlace): string {
  const parts = [CATEGORY_LABELS[p.category] || p.category, p.tier, p.notes].filter(Boolean)
  return parts.join(' · ')
}

/** KML compatible con Google My Maps (importar archivo). */
export function tripToKml(trip: Trip): string {
  const dayFolders = trip.days
    .map((day) => {
      const marks = [...day.stops]
        .sort((a, b) => a.order - b.order)
        .map((s) =>
          placemark({
            name: s.name,
            lat: s.lat,
            lng: s.lng,
            description: stopDesc(s, day.label),
          }),
        )
        .join('')
      return `
  <Folder>
    <name>${esc(day.label)}</name>
    ${marks}
  </Folder>`
    })
    .join('')

  const usedIds = new Set(trip.days.flatMap((d) => d.stops.map((s) => s.placeId)))
  const wishlist = trip.places.filter((p) => !usedIds.has(p.id))
  const wishFolder =
    wishlist.length > 0
      ? `
  <Folder>
    <name>Wishlist (sin asignar a un día)</name>
    ${wishlist
      .map((p) =>
        placemark({
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          description: placeDesc(p),
        }),
      )
      .join('')}
  </Folder>`
      : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(trip.title)}</name>
    <description>Exportado desde RutaDos · ${esc(trip.city.name)} · ${esc(trip.startDate)} → ${esc(trip.endDate)}</description>
    ${dayFolders}
    ${wishFolder}
  </Document>
</kml>`
}

export function dayToKml(
  tripTitle: string,
  dayLabel: string,
  stops: Stop[],
): string {
  const marks = [...stops]
    .sort((a, b) => a.order - b.order)
    .map((s) =>
      placemark({
        name: `${s.order + 1}. ${s.name}`,
        lat: s.lat,
        lng: s.lng,
        description: stopDesc(s, dayLabel),
      }),
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(`${tripTitle} · ${dayLabel}`)}</name>
    ${marks}
  </Document>
</kml>`
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function safeFilename(name: string): string {
  return name.replace(/[^\w\-áéíóúñüÁÉÍÓÚÑÜ]+/gi, '_').slice(0, 60) || 'rutados'
}

/** Enlace para crear / abrir My Maps (el usuario importa el KML ahí). */
export const GOOGLE_MY_MAPS_URL = 'https://www.google.com/maps/d/'
