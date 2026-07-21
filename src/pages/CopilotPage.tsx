import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store'
import {
  answerCopilot,
  answerCopilotStandalone,
  copilotHelpText,
  isMapsLocationLink,
  openTelegramBot,
  pickActiveDay,
  resolveLocationFromMapsLink,
  type CopilotHere,
  type CopilotMsg,
} from '../lib/copilot'

const CHOICES_WITH_TRIP = [
  { id: 'next', label: 'Qué toca ahora', prompt: 'Qué toca ahora' },
  { id: 'route', label: 'Ruta de hoy', prompt: 'Ruta de hoy' },
  { id: 'howto', label: 'Cómo llego', prompt: 'Cómo llego' },
  { id: 'near', label: 'Qué hay cerca', prompt: 'Qué hay cerca' },
  { id: 'closed', label: 'Está cerrado', prompt: 'está cerrado' },
  { id: 'queue', label: 'Hay mucha cola', prompt: 'hay mucha cola' },
  { id: 'late', label: 'Vamos tarde', prompt: 'vamos tarde' },
] as const

const CHOICES_NO_TRIP = [
  { id: 'near', label: 'Qué hay cerca', prompt: 'Qué hay cerca' },
  { id: 'here', label: 'Estoy aquí', prompt: 'estoy aquí' },
] as const

function TelegramIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M11.9 2C6.5 2 2.1 6.4 2.1 11.8c0 1.9.5 3.7 1.5 5.3L2 22l5.1-1.6c1.5.8 3.2 1.3 4.9 1.3 5.4 0 9.8-4.4 9.8-9.8S17.4 2 11.9 2zm4.8 7.1-1.6 7.5c-.1.5-.4.7-.8.4l-2.3-1.7-1.1 1.1c-.1.1-.3.3-.6.3l.2-2.4 4.4-4c.2-.2 0-.3-.2-.2l-5.4 3.4-2.3-.7c-.5-.2-.5-.5.1-.7l9-3.5c.4-.2.8.1.6.5z" />
    </svg>
  )
}

