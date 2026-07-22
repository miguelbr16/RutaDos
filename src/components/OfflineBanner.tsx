import {
  formatOfflineSavedAt,
  loadOfflineDay,
  type OfflineDayPack,
} from '../lib/offlineDay'

type Props = {
  online: boolean
  pack: OfflineDayPack | null
  onSavedJustNow?: boolean
}

export function OfflineStatusBanner({ online, pack, onSavedJustNow }: Props) {
  if (!online) {
    return (
      <div className="offline-banner warn">
        <strong>Sin conexión</strong>
        <p>
          {pack
            ? `Usáis la ruta guardada · ${pack.dayLabel} · ${formatOfflineSavedAt(pack.savedAt)}`
            : 'No hay pack offline. Al volver la red, abrid el día para guardarlo.'}
        </p>
      </div>
    )
  }

  if (onSavedJustNow || pack) {
    return (
      <div className="offline-banner ok">
        <strong>Listo sin red</strong>
        <p>
          {pack
            ? `Pack del día guardado · ${formatOfflineSavedAt(pack.savedAt)} · paradas, transportes y horas.`
            : 'Guardando pack del día…'}
        </p>
      </div>
    )
  }

  return null
}

export function OfflinePackPreview({ pack }: { pack: OfflineDayPack }) {
  return (
    <section className="offline-pack panel">
      <h3>Pack offline · {pack.dayLabel}</h3>
      <p className="muted tiny">
        {pack.cityName} · {pack.stops.length} paradas · {formatOfflineSavedAt(pack.savedAt)}
      </p>
      <a className="btn primary sm" href={pack.dayMapsUrl} target="_blank" rel="noreferrer">
        Día en Maps
      </a>
      <ol className="offline-pack-list">
        {pack.stops.map((s) => (
          <li key={s.id}>
            <div>
              <strong>
                {s.time ? `${s.time} · ` : ''}
                {s.name}
              </strong>
              {s.legToNext ? (
                <p className="muted tiny">
                  → {s.legToNext.modeLabel}
                  {s.legToNext.minutes != null ? ` · ~${s.legToNext.minutes} min` : ''}
                  {s.legToNext.reason ? ` · ${s.legToNext.reason}` : ''}
                </p>
              ) : null}
            </div>
            {s.legToNext ? (
              <a className="btn ghost sm" href={s.legToNext.mapsUrl} target="_blank" rel="noreferrer">
                Tramo
              </a>
            ) : (
              <a className="btn ghost sm" href={s.placeMapsUrl} target="_blank" rel="noreferrer">
                Maps
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Útil si no hay trip en memoria pero sí pack. */
export function peekOfflinePack(): OfflineDayPack | null {
  return loadOfflineDay()
}
