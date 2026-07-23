import type { CSSProperties } from 'react'
import type { QuickDestination } from '../lib/quickDestinations'

type Props = {
  destinations: QuickDestination[]
  onPick: (d: QuickDestination) => void
  selectedName?: string | null
  layout?: 'grid' | 'scroll'
}

/** Cards con foto arriba + texto abajo (sin overlays absolutos que chocan con CSS viejo). */
export function DestinationGrid({ destinations, onPick, selectedName, layout = 'grid' }: Props) {
  const listClass = layout === 'scroll' ? 'rd-dest-scroll' : 'rd-dest-grid'

  if (!destinations.length) {
    return <p className="muted tiny">No hay destinos cargados.</p>
  }

  return (
    <ul className={listClass}>
      {destinations.map((d) => {
        const selected = selectedName === d.name
        return (
          <li key={`${d.name}-${d.lat}`}>
            <button
              type="button"
              className={selected ? 'rd-dest-card on' : 'rd-dest-card'}
              style={{ '--dest-accent': d.accent } as CSSProperties}
              onClick={() => onPick(d)}
              aria-pressed={selected}
            >
              <span className="rd-dest-media" aria-hidden>
                <img src={d.photo} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="rd-dest-body">
                <strong>{d.label}</strong>
                <span>{d.tagline ?? d.hint ?? 'Explorar'}</span>
              </span>
              {selected ? (
                <span className="rd-dest-check" aria-hidden>
                  ✓
                </span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
