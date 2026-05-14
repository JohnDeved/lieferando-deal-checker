import { classifyDeal } from './classify'
import { loadLocationConfig } from './config'
import { sendDiscordNotification } from './discord'
import { fetchRawOffers, type RawOffer } from './fetchDeals'
import { fetchConsumerOffers, type ConsumerOffer } from './fetchOffers'
import { createDealId, hasSeenDeal, markDealAsSeen } from './kv'
import { computeSavings } from './savings'
import type { Deal, Env } from './types'

const RELEVANT_TYPES = new Set(['Bogof', 'ItemLevelDiscount', 'Percent'])

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runCheck(env).catch(err => console.error(err)))
  },

  async fetch(_request: Request, env: Env): Promise<Response> {
    try {
      const newDeals = await runCheck(env)
      return Response.json({ ok: true, newDeals })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return Response.json({ ok: false, error: message }, { status: 502 })
    }
  },
}

async function runCheck(env: Env): Promise<Deal[]> {
  const location = loadLocationConfig(env)
  const foundAt = new Date().toISOString()
  const rawOffers = await fetchRawOffers(location)

  // Bulk-fetch detailed consumer offers for restaurants with relevant deals
  const candidateRestaurantIds = [
    ...new Set(
      rawOffers
        .filter(o => RELEVANT_TYPES.has(o.offerType))
        .map(o => o.restaurant.id)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const consumerOffersByRestaurant = await fetchConsumerOffers(
    location.country,
    candidateRestaurantIds
  )

  const newDeals: Deal[] = []
  const sentIds = new Set<string>()

  for (const raw of rawOffers) {
    const classified = classifyDeal(raw.offerType, raw.description)
    if (!classified) continue

    const id = createDealId({
      restaurant: raw.restaurant.name,
      offerType: classified.offerType,
      percentage: classified.percentage,
    })

    if (sentIds.has(id)) continue
    if (await hasSeenDeal(env.DEALS_KV, id)) continue

    const detailedOffer = matchConsumerOffer(raw, consumerOffersByRestaurant)
    const savings = detailedOffer ? (computeSavings(detailedOffer) ?? undefined) : undefined

    const deal: Deal = {
      id,
      offerType: classified.offerType,
      offerText: detailedOffer?.description?.trim() || classified.offerText,
      percentage: classified.percentage,
      restaurant: raw.restaurant,
      foundAt,
      savings,
    }

    await sendDiscordNotification(env.DISCORD_WEBHOOK_URL, deal, location.locationLabel)
    await markDealAsSeen(env.DEALS_KV, deal)
    sentIds.add(id)
    newDeals.push(deal)
  }

  console.log(`Fetched ${rawOffers.length} raw offers, ${newDeals.length} new relevant deals`)
  return newDeals
}

function matchConsumerOffer(
  raw: RawOffer,
  byRestaurant: Map<string, ConsumerOffer[]>
): ConsumerOffer | null {
  const { id } = raw.restaurant
  if (!id) return null
  const offers = byRestaurant.get(id) ?? []
  return offers.find(o => o.offerType === raw.offerType) ?? null
}
