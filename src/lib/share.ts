import { isSupabaseConfigured, supabase } from './supabase'
import type { Trip } from '../types'
import { rowToTrip, type TripRow, upsertTrip } from './sync'
import { useAuthStore } from '../authStore'

export function shareUrlForToken(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/?share=${encodeURIComponent(token)}`
}

export async function createTripShareToken(trip: Trip): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no configurado. Usá Exportar JSON mientras tanto.')
  }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    throw new Error('Iniciá sesión (Pareja) para generar un link compartible.')
  }
  const coupleId = useAuthStore.getState().coupleId
  if (!coupleId) {
    throw new Error('Uníos como pareja en Ajustes para sincronizar y compartir el viaje.')
  }
  await upsertTrip(trip, coupleId)

  const { data, error } = await supabase.rpc('create_trip_share', {
    p_trip_id: trip.id,
    p_can_edit: false,
  })
  if (error) throw error
  if (!data || typeof data !== 'string') throw new Error('No se pudo crear el link')
  return data
}

export async function fetchTripByShareToken(token: string): Promise<Trip | null> {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase.rpc('get_trip_by_share_token', {
    p_token: token,
  })
  if (error) throw error
  if (!data) return null
  const row = (typeof data === 'string' ? JSON.parse(data) : data) as TripRow
  if (!row?.id) return null
  return rowToTrip(row)
}
