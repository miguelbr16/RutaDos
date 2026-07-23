type Props = {
  steps: number
  current: number
  className?: string
}

export function ProgressDots({ steps, current, className }: Props) {
  return (
    <nav className={className ?? 'ui-dots'} aria-label="Progreso">
      {Array.from({ length: steps }, (_, i) => (
        <span key={i} className={i <= current ? 'on' : ''} aria-hidden />
      ))}
    </nav>
  )
}
