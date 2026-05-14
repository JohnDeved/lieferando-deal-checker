export type OfferType = 'two_for_one' | 'percentage'

export interface RestaurantInfo {
  id?: string
  name: string
  uniqueName?: string
  url: string
  logoUrl?: string
  rating?: { score: number; count: number }
  cuisines?: string[]
  address?: string
  minOrderCents?: number
  deliveryFeeCents?: number
  etaMinutes?: { lower?: number; upper?: number; approximate?: number }
  driveDistanceMeters?: number
  isOpen?: boolean
  nextAvailability?: string
}

export interface Deal {
  id: string
  offerType: OfferType
  offerText: string
  percentage?: number
  restaurant: RestaurantInfo
  foundAt: string
  savings?: { summary: string; detail?: string }
}

export interface Env {
  DEALS_KV: KVNamespace
  DISCORD_WEBHOOK_URL: string
  POSTAL_CODE?: string
  COUNTRY?: string
  LOCATION_LABEL: string
  ADDRESS?: string
}
