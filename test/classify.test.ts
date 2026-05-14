import { describe, expect, it } from 'vitest'
import { classifyDeal } from '../src/classify'

describe('classifyDeal', () => {
  it('treats Bogof offerType as 2-for-1 regardless of description', () => {
    expect(classifyDeal('Bogof', '2-for-1')?.offerType).toBe('two_for_one')
    expect(classifyDeal('Bogof', '')?.offerType).toBe('two_for_one')
  })

  it('classifies ItemLevelDiscount with N% description as percentage', () => {
    const result = classifyDeal('ItemLevelDiscount', '20% off selected items')
    expect(result?.offerType).toBe('percentage')
    expect(result?.percentage).toBe(20)
  })

  it('classifies Percent type with N% description as percentage', () => {
    const result = classifyDeal('Percent', 'Save 25% • Spend 30 €')
    expect(result?.offerType).toBe('percentage')
    expect(result?.percentage).toBe(25)
  })

  it('ignores percentage discounts below the threshold', () => {
    expect(classifyDeal('ItemLevelDiscount', '15% off selected items')).toBeNull()
  })

  it('ignores ItemLevelDiscount without a percentage value (e.g. fixed € off)', () => {
    expect(classifyDeal('ItemLevelDiscount', '2,20 € off selected items')).toBeNull()
  })

  it('ignores irrelevant offer types', () => {
    expect(classifyDeal('StampCard', '')).toBeNull()
    expect(classifyDeal('FreeItem', 'Free item offer')).toBeNull()
    expect(classifyDeal('', 'anything')).toBeNull()
  })
})
