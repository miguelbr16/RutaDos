import { useState } from 'react'
import { openTelegramBot } from '../lib/copilot'

function TelegramIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M11.9 2C6.5 2 2.1 6.4 2.1 11.8c0 1.9.5 3.7 1.5 5.3L2 22l5.1-1.6c1.5.8 3.2 1.3 4.9 1.3 5.4 0 9.8-4.4 9.8-9.8S17.4 2 11.9 2zm4.8 7.1-1.6 7.5c-.1.5-.4.7-.8.4l-2.3-1.7-1.1 1.1c-.1.1-.3.3-.6.3l.2-2.4 4.4-4c.2-.2 0-.3-.2-.2l-5.4 3.4-2.3-.7c-.5-.2-.5-.5.1-.7l9-3.5c.4-.2.8.1.6.5z" />
    </svg>
  )
}

/** Botón flotante global → abre la app de Telegram (bot copiloto). Convive con el panel in-app de Hoy. */
export function TelegramFab() {
  const [hint, setHint] = useState<string | null>(null)

  return (
    <>
      {hint && (
        <div className="tg-fab-hint" role="status">
          {hint}
          <button type="button" className="icon-btn" onClick={() => setHint(null)} aria-label="Cerrar">
            ×
          </button>
        </div>
      )}
      <button
        type="button"
        className="tg-fab"
        title="Abrir copiloto en Telegram"
        aria-label="Abrir Telegram"
        onClick={() => {
          const ok = openTelegramBot()
          if (!ok) {
            setHint(
              'Falta configurar el bot: en .env poned VITE_TELEGRAM_BOT=NombreDeVuestroBot (sin @). Crearlo en @BotFather.',
            )
          }
        }}
      >
        <TelegramIcon size={30} />
      </button>
    </>
  )
}
