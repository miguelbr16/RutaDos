import type { ReactNode } from 'react'

type Item = {
  key: string
  label: string
  icon: ReactNode
  onClick?: () => void
  href?: string
  active?: boolean
}

type Props = {
  items: Item[]
}

export function DayBottomBar({ items }: Props) {
  return (
    <nav className="ui-day-bar" aria-label="Acciones del día">
      {items.map((item) => {
        const inner = (
          <>
            <span className="ui-day-bar-ico" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </>
        )
        if (item.href) {
          return (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className={item.active ? 'on' : ''}
            >
              {inner}
            </a>
          )
        }
        return (
          <button
            key={item.key}
            type="button"
            className={item.active ? 'on' : ''}
            onClick={item.onClick}
          >
            {inner}
          </button>
        )
      })}
    </nav>
  )
}
