import { DEAL_TTL_DAYS } from './config'
import type { Deal, OfferType } from './types'

const SECONDS_PER_DAY = 24 * 60 * 60

export async function hasSeenDeal(kv: KVNamespace, dealId: string): Promise<boolean> {
  return (await kv.get(dealId)) !== null
}

export async function markDealAsSeen(kv: KVNamespace, deal: Deal): Promise<void> {
  await kv.put(
    deal.id,
    JSON.stringify({
      restaurant: deal.restaurant.name,
      offerText: deal.offerText,
      foundAt: deal.foundAt,
    }),
    { expirationTtl: DEAL_TTL_DAYS * SECONDS_PER_DAY }
  )
}

export function createDealId(deal: {
  restaurant: string
  offerType: OfferType
  percentage?: number
}): string {
  const slug = slugify(deal.restaurant)
  const value =
    deal.offerType === 'two_for_one' ? 'two_for_one' : `percentage:${deal.percentage ?? 'unknown'}`
  return `deal:${slug}:${value}`
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
  return slug || 'unknown-restaurant'
}
