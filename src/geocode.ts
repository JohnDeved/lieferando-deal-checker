// Geocodes a free-form address via the public Nominatim service.
// Cached aggressively in the Cloudflare cache (30 days) — so under normal
// operation we hit Nominatim at most once per address per month.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30

export interface GeocodeResult {
  latitude: number
  longitude: number
  postalCode: string
  countryCode: string
  displayName: string
}

interface NominatimHit {
  lat: string
  lon: string
  display_name: string
  address?: { postcode?: string; country_code?: string }
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const url = `${NOMINATIM_URL}?${new URLSearchParams({
    q: address,
    format: 'json',
    addressdetails: '1',
    limit: '1',
  }).toString()}`

  const cacheKey = new Request(url, { method: 'GET' })
  const cache = (caches as unknown as { default: Cache }).default
  const cached = await cache.match(cacheKey)
  const response =
    cached ??
    (await fetch(url, {
      headers: {
        'User-Agent':
          'lieferando-deal-checker (https://github.com/JohnDeved/lieferando-deal-checker)',
        Accept: 'application/json',
      },
    }))

  if (!response.ok) {
    throw new Error(`Nominatim returned ${response.status} ${response.statusText}`)
  }

  if (!cached) {
    const toCache = new Response(response.clone().body, response)
    toCache.headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`)
    await cache.put(cacheKey, toCache)
  }

  const hits = (await response.json()) as NominatimHit[]
  const hit = hits[0]
  if (!hit) throw new Error(`Could not geocode address: ${address}`)

  const postcode = hit.address?.postcode
  const countryCode = hit.address?.country_code
  if (!postcode || !countryCode) {
    throw new Error(`Geocoded address is missing postcode/country: ${hit.display_name}`)
  }

  return {
    latitude: Number.parseFloat(hit.lat),
    longitude: Number.parseFloat(hit.lon),
    postalCode: postcode,
    countryCode: countryCode.toLowerCase(),
    displayName: hit.display_name,
  }
}
