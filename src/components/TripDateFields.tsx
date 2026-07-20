interface Props {
  label: string
  value: string
  min?: string
  onChange: (iso: string) => void
}

/**
 * Un solo campo de fecha (calendario nativo).
 * max lejos en el futuro para poder planificar 2026/2027+.
 */
export function TripDateFields({ label, value, min, onChange }: Props) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="date"
        value={value}
        min={min || '2024-01-01'}
        max="2035-12-31"
        onChange={(e) => {
          const v = e.target.value
          if (!v) return
          if (min && v < min) onChange(min)
          else onChange(v)
        }}
      />
    </label>
  )
}
