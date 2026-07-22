import type { CSSProperties } from 'react'
import type { QuickDestination } from '../lib/quickDestinations'

type Props = {
  destinations: QuickDestination[]
  onPick: (d: QuickDestination) => void
  selectedName?: string | null
  layout?: 'grid' | 'scroll'
}

export function DestinationGrid({ destinations, onPick, selectedName, layout = 'grid' }: Props) {
  const listClass = layout === 'scroll' ? 'dest-scroll' : 'dest-grid'

  return (
    <ul className={listClass}>
      {destinations.map((d) => {
        const selected = selectedName === d.name
        return (
          <li key={d.label}>
            <button
              type="button"
              className={selected ? 'dest-card on' : 'dest-card'}
              style={
                {
                  '--dest-accent': d.accent,
                  '--dest-photo': `url("${d.photo}")`,
                } as CSSProperties
              }
              onClick={() => onPick(d)}
              aria-pressed={selected}
            >
              <img className="dest-card-photo" src={d.photo} alt="" loading="lazy" decoding="async" />
              <span className="dest-card-shade" aria-hidden />
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
