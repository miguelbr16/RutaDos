type Tab<T extends string> = { id: T; label: string }

type Props<T extends string> = {
  tabs: readonly Tab<T>[]
  value: T
  onChange: (id: T) => void
  ariaLabel?: string
  className?: string
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  className,
}: Props<T>) {
  return (
    <nav className={className ?? 'ui-seg-tabs'} aria-label={ariaLabel}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={value === t.id ? 'on' : ''}
          aria-current={value === t.id ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
