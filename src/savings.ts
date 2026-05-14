import type { ConsumerOffer, ConsumerOfferMenuItem } from './fetchOffers'

export interface SavingsBreakdown {
  summary: string
  detail?: string
}

interface Stats {
  perItemSavings: number[]
  percentage: number | null
  productItems: number
  categoryItems: number
  fixedAmount: number | null
}

export function computeSavings(offer: ConsumerOffer): SavingsBreakdown | null {
  const type = offer.offerType ?? ''
  const desc = (offer.description ?? '').trim()

  if (type === 'Bogof') return computeBogof(offer, desc)
  if (type === 'ItemLevelDiscount' || type === 'Percent') {
    return computePercent(offer, desc)
  }
  return null
}

function computeBogof(offer: ConsumerOffer, description: string): SavingsBreakdown {
  const itemName = parseBogofItemName(description)
  const productItems = (offer.offerMenuItems ?? []).filter(i => i.menuItemType === 'Product').length

  if (itemName) {
    return {
      summary: `🎁 **${itemName}** free with any qualifying order`,
      detail: 'Pay for one, get the second of the same item at no extra cost.',
    }
  }
  if (productItems > 0) {
    return {
      summary: `🎁 Free item across ${productItems} eligible product${productItems === 1 ? '' : 's'}`,
      detail: 'Buy one, get one free on the eligible items.',
    }
  }
  return { summary: '🎁 Buy-one-get-one-free deal' }
}

function computePercent(offer: ConsumerOffer, description: string): SavingsBreakdown | null {
  const stats = collectStats(offer.offerMenuItems ?? [], description)

  return (
    fixedAmountSavings(stats, description) ??
    perItemRangeSavings(stats, description) ??
    categorySavings(stats, description) ??
    spendBasedSavings(stats, description) ??
    plainPercentSavings(stats)
  )
}

function collectStats(items: ConsumerOfferMenuItem[], description: string): Stats {
  const stats: Stats = {
    perItemSavings: [],
    percentage: null,
    productItems: 0,
    categoryItems: 0,
    fixedAmount: null,
  }

  for (const it of items) {
    if (it.menuItemType === 'Category') stats.categoryItems += 1
    if (it.menuItemType === 'Product') stats.productItems += 1

    const pct = it.discount?.discountPercentage
    const price = it.discount?.discountedItemPrice
    if (pct != null) stats.percentage = pct
    if (pct != null && pct > 0 && pct < 100 && typeof price === 'number') {
      stats.perItemSavings.push(price / (1 - pct / 100) - price)
    }
    if (stats.fixedAmount == null && typeof it.discount?.discountAmount === 'number') {
      stats.fixedAmount = it.discount.discountAmount
    }
  }

  if (stats.percentage == null) {
    const m = description.match(/([1-9][0-9]?)\s*%/u)
    if (m) stats.percentage = Number.parseInt(m[1], 10)
  }

  return stats
}

function fixedAmountSavings(stats: Stats, description: string): SavingsBreakdown | null {
  if (stats.fixedAmount == null) return null
  const target = parseTargetName(description)
  return {
    summary: `💸 Save **${formatEuros(stats.fixedAmount)}** on ${target ?? 'selected items'}`,
    detail: description || undefined,
  }
}

function perItemRangeSavings(stats: Stats, description: string): SavingsBreakdown | null {
  if (stats.percentage == null || stats.perItemSavings.length === 0) return null
  const min = Math.round(Math.min(...stats.perItemSavings))
  const max = Math.round(Math.max(...stats.perItemSavings))
  const range = min === max ? formatEuros(min) : `${formatEuros(min)}–${formatEuros(max)}`
  const noun = stats.productItems === 1 ? 'item' : 'items'
  return {
    summary: `💸 Save **${range}** per item on **${stats.productItems} eligible ${noun}** (−${stats.percentage}%)`,
    detail: description || undefined,
  }
}

function categorySavings(stats: Stats, description: string): SavingsBreakdown | null {
  if (stats.percentage == null || stats.categoryItems === 0) return null
  const target = parseTargetName(description)
  const fallback = `${stats.categoryItems} ${stats.categoryItems === 1 ? 'category' : 'categories'} of items`
  return {
    summary: `💸 **−${stats.percentage}%** on ${target ?? fallback}`,
    detail: description || undefined,
  }
}

function spendBasedSavings(stats: Stats, description: string): SavingsBreakdown | null {
  if (stats.percentage == null) return null
  const m = description.match(/(?:Spend|Ab)\s*([0-9]+(?:[.,][0-9]+)?)\s*€/iu)
  if (!m) return null
  const minSpend = Number.parseFloat(m[1].replace(',', '.'))
  const saving = (minSpend * stats.percentage) / 100
  return {
    summary: `💸 Save **${stats.percentage}%** on orders ≥ €${minSpend.toFixed(2)} (≈ €${saving.toFixed(2)} on a €${minSpend.toFixed(2)} order)`,
  }
}

function plainPercentSavings(stats: Stats): SavingsBreakdown | null {
  if (stats.percentage == null) return null
  return { summary: `💸 **−${stats.percentage}%** on selected items` }
}

function parseBogofItemName(description: string): string | null {
  const m = description.match(/^Buy one get one\s+(.+?)\s+free$/iu)
  return m ? m[1].trim() : null
}

function parseTargetName(description: string): string | null {
  const m = description.match(/(?:%|€)\s*off\s+any:\s*(.+)$/iu)
  return m ? `**${m[1].trim()}**` : null
}

function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`
}
