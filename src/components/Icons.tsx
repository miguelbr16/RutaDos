type IconProps = {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}

export type IconName =
  | 'map'
  | 'transit'
  | 'dining'
  | 'landmark'
  | 'compass'
  | 'wine'
  | 'hotel'
  | 'restaurant'
  | 'cafe'
  | 'settings'
  | 'chevron-left'
  | 'chevron-right'
  | 'more'
  | 'close'
  | 'trash'
  | 'arrow-right'

const PATHS: Record<IconName, string | string[]> = {
  map: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  transit: 'M8 6v6m4-6v6m4-6v6M4 18h16M6 6h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z',
  dining: 'M12 3v18M8 3v8a4 4 0 008 0V3M4 21h16',
  landmark: 'M3 21h18M6 21V9l6-4 6 4v12M10 21v-6h4v6',
  compass: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 0l2.5 7.5L12 12 9.5 10.5 12 3zm0 18l-2.5-7.5L12 12l2.5 2.5L12 21z',
  wine: 'M8 22h8M12 15v7M7.5 3h9L15 9a3 3 0 01-6 0L7.5 3z',
  hotel: 'M3 21V7a2 2 0 012-2h14a2 2 0 012 2v14M3 10h18M7 14h.01M11 14h.01M15 14h.01',
  restaurant: 'M6 2v7a4 4 0 008 0V2M10 9v13M4 22h12',
  cafe: 'M17 8h1a3 3 0 010 6h-1M6 2v8a4 4 0 008 0V2M10 10v12M4 22h12',
  settings:
    'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  'chevron-left': 'M15 18l-6-6 6-6',
  'chevron-right': 'M9 18l6-6-6-6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  close: 'M18 6L6 18M6 6l12 12',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
}

export function Icon({ name, size = 20, className, strokeWidth = 1.75 }: IconProps) {
  const d = PATHS[name]
  const paths = Array.isArray(d) ? d : [d]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}
