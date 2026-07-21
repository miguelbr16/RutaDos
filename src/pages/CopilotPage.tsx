import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store'
import {
  answerCopilot,
  copilotHelpText,
  isMapsLocationLink,
  pickActiveDay,
  resolveLocationFromMapsLink,
  telegramBotUrl,
  type CopilotHere,
  type CopilotMsg,
} from '../lib/copilot'

const CHOICES = [
  { id: 'next', label: 'Qué toca ahora', prompt: 'Qué toca ahora' },
  { id: 'route', label: 'Ruta de hoy', prompt: 'Ruta de hoy' },
  { id: 'howto', label: 'Cómo llego', prompt: 'Cómo llego' },
  { id: 'near', label: 'Qué hay cerca', prompt: 'Qué hay cerca' },
] as const

function TelegramIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M11.9 2C6.5 2 2.1 6.4 2.1 11.8c0 1.9.5 3.7 1.5 5.3L2 22l5.1-1.6c1.5.8 3.2 1.3 4.9 1.3 5.4 0 9.8-4.4 9.8-9.8S17.4 2 11.9 2zm4.8 7.1-1.6 7.5c-.1.5-.4.7-.8.4l-2.3-1.7-1.1 1.1c-.1.1-.3.3-.6.3l.2-2.4 4.4-4c.2-.2 0-.3-.2-.2l-5.4 3.4-2.3-.7c-.5-.2-.5-.5.1-.7l9-3.5c.4-.2.8.1.6.5z" />
    </svg>
  )
}

