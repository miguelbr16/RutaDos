/** Meteo diario gratis (Open-Meteo, sin API key). */

export type DayWeather = {
  date: string
  label: string
  tempMax: number
  tempMin: number
  code: number
}

const cache = new Map<string, DayWeather>()

function weatherLabel(code: number): string {
  if (code === 0) return 'Despejado'
  if (code <= 3) return 'Parcialmente nublado'
  if (code <= 48) return 'Niebla / bruma'
  if (code <= 57) return 'Llovizna'
  if (code <= 67) return 'Lluvia'
  if (code <= 77) return 'Nieve'
  if (code <= 82) return 'Chubascos'
  if (code <= 99) return 'Tormenta'
  return 'Variable'
}

export async function fetchDayWeather(
  lat: number,
  lng: number,
  dateISO: string,
): Promise<DayWeather | null> {
  const key = `${lat.toFixed(2)}_${lng.toFixed(2)}_${dateISO}`
  if (cache.has(key)) return cache.get(key)!

  try {
    const u = new URL('https://api.open-meteo.com/v1/forecast')
    u.searchParams.set('latitude', String(lat))
    u.searchParams.set('longitude', String(lng))
    u.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min')
    u.searchParams.set('timezone', 'auto')
    u.searchParams.set('start_date', dateISO)
    u.searchParams.set('end_date', dateISO)

    const res = await fetch(u.toString())
    if (!res.ok) return null
    const json = (await res.json()) as {
      daily?: {
        time?: string[]
        weathercode?: number[]
        temperature_2m_max?: number[]
        temperature_2m_min?: number[]
      }
    }
    const i = json.daily?.time?.indexOf(dateISO) ?? 0
    const code = json.daily?.weathercode?.[i]
    const tmax = json.daily?.temperature_2m_max?.[i]
    const tmin = json.daily?.temperature_2m_min?.[i]
    if (code == null || tmax == null || tmin == null) return null

    const w: DayWeather = {
      date: dateISO,
      label: weatherLabel(code),
      tempMax: Math.round(tmax),
      tempMin: Math.round(tmin),
      code,
    }
    cache.set(key, w)
    return w
  } catch {
    return null
  }
}

export function weatherSuggestsIndoor(code: number): boolean {
  return code >= 51 // lluvia / nieve / tormenta
}
