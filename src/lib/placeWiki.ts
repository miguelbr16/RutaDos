/** Breve descripción / historia desde Wikipedia (falla soft). */

export type PlaceBlurb = {
  title: string
  extract: string
  url: string
}

const cache = new Map<string, PlaceBlurb | null>()

function key(name: string, lat: number, lng: number) {
  return `${name.toLowerCase().slice(0, 48)}_${lat.toFixed(3)}_${lng.toFixed(3)}`
}

async function extractFromTitle(title: string, lang: 'es' | 'en'): Promise<PlaceBlurb | null> {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`)
  u.searchParams.set('action', 'query')
  u.searchParams.set('titles', title)
  u.searchParams.set('prop', 'extracts|info')
  u.searchParams.set('exintro', '1')
  u.searchParams.set('explaintext', '1')
  u.searchParams.set('exsentences', '3')
  u.searchParams.set('inprop', 'url')
  u.searchParams.set('format', 'json')
  u.searchParams.set('origin', '*')
  const res = await fetch(u.toString())
  if (!res.ok) return null
  const json = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        { title?: string; extract?: string; fullurl?: string; missing?: boolean }
      >
    }
  }
  const page = Object.values(json.query?.pages ?? {})[0]
  if (!page || page.missing || !page.extract?.trim()) return null
  return {
    title: page.title || title,
    extract: page.extract.trim().slice(0, 520),
    url: page.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  }
}

async function titleNear(lat: number, lng: number, lang: 'es' | 'en'): Promise<string | null> {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`)
  u.searchParams.set('action', 'query')
  u.searchParams.set('list', 'geosearch')
  u.searchParams.set('gscoord', `${lat}|${lng}`)
  u.searchParams.set('gsradius', '1200')
  u.searchParams.set('gslimit', '1')
  u.searchParams.set('format', 'json')
  u.searchParams.set('origin', '*')
  const res = await fetch(u.toString())
  if (!res.ok) return null
  const json = (await res.json()) as {
    query?: { geosearch?: Array<{ title: string }> }
  }
  return json.query?.geosearch?.[0]?.title ?? null
}

export async function fetchPlaceBlurb(
  name: string,
  lat: number,
  lng: number,
): Promise<PlaceBlurb | null> {
  const k = key(name, lat, lng)
  if (cache.has(k)) return cache.get(k) ?? null

  try {
    let blurb =
      (await extractFromTitle(name, 'es')) ||
      (await extractFromTitle(name, 'en'))

    if (!blurb) {
      const nearEs = await titleNear(lat, lng, 'es')
      if (nearEs) blurb = await extractFromTitle(nearEs, 'es')
    }
    if (!blurb) {
      const nearEn = await titleNear(lat, lng, 'en')
      if (nearEn) blurb = await extractFromTitle(nearEn, 'en')
    }

    cache.set(k, blurb)
    return blurb
  } catch {
    cache.set(k, null)
    return null
  }
}
