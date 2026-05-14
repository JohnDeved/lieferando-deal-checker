import { MENU_URL_BASE, type LocationConfig } from './config'
import type { RestaurantInfo } from './types'

const API_BASE = 'https://rest.api.eu-central-1.production.jet-external.com'

const API_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  Origin: 'https://www.lieferando.de',
  Referer: 'https://www.lieferando.de/',
  'x-jet-application': 'OneWeb',
  'x-je-auser': '00000000-0000-0000-0000-000000000000',
}

export interface RawOffer {
  restaurant: RestaurantInfo
  offerType: string
  description: string
}

interface ApiRestaurant {
  id: string
  name: string
  uniqueName: string
  isDelivery?: boolean
  logoUrl?: string
  rating?: { count?: number; starRating?: number }
  cuisines?: { name?: string }[]
  address?: { firstLine?: string; postalCode?: string; city?: string }
  driveDistanceMeters?: number
  deliveryEtaMinutes?: { rangeLower?: number; rangeUpper?: number; approximate?: number }
  deliveryCost?: number
  minimumDeliveryValue?: number
  availability?: {
    delivery?: {
      isOpen?: boolean
      isTemporarilyOffline?: boolean
      nextAvailability?: { from?: string }
    }
  }
  deals?: { description?: string; offerType?: string }[]
}

interface ApiResponse {
  restaurants?: ApiRestaurant[]
}

export async function fetchRawOffers(location: LocationConfig): Promise<RawOffer[]> {
  const params = new URLSearchParams({ ratingsOutOfFive: 'true', limit: '200' })
  if (location.latitude != null && location.longitude != null) {
    params.set('latitude', String(location.latitude))
    params.set('longitude', String(location.longitude))
  }
  const url = `${API_BASE}/discovery/${location.country}/restaurants/enriched/bypostcode/${location.postalCode}?${params.toString()}`

  const response = await fetch(url, { headers: API_HEADERS })
  if (!response.ok) {
    throw new Error(`Discovery API returned ${response.status} ${response.statusText}`)
  }

  const json = (await response.json()) as ApiResponse
  const restaurants = json.restaurants ?? []

  const result: RawOffer[] = []
  for (const r of restaurants) {
    // Skip restaurants that don't offer delivery to this address at all.
    if (r.isDelivery === false) continue
    for (const deal of r.deals ?? []) {
      const offerType = deal.offerType ?? ''
      const description = deal.description ?? ''
      if (!offerType) continue
      result.push({
        restaurant: toInfo(r, location),
        offerType,
        description,
      })
    }
  }
  return result
}

function toInfo(r: ApiRestaurant, location: LocationConfig): RestaurantInfo {
  return {
    id: r.id,
    name: r.name,
    uniqueName: r.uniqueName,
    url: r.uniqueName ? `${MENU_URL_BASE}/${r.uniqueName}` : location.targetUrl,
    logoUrl: r.logoUrl,
    rating: buildRating(r.rating),
    cuisines: buildCuisines(r.cuisines),
    address: buildAddress(r.address),
    minOrderCents: eurosToCents(r.minimumDeliveryValue),
    deliveryFeeCents: eurosToCents(r.deliveryCost),
    etaMinutes: buildEta(r.deliveryEtaMinutes),
    driveDistanceMeters: r.driveDistanceMeters,
    isOpen: r.availability?.delivery?.isOpen,
    nextAvailability: r.availability?.delivery?.nextAvailability?.from,
  }
}

function eurosToCents(value: number | undefined): number | undefined {
  return typeof value === 'number' ? Math.round(value * 100) : undefined
}

function buildRating(rating: ApiRestaurant['rating']): RestaurantInfo['rating'] {
  if (rating?.starRating == null || rating.count == null) return undefined
  return { score: rating.starRating, count: rating.count }
}

function buildCuisines(cuisines: ApiRestaurant['cuisines']): string[] | undefined {
  const names = cuisines
    ?.map(c => c?.name)
    .filter((n): n is string => typeof n === 'string' && n !== 'Offers' && n !== 'Angebote')
  return names && names.length > 0 ? names : undefined
}

function buildAddress(address: ApiRestaurant['address']): string | undefined {
  const parts = [address?.firstLine, address?.postalCode, address?.city].filter(
    (p): p is string => typeof p === 'string' && p.length > 0
  )
  return parts.length > 0 ? parts.join(', ') : undefined
}

function buildEta(eta: ApiRestaurant['deliveryEtaMinutes']): RestaurantInfo['etaMinutes'] {
  if (!eta) return undefined
  return { lower: eta.rangeLower, upper: eta.rangeUpper, approximate: eta.approximate }
}
