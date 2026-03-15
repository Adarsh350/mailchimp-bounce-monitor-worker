# Security Notes

## Current Hardening

- Cloudflare secrets store the Mailchimp API key, server prefix, list ID, and webhook secret.
- The Mailchimp webhook uses a secret URL path instead of a predictable public callback path.
- The public root endpoint does not advertise the webhook path.
- The webhook only accepts `POST` for real event processing.
- Unsupported content types are rejected.
- Oversized webhook requests are rejected.
- Responses use `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
- Mailchimp archive operations are idempotent, so replaying the same archive action is safe.

## Important Limitation

Mailchimp audience webhooks do not provide signed request verification in the same way some other webhook products do. Because of that, the best practical protection here is:

- keep the webhook URL secret
- never publish the secret path
- rotate the secret if you think it was exposed

## Immediate Recommendation

The Mailchimp API key used during setup should be treated as exposed because it was shared outside Mailchimp. Rotate it in Mailchimp and then update the Worker secret.

## What Not To Commit

Never commit:

- `.dev.vars`
- actual Mailchimp API keys
- the production webhook secret value

## Public Repo Safety

This codebase is safe to publish as long as:

- only example values are stored in the repo
- the production webhook secret is not written into docs
- production API keys are rotated if they were ever pasted elsewhere
