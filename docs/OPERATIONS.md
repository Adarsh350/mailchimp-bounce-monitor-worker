# Operations Runbook

## Automation Status

After deployment, this project is hands-off:

- Mailchimp audience events hit the secret webhook URL immediately
- Cloudflare runs the daily cron trigger automatically
- No database, VM, container, or scheduler has to be maintained

## Daily Schedule

The cron expression in `wrangler.toml` is:

`0 2 * * *`

Cloudflare interprets cron triggers in UTC.

- Daily run time: `2:00 AM UTC`
- New York daylight saving time: `10:00 PM EDT` on the previous calendar day
- New York standard time: `9:00 PM EST` on the previous calendar day

## What The Cron Job Does

1. Loads abuse reports for the configured audience and archives those contacts.
2. Loads all sent campaigns tied to the configured audience.
3. Loads email activity for each campaign.
4. Counts whether each email soft-bounced in each campaign.
5. Archives any email with soft bounces in 3 or more campaigns total.

## Monitoring

From the project directory:

```powershell
.\node_modules\.bin\wrangler.cmd tail mailchimp-bounce-monitor --format pretty
```

Useful endpoints:

- `GET /` returns a basic service OK response
- `GET /healthz` returns a basic health response
- The real webhook path includes a secret and should not be shared

## If Something Stops Working

Check these first:

1. The Worker is still published in Cloudflare.
2. The Mailchimp audience webhook still points to the secret Worker URL.
3. The Mailchimp API key secret is still valid.
4. The list ID and server prefix secrets are unchanged.
5. The cron trigger still exists in Cloudflare.

## Secret Rotation

If you rotate the Mailchimp API key:

```powershell
@'
NEW-MAILCHIMP-KEY
'@ | .\node_modules\.bin\wrangler.cmd secret put MAILCHIMP_API_KEY
.\node_modules\.bin\wrangler.cmd publish
```

If you rotate the webhook secret:

1. Update the Worker secret `MAILCHIMP_WEBHOOK_SECRET`
2. Publish the Worker again
3. Update the Mailchimp audience webhook URL to the new secret path

## Windows ARM64 Note

This repo pins `wrangler` to `2.20.0` because newer Wrangler releases pull `workerd`, which does not currently ship a Windows ARM64 package. Local maintenance commands should use the project-local binary if the global shim is broken:

```powershell
.\node_modules\.bin\wrangler.cmd <command>
```
