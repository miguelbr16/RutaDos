import type { CSSProperties } from 'react'
import type { QuickDestination } from '../lib/quickDestinations'

type Props = {
  destinations: QuickDestination[]
  onPick: (d: QuickDestination) => void
  selectedName?: string | null
  layout?: 'grid' | 'scroll'
}

export function DestGrid({ destinations, onPick, selectedName, layout = 'grid' }: Props) {
  if (!destinations.length) {
    return <p className="muted tiny">No hay destinos cargados.</p>
  }

  return (
    <ul className={layout === 'scroll' ? 'ui-dest-scroll' : 'ui-dest-grid'}>
      {destinations.map((d) => {
        const selected = selectedName === d.name
        return (
          <li key={`${d.name}-${d.lat}`}>
            <button
              type="button"
              className={selected ? 'ui-dest-card on' : 'ui-dest-card'}
              style={{ '--dest-accent': d.accent } as CSSProperties}
              onClick={() => onPick(d)}
              aria-pressed={selected}
            >
              <span className="ui-dest-media" aria-hidden>
                <img src={d.photo} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="ui-dest-body">
                <strong>{d.label}</strong>
                <span>{d.tagline ?? d.hint ?? 'Explorar'}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
