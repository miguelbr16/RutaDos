import type { CSSProperties } from 'react'
import type { QuickDestination } from '../lib/quickDestinations'

type Props = {
  destinations: QuickDestination[]
  onPick: (d: QuickDestination) => void
  selectedName?: string | null
  compact?: boolean
}

export function DestinationGrid({ destinations, onPick, selectedName, compact }: Props) {
  return (
    <ul className={compact ? 'dest-grid dest-grid-compact' : 'dest-grid'}>
      {destinations.map((d) => {
        const selected = selectedName === d.name
        return (
          <li key={d.label}>
            <button
              type="button"
              className={selected ? 'dest-card on' : 'dest-card'}
              style={{ '--dest-accent': d.accent } as CSSProperties}
              onClick={() => onPick(d)}
              aria-pressed={selected}
            >
              <span className="dest-card-bg" aria-hidden />
              <span className="dest-card-body">
                <strong>{d.label}</strong>
                <span>{d.tagline ?? d.hint ?? 'Explorar'}</span>
              </span>
              {selected ? (
                <span className="dest-card-check" aria-hidden>
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
