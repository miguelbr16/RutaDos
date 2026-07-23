import { useEffect } from 'react'
import { useAppStore } from './store'
import { useAuthStore } from './authStore'
import { TripsPage } from './pages/TripsPage'
import { WizardPage } from './pages/WizardPage'
import { PlanPage } from './pages/PlanPage'
import { TodayPage } from './pages/TodayPage'
import { BuildPage } from './pages/BuildPage'
import { AuthPage } from './pages/AuthPage'
import { SettingsPage } from './pages/SettingsPage'
import { SharePage } from './pages/SharePage'
import { TabBar, TelegramFab } from './ui'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { mergeTrips, pullTrips, rowToTrip, type TripRow } from './lib/sync'

/** Hubs con tab bar fija (VISION_APP_V2.md §3.2). El resto son pantallas de utilidad sin tab bar. */
const TABBED_VIEWS = new Set(['trips', 'plan', 'today', 'settings'])
/** Vistas con look & feel del sistema de diseño v2 (fondo claro editorial). */
const UI_VIEWS = new Set(['trips', 'wizard', 'plan', 'today', 'settings'])

export default function App() {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const initAuth = useAuthStore((s) => s.init)
  const coupleId = useAuthStore((s) => s.coupleId)

  useEffect(() => {
    void initAuth()
  }, [initAuth])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const share = params.get('share')
    if (share) {
      setView({ name: 'share', token: share })
    }
  }, [setView])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !coupleId) return

    const channel = supabase
      .channel(`trips-couple-${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const local = useAppStore.getState().trips
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id?: string }).id
            if (id) {
              useAppStore.getState().replaceTrips(local.filter((t) => t.id !== id))
            }
            return
          }
          const row = payload.new as TripRow
          if (!row?.id) return
          const remoteTrip = rowToTrip(row)
          useAppStore.getState().replaceTrips(mergeTrips(local, [remoteTrip]))
        },
      )
      .subscribe()

    void pullTrips(coupleId).then((remote) => {
      const local = useAppStore.getState().trips
      useAppStore.getState().replaceTrips(mergeTrips(local, remote))
    })

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [coupleId])

  const showTabBar = TABBED_VIEWS.has(view.name)
  const showTelegramFab = view.name !== 'wizard' && view.name !== 'auth' && view.name !== 'share'

  return (
    <div className={`app-shell${UI_VIEWS.has(view.name) ? ' app-ui' : ''}`}>
      {!UI_VIEWS.has(view.name) ? <div className="atmosphere" aria-hidden /> : null}
      {view.name === 'trips' && <TripsPage />}
      {view.name === 'wizard' && <WizardPage />}
      {view.name === 'plan' && <PlanPage tripId={view.tripId} />}
      {view.name === 'today' && <TodayPage tripId={view.tripId} dayId={view.dayId} />}
      {view.name === 'build' && <BuildPage tripId={view.tripId} dayId={view.dayId} />}
      {view.name === 'share' && <SharePage token={view.token} />}
      {view.name === 'auth' && <AuthPage />}
      {view.name === 'settings' && <SettingsPage />}
      {showTabBar && <TabBar />}
      {showTelegramFab && <TelegramFab />}
    </div>
  )
}
