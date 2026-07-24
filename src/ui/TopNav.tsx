import type { ReactNode } from 'react'
import { Icon } from '../components/Icons'
import { V2Wordmark } from './v2/V2Wordmark'

type Props = {
  title?: string
  onBack?: () => void
  backLabel?: string
  right?: ReactNode
  settings?: () => void
}

export function TopNav({ title, onBack, backLabel, right, settings }: Props) {
  return (
    <header className="ui-nav">
      <div className="ui-nav-inner">
        {onBack ? (
          <button type="button" className="ui-icon-btn" aria-label={backLabel ?? 'Volver'} onClick={onBack}>
            <Icon name="chevron-left" size={18} />
          </button>
        ) : title ? (
          <span className="ui-brand">
            <span className="ui-brand-dot" aria-hidden />
            {title}
          </span>
        ) : (
          <V2Wordmark size="sm" />
        )}
        {onBack && title ? <span className="ui-nav-title">{title}</span> : null}
        <div className="ui-nav-actions">
          {right}
          {settings ? (
            <button type="button" className="ui-icon-btn" aria-label="Ajustes" onClick={settings}>
              <Icon name="settings" size={18} />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
