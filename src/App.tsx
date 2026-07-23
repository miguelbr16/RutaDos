import { useEffect } from 'react'
import { useAppStore } from './store'
import { useAuthStore } from './authStore'
import { HomePage } from './pages/HomePage'
import { WizardPage } from './pages/WizardPage'
import { TripPage } from './pages/TripPage'
import { DayPage } from './pages/DayPage'
import { OnRoutePage } from './pages/OnRoutePage'
import { GuidesPage } from './pages/GuidesPage'
import { BuildPage } from './pages/BuildPage'
import { AuthPage } from './pages/AuthPage'
import { SettingsPage } from './pages/SettingsPage'
import { SharePage } from './pages/SharePage'
import { CopilotPage, TelegramCopilotFab } from './pages/CopilotPage'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { mergeTrips, pullTrips, rowToTrip, type TripRow } from './lib/sync'

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

  return (
    <div
      className={`app-shell${view.name === 'home' || view.name === 'wizard' || view.name === 'trip' || view.name === 'day' ? ' app-r3' : ''}`}
    >
      {view.name !== 'home' && view.name !== 'wizard' && view.name !== 'trip' ? (
        <div className="atmosphere" aria-hidden />
      ) : null}
      {view.name === 'home' && <HomePage />}
      {view.name === 'wizard' && <WizardPage />}
      {view.name === 'trip' && <TripPage tripId={view.tripId} />}
      {view.name === 'day' && <DayPage tripId={view.tripId} dayId={view.dayId} />}
      {view.name === 'onroute' && <OnRoutePage tripId={view.tripId} dayId={view.dayId} />}
      {view.name === 'guides' && <GuidesPage tripId={view.tripId} />}
      {view.name === 'build' && <BuildPage tripId={view.tripId} dayId={view.dayId} />}
      {view.name === 'share' && <SharePage token={view.token} />}
      {view.name === 'copilot' && (
        <CopilotPage tripId={view.tripId} dayId={view.dayId} />
      )}
      {view.name === 'auth' && <AuthPage />}
      {view.name === 'settings' && <SettingsPage />}
      <TelegramCopilotFab />
    </div>
  )
}
