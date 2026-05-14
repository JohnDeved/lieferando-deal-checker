import { describe, expect, it } from 'vitest'
import { buildEmbed } from '../src/discord'
import type { Deal } from '../src/types'

const baseRestaurant = {
  id: '1',
  name: 'Just Smashed ®',
  uniqueName: 'just-smashed',
  url: 'https://www.lieferando.de/en/menu/just-smashed',
  logoUrl: 'https://example.test/logo.png',
  rating: { score: 4.4, count: 1234 },
  cuisines: ['American', 'Burgers'],
  minOrderCents: 1500,
  deliveryFeeCents: 199,
  etaMinutes: { lower: 30, upper: 45 },
  driveDistanceMeters: 2300,
  isOpen: true,
}

describe('buildEmbed', () => {
  it('renders a 2-for-1 embed with gold color and restaurant URL', () => {
    const deal: Deal = {
      id: 'x',
      offerType: 'two_for_one',
      offerText: '2-for-1',
      restaurant: baseRestaurant,
      foundAt: '2026-05-14T12:00:00.000Z',
    }
    const embed = buildEmbed(deal, 'Test Location') as any

    expect(embed.title).toBe('Just Smashed ®')
    expect(embed.url).toBe('https://www.lieferando.de/en/menu/just-smashed')
    expect(embed.color).toBe(0xf5a623)
    expect(embed.thumbnail).toEqual({ url: 'https://example.test/logo.png' })
    expect(embed.description).toContain('2-for-1')
    expect(embed.fields.find((f: any) => f.name === '🍽️ Cuisine').value).toBe('American, Burgers')
    expect(embed.fields.find((f: any) => f.name === '🚴 Delivery').value).toBe('30–45 min')
    expect(embed.fields.find((f: any) => f.name === '🧾 Min. order').value).toBe('€15.00')
    expect(embed.fields.find((f: any) => f.name === '💶 Delivery fee').value).toBe('€1.99')
    expect(embed.fields.find((f: any) => f.name === '📍 Distance').value).toBe('2.3 km')
  })

  it('renders a percentage embed with green color', () => {
    const deal: Deal = {
      id: 'x',
      offerType: 'percentage',
      offerText: '25% off selected items',
      percentage: 25,
      restaurant: baseRestaurant,
      foundAt: '2026-05-14T12:00:00.000Z',
    }
    const embed = buildEmbed(deal, 'Test Location') as any
    expect(embed.color).toBe(0x2ecc71)
    expect(embed.description).toContain('25%')
  })

  it('shows free delivery and closed status', () => {
    const deal: Deal = {
      id: 'x',
      offerType: 'two_for_one',
      offerText: '2-for-1',
      restaurant: {
        ...baseRestaurant,
        deliveryFeeCents: 0,
        isOpen: false,
        nextAvailability: '2026-05-15T11:00:00',
      },
      foundAt: '2026-05-14T12:00:00.000Z',
    }
    const embed = buildEmbed(deal, 'Test Location') as any
    expect(embed.fields.find((f: any) => f.name === '💶 Delivery fee').value).toBe('**Free**')
    expect(embed.fields.find((f: any) => f.name === 'Status').value).toContain('Currently closed')
  })
})