export function CopilotPage({ tripId, dayId }: { tripId: string; dayId?: string }) {
  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId))
  const setView = useAppStore((s) => s.setView)
  const [started, setStarted] = useState(false)
  const [input, setInput] = useState('')
  const [mapsLink, setMapsLink] = useState('')
  const [here, setHere] = useState<CopilotHere | null>(null)
  const [locMsg, setLocMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<CopilotMsg[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const day = trip ? pickActiveDay(trip, dayId) : null
  const botUrl = telegramBotUrl()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, started])

  function startChat() {
    setStarted(true)
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: copilotHelpText(),
        at: new Date().toISOString(),
      },
    ])
  }

  function requestLocation(): Promise<CopilotHere | null> {
    setLocMsg('Pidiendo ubicación…')
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocMsg('Sin GPS. Pegad un link de Google Maps o Apple Maps abajo.')
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const h = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setHere(h)
          setLocMsg('Ubicación GPS activa ✓')
          resolve(h)
        },
        () => {
          setLocMsg('GPS no disponible. Pegad un link de Maps (Google o Apple).')
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 12000 },
      )
    })
  }

  async function applyMapsLink(raw: string): Promise<CopilotHere | null> {
    const q = raw.trim()
    if (!q) return null
    setLocMsg('Leyendo link de Maps…')
    const resolved = await resolveLocationFromMapsLink(q)
    if (!resolved) {
      setLocMsg('No pude leer ese link. Probá Google Maps o Apple Maps con coordenadas / pin.')
      return null
    }
    const h = { lat: resolved.lat, lng: resolved.lng }
    setHere(h)
    setMapsLink('')
    setLocMsg(`Ubicación desde ${resolved.label ?? 'Maps'} ✓`)
    return h
  }

  async function ask(text: string) {
    if (!trip || !text.trim()) return
    if (!started) startChat()

    const userMsg: CopilotMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      at: new Date().toISOString(),
    }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setBusy(true)
    try {
      let loc = here
      const looksLikeLink = isMapsLocationLink(text) || /maps\.(google|apple)|goo\.gl/i.test(text)
      if (looksLikeLink) {
        loc = (await applyMapsLink(text)) ?? loc
        if (loc) {
          const reply = await answerCopilot('estoy aquí', trip, {
            dayId: day?.id ?? dayId,
            here: loc,
          })
          setMessages((m) => [...m, reply])
          return
        }
      }

      const needsLoc = /cerca|aqui|aquí|estoy|ubicacion|ubicación|donde|dónde|llego|llegar/i.test(
        text,
      )
      if (needsLoc && !loc) {
        // No forzar GPS: pedir link o GPS en el mensaje
        setMessages((m) => [
          ...m,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: [
              'Para orientaros necesito dónde estáis.',
              '• Tocad «Usar GPS», o',
              '• Pegad un link de Google Maps / Apple Maps (en el campo de ubicación o aquí mismo).',
            ].join('\n'),
            at: new Date().toISOString(),
          },
        ])
        return
      }

      const reply = await answerCopilot(text, trip, {
        dayId: day?.id ?? dayId,
        here: loc ?? undefined,
      })
      setMessages((m) => [...m, reply])
    } finally {
      setBusy(false)
    }
  }

  if (!trip) {
    return (
      <div className="page">
        <p>Viaje no encontrado.</p>
        <button type="button" className="btn" onClick={() => setView({ name: 'home' })}>
          Inicio
        </button>
      </div>
    )
  }

  return (
    <div className="page copilot-page">
      <button
        type="button"
        className="btn ghost sm back"
        onClick={() =>
          dayId
            ? setView({ name: 'onroute', tripId, dayId })
            : setView({ name: 'trip', tripId })
        }
      >
        ← Atrás
      </button>

      <p className="brand small">Copiloto</p>
      <h1>Agente en vivo</h1>
      <p className="muted tiny">
        {trip.title}
        {day ? ` · ${day.label}` : ''}
        {here ? ' · ubicación lista' : ''}
      </p>

      {!started ? (
        <div className="copilot-start">
          <div className="copilot-start-card">
            <div className="tg-badge" aria-hidden>
              <TelegramIcon size={36} />
            </div>
            <h2>Empezar chat</h2>
            <p className="muted">
              Os digo la ruta, el siguiente sitio, cómo llegar y qué hay cerca. Sin WhatsApp (de
              pago): solo este chat y Telegram si lo configuráis.
            </p>
            <button type="button" className="btn primary" onClick={startChat}>
              Empezar chat
            </button>
            {botUrl && (
              <a className="btn ghost" href={botUrl} target="_blank" rel="noreferrer">
                Abrir bot en Telegram
              </a>
            )}
          </div>
        </div>
      ) : (
        <>
          <p className="muted tiny" style={{ marginTop: '0.5rem' }}>
            Elegid una opción:
          </p>
          <div className="chips">
            {CHOICES.map((c) => (
              <button
                key={c.id}
                type="button"
                className="chip"
                disabled={busy}
                onClick={() => void ask(c.prompt)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="copilot-loc panel">
            <strong>¿Dónde estáis?</strong>
            <p className="muted tiny">
              GPS (opcional) o pegad un link de Google Maps / Apple Maps si no queréis compartir
              ubicación.
            </p>
            <div className="toolbar">
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => void requestLocation()}
              >
                Usar GPS
              </button>
            </div>
            <label className="field">
              <span>Link de Maps</span>
              <input
                value={mapsLink}
                onChange={(e) => setMapsLink(e.target.value)}
                placeholder="https://maps.app.goo.gl/… o maps.apple.com/…"
                disabled={busy}
              />
            </label>
            <button
              type="button"
              className="btn ghost sm"
              disabled={busy || !mapsLink.trim()}
              onClick={() => void applyMapsLink(mapsLink)}
            >
              Usar este link
            </button>
            {locMsg && <p className="muted tiny">{locMsg}</p>}
          </div>

          <div className="copilot-thread">
            {messages.map((m) => (
              <div key={m.id} className={`copilot-bubble ${m.role}`}>
                <pre className="copilot-text">{m.text}</pre>
                {m.mapsUrl && (
                  <a className="btn primary sm" href={m.mapsUrl} target="_blank" rel="noreferrer">
                    Abrir en Maps
                  </a>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            className="copilot-compose"
            onSubmit={(e) => {
              e.preventDefault()
              void ask(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribí o pegá un link de Maps…"
              disabled={busy}
            />
            <button type="submit" className="btn primary" disabled={busy || !input.trim()}>
              {busy ? '…' : 'Enviar'}
            </button>
          </form>
        </>
      )}

      <a
        className="tg-fab"
        href={botUrl || undefined}
        onClick={(e) => {
          if (!botUrl) {
            e.preventDefault()
            if (!started) startChat()
            else bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
          }
        }}
        target={botUrl ? '_blank' : undefined}
        rel={botUrl ? 'noreferrer' : undefined}
        title={botUrl ? 'Abrir Telegram' : 'Hablar con el agente'}
        aria-label="Telegram copiloto"
      >
        <TelegramIcon size={30} />
      </a>
    </div>
  )
}

/** Botón flotante Telegram → abre el copiloto del viaje activo. */
export function TelegramCopilotFab({
  tripId,
  dayId,
}: {
  tripId: string
  dayId?: string
}) {
  const setView = useAppStore((s) => s.setView)
  const botUrl = telegramBotUrl()

  return (
    <button
      type="button"
      className="tg-fab"
      title="Copiloto"
      aria-label="Abrir copiloto"
      onClick={() => {
        if (botUrl && (window as unknown as { __preferTelegram?: boolean }).__preferTelegram) {
          window.open(botUrl, '_blank', 'noopener')
          return
        }
        setView({ name: 'copilot', tripId, dayId })
      }}
    >
      <TelegramIcon size={30} />
    </button>
  )
}
