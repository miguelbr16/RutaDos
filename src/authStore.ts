import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import {
  createCouple,
  fetchInviteCode,
  fetchProfile,
  joinCouple,
  pullTrips,
  mergeTrips,
  upsertTrip,
} from './lib/sync'

interface AuthState {
  ready: boolean
  session: Session | null
  user: User | null
  coupleId: string | null
  inviteCode: string | null
  displayName: string | null
  syncing: boolean
  authError: string | null

  init: () => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setupCouple: (displayName?: string) => Promise<void>
  joinWithCode: (code: string, displayName?: string) => Promise<void>
  refreshProfile: () => Promise<void>
  syncFromCloud: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ready: !isSupabaseConfigured,
  session: null,
  user: null,
  coupleId: null,
  inviteCode: null,
  displayName: null,
  syncing: false,
  authError: null,

  init: async () => {
    if (!supabase) {
      set({ ready: true })
      return
    }

    const { data } = await supabase.auth.getSession()
    set({
      session: data.session,
      user: data.session?.user ?? null,
      ready: true,
    })

    if (data.session) {
      await get().refreshProfile()
      await get().syncFromCloud()
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
      if (session) {
        void get().refreshProfile().then(() => get().syncFromCloud())
      } else {
        set({ coupleId: null, inviteCode: null, displayName: null })
      }
    })
  },

  signUp: async (email, password, displayName) => {
    if (!supabase) return
    set({ authError: null })
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) {
      set({ authError: error.message })
      throw error
    }
  },

  signIn: async (email, password) => {
    if (!supabase) return
    set({ authError: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ authError: error.message })
      throw error
    }
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    set({ coupleId: null, inviteCode: null, displayName: null })
  },

  setupCouple: async (displayName) => {
    set({ authError: null })
    try {
      const code = await createCouple(displayName)
      await get().refreshProfile()
      set({ inviteCode: code })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo crear la pareja'
      set({ authError: msg })
      throw err
    }
  },

  joinWithCode: async (code, displayName) => {
    set({ authError: null })
    try {
      await joinCouple(code, displayName)
      await get().refreshProfile()
      await get().syncFromCloud()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Código inválido'
      set({ authError: msg })
      throw err
    }
  },

  refreshProfile: async () => {
    if (!supabase) return
    const profile = await fetchProfile()
    let inviteCode: string | null = null
    if (profile?.couple_id) {
      inviteCode = await fetchInviteCode(profile.couple_id)
    }
    set({
      coupleId: profile?.couple_id ?? null,
      displayName: profile?.display_name ?? null,
      inviteCode,
    })
  },

  syncFromCloud: async () => {
    const { coupleId } = get()
    if (!coupleId || !supabase) return
    set({ syncing: true })
    try {
      const { useAppStore } = await import('./store')
      const remote = await pullTrips(coupleId)
      const local = useAppStore.getState().trips
      const merged = mergeTrips(local, remote)
      useAppStore.getState().replaceTrips(merged)

      for (const t of merged) {
        const rem = remote.find((r) => r.id === t.id)
        if (!rem || Date.parse(t.updatedAt) > Date.parse(rem.updatedAt)) {
          await upsertTrip(t, coupleId)
        }
      }
    } finally {
      set({ syncing: false })
    }
  },
}))
