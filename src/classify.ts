import { MIN_PERCENTAGE_DISCOUNT } from './config'
import type { OfferType } from './types'

export interface Classification {
  offerType: OfferType
  offerText: string
  percentage?: number
}

const PERCENTAGE = /\b([1-9][0-9])\s*%/u

export function classifyDeal(apiOfferType: string, description: string): Classification | null {
  const text = (description || '').replace(/\s+/gu, ' ').trim()

  if (apiOfferType === 'Bogof') {
    return { offerType: 'two_for_one', offerText: text || '2-for-1' }
  }

  if (apiOfferType === 'ItemLevelDiscount' || apiOfferType === 'Percent') {
    const match = text.match(PERCENTAGE)
    if (!match) return null
    const percentage = Number.parseInt(match[1], 10)
    if (percentage < MIN_PERCENTAGE_DISCOUNT) return null
    return { offerType: 'percentage', offerText: text, percentage }
  }

  return null
}
