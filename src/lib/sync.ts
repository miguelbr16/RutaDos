import type { Trip } from '../types'
import { DEFAULT_LOGISTICS, DEFAULT_ROUTE_STYLE } from '../types'
import { isSupabaseConfigured, supabase, type ProfileRow } from './supabase'

export type TripRow = {
  id: string
  couple_id: string
  title: string
  city: Trip['city']
  start_date: string
  end_date: string
  preferences: Trip['preferences']
  route_style: Trip['routeStyle'] & { logistics?: Trip['logistics'] }
  places: Trip['places']
  days: Trip['days']
  created_at: string
  updated_at: string
}

export function rowToTrip(row: TripRow): Trip {
  const style = row.route_style ?? DEFAULT_ROUTE_STYLE
  const logistics = style.logistics ?? DEFAULT_LOGISTICS
  const { logistics: _drop, ...routeStyle } = style as Trip['routeStyle'] & {
    logistics?: Trip['logistics']
  }
  return {
    id: row.id,
    title: row.title,
    city: row.city,
    startDate: row.start_date,
    endDate: row.end_date,
    preferences: row.preferences,
    routeStyle: { ...DEFAULT_ROUTE_STYLE, ...routeStyle },
    logistics,
    places: row.places ?? [],
    days: row.days ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function tripToRow(trip: Trip, coupleId: string): TripRow {
  return {
    id: trip.id,
    couple_id: coupleId,
    title: trip.title,
    city: trip.city,
    start_date: trip.startDate,
    end_date: trip.endDate,
    preferences: trip.preferences,
    route_style: { ...trip.routeStyle, logistics: trip.logistics },
    places: trip.places,
    days: trip.days,
    created_at: trip.createdAt,
    updated_at: trip.updatedAt,
  }
}

export async function fetchProfile(): Promise<ProfileRow | null> {
  if (!supabase) return null
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, couple_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchInviteCode(coupleId: string): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('couples')
    .select('invite_code')
    .eq('id', coupleId)
    .maybeSingle()
  if (error) throw error
  return data?.invite_code ?? null
}

export async function pullTrips(coupleId: string): Promise<Trip[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('couple_id', coupleId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data as TripRow[]).map(rowToTrip)
}

export async function upsertTrip(trip: Trip, coupleId: string): Promise<void> {
  if (!supabase) return
  const row = tripToRow(trip, coupleId)
  const { error } = await supabase.from('trips').upsert(row)
  if (error) throw error
}

export async function deleteRemoteTrip(tripId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('trips').delete().eq('id', tripId)
  if (error) throw error
}

export async function createCouple(displayName?: string): Promise<string> {
  if (!supabase) throw new Error('Supabase no configurado')
  const { data, error } = await supabase.rpc('create_couple', {
    p_display_name: displayName ?? null,
  })
  if (error) throw error
  return data as string
}

export async function joinCouple(code: string, displayName?: string): Promise<string> {
  if (!supabase) throw new Error('Supabase no configurado')
  const { data, error } = await supabase.rpc('join_couple', {
    p_code: code,
    p_display_name: displayName ?? null,
  })
  if (error) throw error
  return data as string
}

export function mergeTrips(local: Trip[], remote: Trip[]): Trip[] {
  const map = new Map<string, Trip>()
  for (const t of local) map.set(t.id, t)
  for (const t of remote) {
    const prev = map.get(t.id)
    if (!prev || Date.parse(t.updatedAt) >= Date.parse(prev.updatedAt)) {
      map.set(t.id, t)
    }
  }
  return [...map.values()].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  )
}

export { isSupabaseConfigured }
