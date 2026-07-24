type Props = {
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  className?: string
}

function WordmarkMark() {
  return (
    <>
      <span className="v2-wordmark-icon" aria-hidden="true">
        RD
      </span>
      <span className="v2-wordmark-text">
        Ruta<span className="v2-wordmark-accent">Dos</span>
      </span>
    </>
  )
}

/** Marca v2: icono "RD" coral + "RutaDos" con "Dos" en coral (reemplaza el texto plano). */
export function V2Wordmark({ size = 'md', onClick, className = '' }: Props) {
  const cls = `v2-wordmark v2-wordmark-${size} ${className}`.trim()
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} aria-label="RutaDos — Ir a Viajes">
        <WordmarkMark />
      </button>
    )
  }
  return (
    <span className={cls} aria-label="RutaDos">
      <WordmarkMark />
    </span>
  )
}
