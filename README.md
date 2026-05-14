# Lieferando Deal Checker

Cloudflare Worker cron job that checks a Lieferando delivery area for high-value food promotions and sends Discord alerts for new deals.

It calls Just Eat / Takeaway's public discovery API (`rest.api.eu-central-1.production.jet-external.com`) directly — no headless browser, no HTML scraping. Each restaurant comes with structured `deals[]` (offerType + description), so classification is just an enum check + percentage parse. For matched deals it then pulls `consumeroffers/notifications` to compute **real € savings** per item.

## What it tracks

- 2-for-1 / buy-one-get-one deals
- Percentage discounts of 20% or higher

Everything else (free delivery, StampCard, low percentages) is ignored.

## Setup

```bash
npm install

# 1. Wrangler config (KV namespace id is the only project-specific value here)
cp wrangler.toml.example wrangler.toml
npx wrangler kv namespace create DEALS_KV   # paste the id into wrangler.toml

# 2. Local env (do NOT commit .dev.vars)
cp .dev.vars.example .dev.vars
$EDITOR .dev.vars

# 3. Production secrets / vars
npx wrangler secret put DISCORD_WEBHOOK_URL
npx wrangler secret put POSTAL_CODE
npx wrangler secret put COUNTRY
npx wrangler secret put LOCATION_LABEL
```

`POSTAL_CODE` + `COUNTRY` (e.g. `de`) drive the discovery query. `LOCATION_LABEL` is a free-form string shown in the Discord embed footer.

## Development

```bash
npm test
npm run typecheck
npm run lint
npm run dev
```

Manual live check (against your deployed worker):

```bash
curl https://<your-worker>.workers.dev
```

Returns `{ ok: true, newDeals: [...] }`.

## Deploy

```bash
npm run deploy
```

Runs every 30 minutes via Cloudflare Cron Triggers.