export function CopilotPage({ tripId, dayId }: { tripId?: string; dayId?: string }) {
  const trips = useAppStore((s) => s.trips)
  const activeTripId = useAppStore((s) => s.activeTripId)
  const resolvedTripId = tripId || activeTripId || trips[0]?.id
  const trip = resolvedTripId ? trips.find((t) => t.id === resolvedTripId) : undefined
  const setView = useAppStore((s) => s.setView)
  const chaosReplan = useAppStore((s) => s.chaosReplan)
  const deferStopToLater = useAppStore((s) => s.deferStopToLater)
  const setStopVisitStatus = useAppStore((s) => s.setStopVisitStatus)

  const [started, setStarted] = useState(false)
  const [input, setInput] = useState('')
  const [mapsLink, setMapsLink] = useState('')
  const [here, setHere] = useState<CopilotHere | null>(null)
  const [locMsg, setLocMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<CopilotMsg[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const day = trip ? pickActiveDay(trip, dayId) : null
  const choices = trip ? CHOICES_WITH_TRIP : CHOICES_NO_TRIP

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, started])

  function startChat() {
    setStarted(true)
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: trip
          ? copilotHelpText()
          : [
              'Hola — soy el copiloto de RutaDos (todo dentro de la app).',
              'Todavía no hay viaje: puedo orientaros por la zona.',
              '• «Qué hay cerca» / «Estoy aquí»',
              '• Pegad un link de Google Maps o Apple Maps',
              '',
              'Para ruta del día y transporte, cread un viaje antes.',
            ].join('\n'),
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
      setLocMsg('No pude leer ese link. Probá Google Maps o Apple Maps con pin.')
      return null
    }
    const h = { lat: resolved.lat, lng: resolved.lng }
    setHere(h)
    setMapsLink('')
    setLocMsg(`Ubicación desde ${resolved.label ?? 'Maps'} ✓`)
    return h
  }

  async function ask(text: string) {
    if (!text.trim()) return
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
        if (loc && !trip) {
          const reply = await answerCopilotStandalone('estoy aquí', loc)
          setMessages((m) => [...m, reply])
          return
        }
        if (loc && trip) {
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
        setMessages((m) => [
          ...m,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: [
              'Para orientaros necesito dónde estáis.',
              '• Tocad «Usar GPS», o',
              '• Pegad un link de Google Maps / Apple Maps.',
            ].join('\n'),
            at: new Date().toISOString(),
          },
        ])
        return
      }

      // Ajuste fino con viaje + día
      if (trip && day) {
        const t = text
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
        if (/cerrado|cierra|no abre|closed/.test(t)) {
          const next = day.stops.find(
            (s) => !s.isHotel && (s.visitStatus ?? 'pending') === 'pending',
          )
          if (next) {
            deferStopToLater(trip.id, day.id, next.id)
            setMessages((m) => [
              ...m,
              {
                id: `a-${Date.now()}`,
                role: 'assistant',
                text: `«${next.name}» queda para otro día. Paso a la siguiente del plan.`,
                at: new Date().toISOString(),
              },
            ])
            const reply = await answerCopilot('qué toca', trip, {
              dayId: day.id,
              here: loc ?? undefined,
            })
            setMessages((m) => [...m, reply])
            return
          }
        }
        if (/cola|queue|espera|lleno|saturad/.test(t)) {
          const next = day.stops.find(
            (s) => !s.isHotel && (s.visitStatus ?? 'pending') === 'pending',
          )
          if (next) {
            setStopVisitStatus(trip.id, day.id, next.id, 'skipped')
            setMessages((m) => [
              ...m,
              {
                id: `a-${Date.now()}`,
                role: 'assistant',
                text: `Saltamos «${next.name}» por la cola. Podéis recuperarlo otro día o más tarde.`,
                at: new Date().toISOString(),
              },
            ])
            const reply = await answerCopilot('qué toca', trip, {
              dayId: day.id,
              here: loc ?? undefined,
            })
            setMessages((m) => [...m, reply])
            return
          }
        }
        if (/tarde|nos retras|retraso|late/.test(t)) {
          chaosReplan(trip.id, day.id, 'late')
          setMessages((m) => [
            ...m,
            {
              id: `a-${Date.now()}`,
              role: 'assistant',
              text: 'Replan: vais tarde — jornada más corta. Conservo lo ya hecho.',
              at: new Date().toISOString(),
            },
          ])
          const reply = await answerCopilot('ruta', trip, {
            dayId: day.id,
            here: loc ?? undefined,
          })
          setMessages((m) => [...m, reply])
          return
        }
      }

      if (!trip) {
        if (!loc) {
          setMessages((m) => [
            ...m,
            {
              id: `a-${Date.now()}`,
              role: 'assistant',
              text: 'Sin viaje aún. Dadme ubicación (GPS o link) y pedid «qué hay cerca», o cread un viaje para la ruta completa.',
              at: new Date().toISOString(),
            },
          ])
          return
        }
        const reply = await answerCopilotStandalone(text, loc)
        setMessages((m) => [...m, reply])
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

  return (
    <div className="page copilot-page">
      <button
        type="button"
        className="btn ghost sm back"
        onClick={() => {
          if (dayId && trip) setView({ name: 'onroute', tripId: trip.id, dayId })
          else if (trip) setView({ name: 'trip', tripId: trip.id })
          else setView({ name: 'home' })
        }}
      >
        ← Atrás
      </button>

      <p className="brand small">Copiloto</p>
      <h1>Agente en vivo</h1>
      <p className="muted tiny">
        {trip ? trip.title : 'Sin viaje aún'}
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
              El botón azul abre la app de Telegram (copiloto ahí). Aquí también podéis chatear en
              la web si queréis.
            </p>
            <button type="button" className="btn primary" onClick={startChat}>
              Empezar chat aquí
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                if (!openTelegramBot()) {
                  setLocMsg(
                    'Configurad VITE_TELEGRAM_BOT=TuBot en .env (username de @BotFather, sin @).',
                  )
                }
              }}
            >
              Abrir app Telegram
            </button>
            {!trip && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => setView({ name: 'wizard', step: 0 })}
              >
                Crear un viaje
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <p className="muted tiny" style={{ marginTop: '0.5rem' }}>
            Elegid una opción:
          </p>
          <div className="chips">
            {choices.map((c) => (
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
              GPS (opcional) o pegad un link de Google Maps / Apple Maps.
            </p>
            <div className="toolbar">
              <button type="button" className="btn ghost sm" onClick={() => void requestLocation()}>
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
    </div>
  )
}

/** Botón flotante → abre la app de Telegram (bot). */
export function TelegramCopilotFab() {
  const view = useAppStore((s) => s.view)
  const [hint, setHint] = useState<string | null>(null)

  if (view.name === 'copilot') return null

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

