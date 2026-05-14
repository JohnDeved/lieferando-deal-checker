import type { Env } from './types'

export const MIN_PERCENTAGE_DISCOUNT = 20
export const DEAL_TTL_DAYS = 7
export const MENU_URL_BASE = 'https://www.lieferando.de/en/menu'

export interface LocationConfig {
  postalCode: string
  country: string
  locationLabel: string
  targetUrl: string
}

export function loadLocationConfig(env: Env): LocationConfig {
  const postalCode = required(env.POSTAL_CODE, 'POSTAL_CODE')
  const country = required(env.COUNTRY, 'COUNTRY').toLowerCase()
  const locationLabel = required(env.LOCATION_LABEL, 'LOCATION_LABEL')
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
