# Mailchimp Bounce Monitor Worker

This project deploys a single Cloudflare Worker that:

- Receives Mailchimp audience webhook events at `POST /mailchimp/webhook/<secret>`
- Archives contacts immediately for unsubscribes, hard bounces, and abuse reports
- Runs a free daily Cloudflare Cron Trigger at `0 2 * * *`
- Recomputes lifetime soft-bounce totals across all sent campaigns with no database
- Archives any email that has soft-bounced in 3 or more campaigns total

## What It Does In Production

Once deployed, this project is fully automated:

- Mailchimp sends audience webhook events to the Worker immediately
- The Worker archives unsubscribes and hard bounces right away
- Cloudflare runs the daily cron automatically with no server to keep alive
- The daily cron recounts soft bounces across sent campaigns and archives any address that has soft-bounced in 3 or more campaigns total

It keeps running until you disable the Worker, remove the cron trigger, delete the Mailchimp webhook, revoke the Mailchimp API key, or the upstream APIs change.

## Files

- `src/index.ts`: Worker logic
- `wrangler.toml`: Worker config and daily cron
- `.dev.vars.example`: Local environment variable template
- `docs/OPERATIONS.md`: runbook, schedule, monitoring, and recovery steps
- `docs/SECURITY.md`: security model, hardening, and secret rotation notes

## Prerequisites

- Node.js 20+ installed
- A Cloudflare account on the free plan
- A Mailchimp API key
- Your Mailchimp server prefix, such as `us19`
- Your Mailchimp audience/list ID

## Setup On Windows ARM64

Use local Wrangler through `npx` only.

This project pins `wrangler` to `2.20.0` because newer Wrangler releases pull `workerd`, which does not currently ship a Windows ARM64 package.

1. `npm install`
2. `.\node_modules\.bin\wrangler.cmd login`
3. `npx wrangler secret put MAILCHIMP_API_KEY`
4. `npx wrangler secret put MAILCHIMP_SERVER_PREFIX`
5. `npx wrangler secret put MAILCHIMP_LIST_ID`
6. `npx wrangler secret put MAILCHIMP_WEBHOOK_SECRET`
7. `npx wrangler publish`

After publish, Cloudflare prints your Worker URL in this format:

`https://mailchimp-bounce-monitor.<your-subdomain>.workers.dev`

Your Mailchimp webhook URL will be:

`https://mailchimp-bounce-monitor.<your-subdomain>.workers.dev/mailchimp/webhook/<your-secret>`

## Optional Local Development

Create a local secrets file for `npx wrangler dev`:

1. Copy `.dev.vars.example` to `.dev.vars`
2. Fill in the real Mailchimp values
3. Run `npx wrangler dev`

## Mailchimp Webhook Setup

In Mailchimp:

1. Go to `Audience`
2. Open `Settings`
3. Open `Webhooks`
4. Click `Create New Webhook`
5. Paste your Worker webhook URL ending in `/mailchimp/webhook/<your-secret>`
6. Enable notifications for unsubscribe, cleaned/bounce, and abuse-style events if shown in your account
7. Save the webhook

The webhook is used for immediate archiving when someone unsubscribes, hard-bounces, or generates an abuse report.

## Security Notes

- Mailchimp audience webhooks do not provide signed request verification, so the Worker uses a secret webhook path to make the callback URL hard to guess.
- The public root endpoint no longer advertises the webhook path.
- The webhook only accepts `POST` with `application/json` or `application/x-www-form-urlencoded`.
- Oversized webhook payloads are rejected.
- Mailchimp API credentials and the webhook secret are stored as Cloudflare Worker secrets, not in source control.

## How The Worker Behaves

### Immediate webhook actions

- `unsubscribe`: archive immediately
- `abuse`: archive immediately
- `bounce` or `cleaned`: archive immediately as a hard bounce
- `soft_bounce`: acknowledged, then handled by the daily recount job

The webhook parser accepts both JSON test payloads and Mailchimp-style `application/x-www-form-urlencoded` payloads.

### Daily soft-bounce recount

The scheduled job:

1. Fetches all sent campaigns from `/campaigns`
2. Fetches paginated email activity from `/reports/{campaign_id}/email-activity`
3. Counts whether each email soft-bounced in each sent campaign
4. Archives any email with `soft_bounce_count >= 3`
5. Logs a summary like `Archived X emails for soft bounces`

There is no database. Counts are recomputed fresh every day from Mailchimp campaign report data.

## Schedule

Cloudflare cron triggers run in UTC. The current cron expression is `0 2 * * *`, which means:

- `2:00 AM UTC` every day
- `10:00 PM EDT` the previous evening while New York is on daylight saving time
- `9:00 PM EST` the previous evening while New York is on standard time

## Mailchimp Environment Variables

Set these as Worker secrets:

- `MAILCHIMP_API_KEY`
- `MAILCHIMP_SERVER_PREFIX`
- `MAILCHIMP_LIST_ID`
- `MAILCHIMP_WEBHOOK_SECRET`

## Testing

### Test the webhook with curl

```bash
curl -X POST https://your-worker.workers.dev/mailchimp/webhook/your-secret \
  -H "Content-Type: application/json" \
  -d '{"type":"unsubscribe","email":"test@example.com"}'
```

### Watch live logs

```powershell
.\node_modules\.bin\wrangler.cmd tail mailchimp-bounce-monitor --format pretty
```

### Trigger the daily logic manually

Cloudflare Cron Triggers run automatically after deploy. To test the soft-bounce logic without waiting for the next run:

```powershell
.\node_modules\.bin\wrangler.cmd dev
```

Then send a scheduled event from the local dev UI or wait for the deployed cron job to run at 2:00 AM UTC every day.

## Notes On Safety

- Archiving is idempotent. Re-archiving an already archived or missing member is treated as safe.
- Mailchimp API calls retry automatically on rate limits and transient `5xx` errors.
- Campaign and email-activity endpoints are paginated.
- Invalid or missing emails are rejected before archive attempts.
- Structured logs are written with `console.log(JSON.stringify(...))` for easy tracing.

## Additional Docs

- [docs/OPERATIONS.md](docs/OPERATIONS.md)
- [docs/SECURITY.md](docs/SECURITY.md)
