import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useMemo } from 'react'
import type { PlaceCategory, Stop, TransitMode } from '../types'
import { CATEGORY_LABELS, TRANSIT_MODE_LABELS } from '../types'
import { categoryColor } from '../lib/categoryColors'
import 'leaflet/dist/leaflet.css'

export type MapPickable = {
  id: string
  name: string
  lat: number
  lng: number
  category: PlaceCategory
  selected?: boolean
}

function pinIcon(color: string, n: number | string, hotel?: boolean) {
  const bg = hotel ? '#1a4a5c' : color
  return L.divIcon({
    className: 'ruta-pin',
    html: `<div style="
      background:${bg};
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
    "><span style="
      transform:rotate(45deg);
      color:#fff;font:700 11px/1 system-ui,sans-serif;
    ">${n}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  })
}

function StopPopup({ stop, visitLabel }: { stop: Stop; visitLabel?: number | string }) {
  const photos = stop.photoUrls?.length ? stop.photoUrls : stop.photoUrl ? [stop.photoUrl] : []
  const category = stop.isHotel ? 'Hotel' : CATEGORY_LABELS[stop.category]
  const color = categoryColor(stop.category)

  return (
    <div className="map-stop-popup">
      {photos.length > 0 ? (
        <div className="map-stop-popup-photos">
          {photos.slice(0, 3).map((src) => (
            <img key={src} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />
          ))}
        </div>
      ) : (
        <div className="map-stop-popup-placeholder" style={{ background: color }} aria-hidden />
      )}
      <div className="map-stop-popup-body">
        <div className="map-stop-popup-head">
          {visitLabel != null && !stop.isHotel ? (
            <span className="map-stop-popup-num" style={{ background: color }}>
              {visitLabel}
            </span>
          ) : null}
          <strong>{stop.name}</strong>
        </div>
        <span className="map-stop-popup-cat">{category}</span>
        {stop.transitMode ? (
          <span className="map-stop-popup-transit">{TRANSIT_MODE_LABELS[stop.transitMode]} →</span>
        ) : null}
      </div>
    </div>
  )
}

function pickPinIcon(color: string, selected: boolean) {
  const size = selected ? 26 : 18
  const opacity = selected ? 1 : 0.88
  return L.divIcon({
    className: 'ruta-pin pick',
    html: `<div style="
      background:${color};
      width:${size}px;height:${size}px;border-radius:50%;
      border:2px solid ${selected ? '#fff' : 'rgba(255,255,255,.85)'};
      box-shadow:0 1px 5px rgba(0,0,0,.35);
      opacity:${opacity};
      box-sizing:border-box;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function FitBounds({
  stops,
  pickables,
  fallback,
}: {
  stops: Stop[]
  pickables: MapPickable[]
  fallback?: { lat: number; lng: number } | null
}) {
  const map = useMap()
  useEffect(() => {
    const pts: [number, number][] = [
      ...stops.map((s) => [s.lat, s.lng] as [number, number]),
      ...pickables.map((p) => [p.lat, p.lng] as [number, number]),
    ]
    if (!pts.length) {
      if (fallback) map.setView([fallback.lat, fallback.lng], 12)
      return
    }
    if (pts.length === 1) {
      map.setView(pts[0], 13)
      return
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 13 })
  }, [map, stops, pickables, fallback])
  return null
}

function legStyle(mode?: TransitMode): L.PathOptions {
  switch (mode) {
    case 'walk':
      return { color: '#2a6f82', weight: 4, opacity: 0.9, dashArray: '8 10' }
    case 'metro':
      return { color: '#9B2226', weight: 5, opacity: 0.9 }
    case 'bus':
      return { color: '#E9A825', weight: 5, opacity: 0.9 }
    case 'train':
      return { color: '#264653', weight: 5, opacity: 0.9 }
    case 'taxi':
    case 'drive':
      return { color: '#E76F51', weight: 5, opacity: 0.85 }
    default:
      return { color: '#F0A05A', weight: 4, opacity: 0.85, dashArray: '6 8' }
  }
}

interface Props {
  stops: Stop[]
  route?: { lat: number; lng: number }[] | null
  height?: string
  className?: string
  showLegend?: boolean
  /** Si true, dibuja un tramo por parada con estilo según transitMode */
  showLegs?: boolean
  /** Centro cuando no hay paradas (evita Madrid por defecto) */
  defaultCenter?: { lat: number; lng: number } | null
  /** Pines tocables para armar ruta (wishlist en mapa) */
  pickables?: MapPickable[]
  onPick?: (id: string) => void
}

export function TripMap({
  stops,
  route,
  height = '240px',
  className,
  showLegend,
  showLegs = true,
  defaultCenter = null,
  pickables = [],
  onPick,
}: Props) {
  const ordered = [...stops].sort((a, b) => a.order - b.order)
  const center: [number, number] = ordered.length
    ? [ordered[0].lat, ordered[0].lng]
    : pickables.length
      ? [pickables[0].lat, pickables[0].lng]
      : defaultCenter
        ? [defaultCenter.lat, defaultCenter.lng]
        : [40.4, -3.7]

  const legendCats = useMemo(() => {
    const set = new Set([
      ...ordered.filter((s) => !s.isHotel).map((s) => s.category),
      ...pickables.map((p) => p.category),
    ])
    return [...set]
  }, [ordered, pickables])

  const modesUsed = useMemo(() => {
    const set = new Set<TransitMode>()
    for (const s of ordered) {
      if (s.transitMode) set.add(s.transitMode)
    }
    return [...set]
  }, [ordered])

  const selectedIds = useMemo(() => new Set(ordered.map((s) => s.placeId || s.id)), [ordered])

  let visitNum = 0

  return (
    <div className={className}>
      <div style={{ height, borderRadius: 16, overflow: 'hidden' }}>
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds stops={ordered} pickables={pickables} fallback={defaultCenter} />
          {showLegs &&
            ordered.slice(0, -1).map((s, i) => {
              const next = ordered[i + 1]
              return (
                <Polyline
                  key={`leg-${s.id}`}
                  positions={[
                    [s.lat, s.lng],
                    [next.lat, next.lng],
                  ]}
                  pathOptions={legStyle(s.transitMode)}
                />
              )
            })}
          {!showLegs && route && route.length > 1 && (
            <Polyline
              positions={route.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: '#F0A05A', weight: 4, opacity: 0.85 }}
            />
          )}
          {!showLegs && ordered.length > 1 && (
            <Polyline
              positions={ordered.map((s) => [s.lat, s.lng] as [number, number])}
              pathOptions={{ color: '#F0A05A', weight: 4, opacity: 0.9, dashArray: '4 8' }}
            />
          )}
          {pickables
            .filter((p) => !selectedIds.has(p.id))
            .map((p) => (
              <Marker
                key={`pick-${p.id}`}
                position={[p.lat, p.lng]}
                icon={pickPinIcon(categoryColor(p.category), false)}
                eventHandlers={{
                  click: () => onPick?.(p.id),
                }}
              >
                <Popup>
                  <strong>{p.name}</strong>
                  <div>{CATEGORY_LABELS[p.category]}</div>
                  {onPick && <div className="muted">Toca el pin para añadir</div>}
                </Popup>
              </Marker>
            ))}
          {ordered.map((s) => {
            const label = s.isHotel ? 'H' : ++visitNum
            return (
              <Marker
                key={s.id}
                position={[s.lat, s.lng]}
                icon={pinIcon(categoryColor(s.category), label, s.isHotel)}
                eventHandlers={
                  onPick && !s.isHotel
                    ? {
                        click: () => onPick(s.placeId || s.id),
                      }
                    : undefined
                }
              >
                <Popup className="map-stop-popup-wrap" minWidth={240} maxWidth={280}>
                  <StopPopup stop={s} visitLabel={s.isHotel ? undefined : label} />
                  {onPick && !s.isHotel ? <p className="map-stop-popup-hint">Toca el pin para quitar</p> : null}
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>
      {showLegend && (legendCats.length > 0 || modesUsed.length > 0) && (
        <ul className="map-legend">
          {legendCats.map((c) => (
            <li key={c}>
              <span className="dot" style={{ background: categoryColor(c) }} />
              {CATEGORY_LABELS[c]}
            </li>
          ))}
          {modesUsed.map((m) => (
            <li key={m}>
              <span
                className="line-swatch"
                style={{
                  borderColor: (legStyle(m).color as string) || '#ccc',
                  borderStyle: m === 'walk' ? 'dashed' : 'solid',
                }}
              />
              {TRANSIT_MODE_LABELS[m]}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
