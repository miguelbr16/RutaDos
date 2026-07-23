import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store'
import {
  answerCopilot,
  copilotHelpText,
  isMapsLocationLink,
  pickActiveDay,
  resolveLocationFromMapsLink,
  type CopilotHere,
  type CopilotMsg,
} from '../lib/copilot'
import { Icon } from '../components/Icons'

const CHOICES = [
  { id: 'next', label: 'Qué toca ahora', prompt: 'Qué toca ahora' },
  { id: 'route', label: 'Ruta de hoy', prompt: 'Ruta de hoy' },
  { id: 'howto', label: 'Cómo llego', prompt: 'Cómo llego' },
  { id: 'near', label: 'Qué hay cerca', prompt: 'Qué hay cerca' },
  { id: 'closed', label: 'Está cerrado', prompt: 'está cerrado' },
  { id: 'late', label: 'Vamos tarde', prompt: 'vamos tarde' },
] as const

type Props = {
  tripId: string
  dayId?: string
  onClose: () => void
}

/**
 * Panel deslizable del copiloto in-app (motor en lib/copilot.ts).
 * Vive dentro del hub "Hoy" — Telegram sigue disponible aparte (TelegramFab).
 */
export function CopilotSheet({ tripId, dayId, onClose }: Props) {
  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId))
  const chaosReplan = useAppStore((s) => s.chaosReplan)
  const deferStopToLater = useAppStore((s) => s.deferStopToLater)
  const setStopVisitStatus = useAppStore((s) => s.setStopVisitStatus)

  const [input, setInput] = useState('')
  const [mapsLink, setMapsLink] = useState('')
  const [here, setHere] = useState<CopilotHere | null>(null)
  const [locMsg, setLocMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<CopilotMsg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: copilotHelpText(),
      at: new Date().toISOString(),
    },
  ])
  const bottomRef = useRef<HTMLDivElement>(null)

  const day = trip ? pickActiveDay(trip, dayId) : null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function requestLocation() {
    setLocMsg('Pidiendo ubicación…')
    if (!navigator.geolocation) {
      setLocMsg('Sin GPS. Pegad un link de Google Maps o Apple Maps abajo.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocMsg('Ubicación GPS activa ✓')
      },
      () => setLocMsg('GPS no disponible. Pegad un link de Maps (Google o Apple).'),
      { enableHighAccuracy: true, timeout: 12000 },
    )
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
    if (!text.trim() || !trip) return
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
          const reply = await answerCopilot('estoy aquí', trip, { dayId: day?.id ?? dayId, here: loc })
          setMessages((m) => [...m, reply])
          return
        }
      }

      const needsLoc = /cerca|aqui|aquí|estoy|ubicacion|ubicación|donde|dónde|llego|llegar/i.test(text)
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

      if (day) {
        const t = text
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
        if (/cerrado|cierra|no abre|closed/.test(t)) {
          const next = day.stops.find((s) => !s.isHotel && (s.visitStatus ?? 'pending') === 'pending')
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
            const reply = await answerCopilot('qué toca', trip, { dayId: day.id, here: loc ?? undefined })
            setMessages((m) => [...m, reply])
            return
          }
        }
        if (/cola|queue|espera|lleno|saturad/.test(t)) {
          const next = day.stops.find((s) => !s.isHotel && (s.visitStatus ?? 'pending') === 'pending')
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
            const reply = await answerCopilot('qué toca', trip, { dayId: day.id, here: loc ?? undefined })
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
          const reply = await answerCopilot('ruta', trip, { dayId: day.id, here: loc ?? undefined })
          setMessages((m) => [...m, reply])
          return
        }
      }

      const reply = await answerCopilot(text, trip, { dayId: day?.id ?? dayId, here: loc ?? undefined })
      setMessages((m) => [...m, reply])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ui-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ui-copilot-sheet"
        role="dialog"
        aria-label="Copiloto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ui-sheet-handle" aria-hidden />
        <header className="ui-copilot-sheet-head">
          <div>
            <strong>Copiloto</strong>
            <span className="muted tiny">
              {trip?.title}
              {day ? ` · ${day.label}` : ''}
              {here ? ' · ubicación lista' : ''}
            </span>
          </div>
          <button type="button" className="ui-icon-btn" aria-label="Cerrar copiloto" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="ui-copilot-choices">
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

        <div className="ui-copilot-loc">
          <button type="button" className="btn ghost sm" onClick={requestLocation}>
            <Icon name="pin" size={15} /> Usar GPS
          </button>
          <input
            value={mapsLink}
            onChange={(e) => setMapsLink(e.target.value)}
            placeholder="o pegad un link de Maps…"
            disabled={busy}
          />
          <button
            type="button"
            className="btn ghost sm"
            disabled={busy || !mapsLink.trim()}
            onClick={() => void applyMapsLink(mapsLink)}
          >
            Usar
          </button>
        </div>
        {locMsg && <p className="muted tiny ui-copilot-locmsg">{locMsg}</p>}

        <div className="ui-copilot-thread">
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
          className="ui-copilot-compose"
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
          <button type="submit" className="ui-icon-btn primary" disabled={busy || !input.trim()} aria-label="Enviar">
            <Icon name="send" size={17} />
          </button>
        </form>
      </div>
    </div>
  )
}
