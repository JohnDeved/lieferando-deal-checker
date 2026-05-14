import { describe, expect, it } from 'vitest'
import { createDealId } from '../src/kv'

describe('createDealId', () => {
  it('produces stable ids for the same restaurant + offer', () => {
    const a = createDealId({
      restaurant: 'Just Smashed ®',
      offerType: 'two_for_one',
    })
    const b = createDealId({
      restaurant: 'Just Smashed ®',
      offerType: 'two_for_one',
    })
    expect(a).toBe(b)
  })

  it('differentiates percentage values', () => {
    const a = createDealId({
      restaurant: 'Pizza Place',
      offerType: 'percentage',
      percentage: 20,
    })
    const b = createDealId({
      restaurant: 'Pizza Place',
      offerType: 'percentage',
      percentage: 30,
    })
    expect(a).not.toBe(b)
  })
})
