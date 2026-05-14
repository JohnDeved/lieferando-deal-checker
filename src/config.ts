import { geocodeAddress } from './geocode'
import type { Env } from './types'

export const MIN_PERCENTAGE_DISCOUNT = 20
export const DEAL_TTL_DAYS = 7
export const MENU_URL_BASE = 'https://www.lieferando.de/en/menu'

export interface LocationConfig {
  postalCode: string
  country: string
  locationLabel: string
  targetUrl: string
  latitude?: number
  longitude?: number
}

// Resolves the runtime location config from env. Two modes:
//   1. ADDRESS set         -> geocode (cached 30d) -> postcode + lat/lng
//   2. POSTAL_CODE set     -> postcode-wide query, no per-address filter
export async function loadLocationConfig(env: Env): Promise<LocationConfig> {
  const locationLabel = required(env.LOCATION_LABEL, 'LOCATION_LABEL')

  if (env.ADDRESS && env.ADDRESS.trim().length > 0) {
    const geo = await geocodeAddress(env.ADDRESS.trim())
    return {
      postalCode: geo.postalCode,
      country: geo.countryCode,
      locationLabel,
      latitude: geo.latitude,
      longitude: geo.longitude,
      targetUrl: `https://www.lieferando.de/en/delivery/food/${geo.postalCode}`,
    }
  }

  const postalCode = required(env.POSTAL_CODE, 'POSTAL_CODE (or ADDRESS)')
  const country = required(env.COUNTRY, 'COUNTRY').toLowerCase()
  return {
    postalCode,
    country,
    locationLabel,
    targetUrl: `https://www.lieferando.de/en/delivery/food/${postalCode}`,
  }
}

function required(value: string | undefined, name: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value.trim()
}
