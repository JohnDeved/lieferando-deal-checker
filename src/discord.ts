import type { Deal, RestaurantInfo } from './types'

const COLOR_TWO_FOR_ONE = 0xf5a623
const COLOR_PERCENTAGE = 0x2ecc71

export async function sendDiscordNotification(
  webhookUrl: string,
  deal: Deal,
  locationLabel: string
): Promise<void> {
  if (!webhookUrl) {
    throw new Error('DISCORD_WEBHOOK_URL is not configured')
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ embeds: [buildEmbed(deal, locationLabel)] }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Discord webhook failed with status ${response.status}: ${body.slice(0, 500)}`)
  }
}

export function buildEmbed(deal: Deal, locationLabel: string): Record<string, unknown> {
  const r = deal.restaurant
  const headline =
    deal.offerType === 'two_for_one'
      ? '🍔 **2-for-1 Deal**'
      : `💸 **${deal.percentage}% Off** ${describePercentageScope(deal.offerText)}`.trim()

  const savingsLine = deal.savings?.summary ?? `_${fallbackSavings(deal)}_`

  const pickupOnly = r.deliversToAddress === false
  const descriptionParts = [headline, savingsLine]
  if (pickupOnly) {
    descriptionParts.push('📦 **Pickup only** — does not deliver to your address')
  }
  const description = descriptionParts.join('\n')

  const fields = buildFields(deal)

  const embed: Record<string, unknown> = {
    title: r.name,
    url: r.url,
    description,
    color: deal.offerType === 'two_for_one' ? COLOR_TWO_FOR_ONE : COLOR_PERCENTAGE,
    timestamp: deal.foundAt,
    footer: { text: `Lieferando · ${locationLabel}` },
    fields,
  }

  if (r.logoUrl) {
    embed.thumbnail = { url: r.logoUrl }
  }

  return embed
}

function buildFields(deal: Deal): { name: string; value: string; inline?: boolean }[] {
  const r = deal.restaurant
  const fields: { name: string; value: string; inline?: boolean }[] = []

  fields.push({
    name: 'Offer',
    value: `“${truncate(deal.offerText, 200)}”`,
    inline: false,
  })

  if (deal.savings?.detail && deal.savings.detail !== deal.offerText) {
    fields.push({
      name: 'Details',
      value: truncate(deal.savings.detail, 300),
      inline: false,
    })
  }

  if (r.cuisines && r.cuisines.length > 0) {
    fields.push({
      name: '🍽️ Cuisine',
      value: r.cuisines.slice(0, 3).join(', '),
      inline: true,
    })
  }

  if (r.rating) {
    const stars = '★'.repeat(Math.round(r.rating.score))
    fields.push({
      name: '⭐ Rating',
      value: `**${r.rating.score.toFixed(1)}** ${stars} (${r.rating.count.toLocaleString('en-US')})`,
      inline: true,
    })
  }

  const eta = formatEta(r.etaMinutes)
  if (eta) {
    fields.push({ name: '🚴 Delivery', value: eta, inline: true })
  }

  if (typeof r.minOrderCents === 'number') {
    fields.push({
      name: '🧾 Min. order',
      value: formatEuros(r.minOrderCents),
      inline: true,
    })
  }

  if (typeof r.deliveryFeeCents === 'number') {
    fields.push({
      name: '💶 Delivery fee',
      value: r.deliveryFeeCents === 0 ? '**Free**' : formatEuros(r.deliveryFeeCents),
      inline: true,
    })
  }

  if (typeof r.driveDistanceMeters === 'number') {
    fields.push({
      name: '📍 Distance',
      value: formatDistance(r.driveDistanceMeters),
      inline: true,
    })
  }

  const status = formatStatus(r)
  if (status) {
    fields.push({ name: 'Status', value: status, inline: false })
  }

  return fields
}

function fallbackSavings(deal: Deal): string {
  if (deal.offerType === 'two_for_one') {
    return 'Buy one, get one free'
  }
  return `${deal.percentage}% on eligible items`
}

function describePercentageScope(offerText: string): string {
  const lower = offerText.toLowerCase()
  if (/selected|ausgew[aä]hlt/u.test(lower)) return 'on selected items'
  if (/spend|ab\s+\d/u.test(lower)) return 'on qualifying orders'
  return ''
}

function formatEta(eta: RestaurantInfo['etaMinutes']): string | null {
  if (!eta) return null
  if (eta.lower != null && eta.upper != null) {
    return `${eta.lower}–${eta.upper} min`
  }
  if (eta.approximate != null) {
    return `~${eta.approximate} min`
  }
  return null
}

function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${meters} m`
}

function formatStatus(r: RestaurantInfo): string | null {
  if (r.isOpen === true) return '🟢 Open for delivery'
  if (r.isOpen === false) {
    if (r.nextAvailability) {
      const next = new Date(r.nextAvailability)
      if (!Number.isNaN(next.getTime())) {
        const formatted = next.toLocaleString('en-GB', {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Berlin',
        })
        return `🔴 Currently closed — opens **${formatted}**`
      }
    }
    return '🔴 Currently closed'
  }
  return null
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}
