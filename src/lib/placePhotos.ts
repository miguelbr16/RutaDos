/** Fetch free thumbnails from Wikipedia/Wikimedia near a place. Fails soft. */

type WikiGeoItem = {
  pageid: number
  title: string
  thumbnail?: { source: string }
  original?: { source: string }
}

const cacheOne = new Map<string, string | null>()
const cacheMany = new Map<string, string[]>()

function cacheKey(name: string, lat: number, lng: number): string {
  return `${name.toLowerCase().slice(0, 40)}_${lat.toFixed(3)}_${lng.toFixed(3)}`
}

async function fetchThumbnailsForPageids(pageids: number[], size = 320): Promise<string[]> {
  if (!pageids.length) return []
  const img = new URL('https://en.wikipedia.org/w/api.php')
  img.searchParams.set('action', 'query')
  img.searchParams.set('pageids', pageids.join('|'))
  img.searchParams.set('prop', 'pageimages')
  img.searchParams.set('piprop', 'thumbnail')
  img.searchParams.set('pithumbsize', String(size))
  img.searchParams.set('format', 'json')
  img.searchParams.set('origin', '*')

  const imgRes = await fetch(img.toString())
  if (!imgRes.ok) return []
  const imgJson = (await imgRes.json()) as {
    query?: { pages?: Record<string, WikiGeoItem> }
  }
  const pages = Object.values(imgJson.query?.pages ?? {})
  const urls: string[] = []
  const seen = new Set<string>()
  for (const p of pages) {
    const src = p.thumbnail?.source
    if (!src || seen.has(src)) continue
    seen.add(src)
    urls.push(src)
  }
  return urls
}

async function fetchThumbnailByTitle(name: string): Promise<string | null> {
  try {
    const url = new URL('https://en.wikipedia.org/w/api.php')
    url.searchParams.set('action', 'query')
    url.searchParams.set('titles', name)
    url.searchParams.set('prop', 'pageimages')
    url.searchParams.set('piprop', 'thumbnail')
    url.searchParams.set('pithumbsize', '320')
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const json = (await res.json()) as {
      query?: { pages?: Record<string, WikiGeoItem> }
    }
    const page = Object.values(json.query?.pages ?? {})[0]
    return page?.thumbnail?.source ?? null
  } catch {
    return null
  }
}

/** Una foto (compat). */
export async function fetchPlacePhotoUrl(
  name: string,
  lat: number,
  lng: number,
): Promise<string | null> {
  const urls = await fetchPlacePhotoUrls(name, lat, lng, 1)
  return urls[0] ?? null
}

/** Varias fotos cercanas (geosearch Wikipedia). */
export async function fetchPlacePhotoUrls(
  name: string,
  lat: number,
  lng: number,
  limit = 3,
): Promise<string[]> {
  const key = `${cacheKey(name, lat, lng)}_${limit}`
  if (cacheMany.has(key)) return cacheMany.get(key) ?? []

  try {
    const geo = new URL('https://en.wikipedia.org/w/api.php')
    geo.searchParams.set('action', 'query')
    geo.searchParams.set('list', 'geosearch')
    geo.searchParams.set('gscoord', `${lat}|${lng}`)
    geo.searchParams.set('gsradius', '900')
    geo.searchParams.set('gslimit', String(Math.max(limit + 2, 6)))
    geo.searchParams.set('format', 'json')
    geo.searchParams.set('origin', '*')

    const geoRes = await fetch(geo.toString())
    if (!geoRes.ok) {
      const byTitle = await fetchThumbnailByTitle(name)
      const urls = byTitle ? [byTitle] : []
      cacheMany.set(key, urls)
      cacheOne.set(cacheKey(name, lat, lng), urls[0] ?? null)
      return urls
    }
    const geoJson = (await geoRes.json()) as {
      query?: { geosearch?: { pageid: number; title: string }[] }
    }
    const hits = geoJson.query?.geosearch ?? []
    if (!hits.length) {
      const byTitle = await fetchThumbnailByTitle(name)
      const urls = byTitle ? [byTitle] : []
      cacheMany.set(key, urls)
      cacheOne.set(cacheKey(name, lat, lng), urls[0] ?? null)
      return urls
    }

    let urls = await fetchThumbnailsForPageids(
      hits.map((h) => h.pageid),
      320,
    )
    if (!urls.length) {
      const byTitle = await fetchThumbnailByTitle(name)
      if (byTitle) urls = [byTitle]
    }
    urls = urls.slice(0, limit)
    cacheMany.set(key, urls)
    cacheOne.set(cacheKey(name, lat, lng), urls[0] ?? null)
    return urls
  } catch {
    cacheMany.set(key, [])
    cacheOne.set(cacheKey(name, lat, lng), null)
    return []
  }
}

export async function attachPhotosToStops<
  T extends { name: string; lat: number; lng: number; photoUrl?: string; photoUrls?: string[] },
>(stops: T[], limit = 12): Promise<T[]> {
  const out = [...stops]
  let n = 0
  for (let i = 0; i < out.length && n < limit; i++) {
    if (out[i].photoUrl || out[i].photoUrls?.length) continue
    const urls = await fetchPlacePhotoUrls(out[i].name, out[i].lat, out[i].lng, 3)
    if (urls.length) {
      out[i] = { ...out[i], photoUrl: urls[0], photoUrls: urls }
      n++
    }
  }
  return out
}
