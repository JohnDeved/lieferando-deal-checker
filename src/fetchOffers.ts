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

export interface ConsumerOfferMenuItem {
  id?: string
  roleType?: string
  menuItemType?: 'Product' | 'Category' | string
  discount?: {
    discountPercentage?: number
    discountedItemPrice?: number
    discountAmount?: number
  }
}

export interface ConsumerOffer {
  offerId?: string
  restaurantId: string
  description?: string
  offerType?: string
  consumerSegment?: string
  campaignId?: string
  offerMenuItems?: ConsumerOfferMenuItem[]
}

export async function fetchConsumerOffers(
  country: string,
  restaurantIds: string[]
): Promise<Map<string, ConsumerOffer[]>> {
  const out = new Map<string, ConsumerOffer[]>()
  if (restaurantIds.length === 0) return out

  const params = new URLSearchParams()
  for (const id of restaurantIds) params.append('restaurantIds', id)
  params.append('optionalProperties', 'offerMenuItems')

  const url = `${API_BASE}/consumeroffers/notifications/${country}?${params.toString()}`
  const response = await fetch(url, { headers: API_HEADERS })
  if (!response.ok) {
    throw new Error(`Consumer offers API returned ${response.status} ${response.statusText}`)
  }

  const json = (await response.json()) as { offerNotifications?: ConsumerOffer[] }
  for (const offer of json.offerNotifications ?? []) {
    if (!offer.restaurantId) continue
    const list = out.get(offer.restaurantId) ?? []
    list.push(offer)
    out.set(offer.restaurantId, list)
  }
  return out
}
