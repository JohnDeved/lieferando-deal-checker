import { describe, expect, it } from 'vitest'
import { computeSavings } from '../src/savings'
import type { ConsumerOffer } from '../src/fetchOffers'

describe('computeSavings', () => {
  it('computes the named free item for a Bogof deal', () => {
    const offer: ConsumerOffer = {
      restaurantId: 'x',
      offerType: 'Bogof',
      description: 'Buy one get one Pommes Frites free',
      offerMenuItems: [{ menuItemType: 'Product', discount: { discountPercentage: 100 } }],
    }
    const s = computeSavings(offer)
    expect(s?.summary).toContain('Pommes Frites')
    expect(s?.summary).toContain('free')
  })

  it('derives a per-item € savings range from discountedItemPrice + percentage', () => {
    const offer: ConsumerOffer = {
      restaurantId: 'x',
      offerType: 'ItemLevelDiscount',
      description: '20% off selected items',
      offerMenuItems: [
        {
          menuItemType: 'Product',
          discount: { discountPercentage: 20, discountedItemPrice: 2520 },
        },
        {
          menuItemType: 'Product',
          discount: { discountPercentage: 20, discountedItemPrice: 2760 },
        },
      ],
    }
    const s = computeSavings(offer)
    // 2520 / 0.8 - 2520 = 630 cents = €6.30 ; 2760/0.8 - 2760 = 690 cents = €6.90
    expect(s?.summary).toContain('€6.30')
    expect(s?.summary).toContain('€6.90')
    expect(s?.summary).toContain('2 eligible items')
    expect(s?.summary).toContain('−20%')
  })

  it('handles category-only ItemLevelDiscount', () => {
    const offer: ConsumerOffer = {
      restaurantId: 'x',
      offerType: 'ItemLevelDiscount',
      description: '20% off any: Donnerstag-Deals',
      offerMenuItems: [{ menuItemType: 'Category', discount: { discountPercentage: 20 } }],
    }
    const s = computeSavings(offer)
    expect(s?.summary).toContain('−20%')
    expect(s?.summary).toContain('Donnerstag-Deals')
  })

  it('handles fixed-amount discount', () => {
    const offer: ConsumerOffer = {
      restaurantId: 'x',
      offerType: 'ItemLevelDiscount',
      description: '2,20 € off any: Pide mit Sucuk und Ei',
      offerMenuItems: [{ menuItemType: 'Product', discount: { discountAmount: 220 } }],
    }
    const s = computeSavings(offer)
    expect(s?.summary).toContain('€2.20')
    expect(s?.summary).toContain('Pide mit Sucuk und Ei')
  })

  it('handles spend-based Percent deal', () => {
    const offer: ConsumerOffer = {
      restaurantId: 'x',
      offerType: 'Percent',
      description: 'Save 25% • Spend 30 €',
      offerMenuItems: [],
    }
    const s = computeSavings(offer)
    expect(s?.summary).toContain('25%')
    expect(s?.summary).toContain('€30.00')
    expect(s?.summary).toContain('€7.50')
  })
})
