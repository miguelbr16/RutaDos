import { useAppStore } from '../store'
import { Icon, type IconName } from '../components/Icons'
import { V2Wordmark } from './v2/V2Wordmark'

type TabId = 'trips' | 'plan' | 'today' | 'settings'

const TABS: Array<{ id: TabId; label: string; icon: IconName }> = [
  { id: 'trips', label: 'Viajes', icon: 'suitcase' },
  { id: 'plan', label: 'Plan', icon: 'calendar' },
  { id: 'today', label: 'Hoy', icon: 'sun' },
  { id: 'settings', label: 'Ajustes', icon: 'settings' },
]

/**
 * Tab bar fija de los 4 hubs (VISION_APP_V2.md §3.2).
 * "Plan" y "Hoy" necesitan un viaje activo — sin él quedan deshabilitados
 * en vez de navegar a una pantalla vacía.
 */
export function TabBar() {
  const view = useAppStore((s) => s.view)
  const activeTripId = useAppStore((s) => s.activeTripId)
  const trips = useAppStore((s) => s.trips)
  const setView = useAppStore((s) => s.setView)

  const resolvedTripId =
    activeTripId && trips.some((t) => t.id === activeTripId) ? activeTripId : (trips[0]?.id ?? null)

  function go(tab: TabId) {
    if (tab === 'trips') return setView({ name: 'trips' })
    if (tab === 'settings') return setView({ name: 'settings' })
    if (!resolvedTripId) return
    if (tab === 'plan') return setView({ name: 'plan', tripId: resolvedTripId })
    if (tab === 'today') return setView({ name: 'today', tripId: resolvedTripId })
  }

  return (
    <nav className="ui-tabbar" aria-label="Navegación principal">
      <span className="ui-tabbar-brand">
        <V2Wordmark size="sm" onClick={() => setView({ name: 'trips' })} />
      </span>
      {TABS.map((t) => {
        const disabled = (t.id === 'plan' || t.id === 'today') && !resolvedTripId
        const active = view.name === t.id
        return (
          <button
            key={t.id}
            type="button"
            className={`ui-tabbar-item${active ? ' on' : ''}`}
            aria-current={active ? 'page' : undefined}
            disabled={disabled}
            onClick={() => go(t.id)}
          >
            <Icon name={t.icon} size={21} />
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
