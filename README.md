# DERIV TECH

Multi-tenant SaaS analytics platform for Deriv API application operators. Customers connect their Deriv application, and DERIV TECH syncs and visualizes their markup, commissions, earnings, and trading activity.

## Stack

- **Next.js 15** (App Router) — deployed to **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Supabase** — auth + Postgres client (backed by a **Neon** Postgres database)
- **Tailwind CSS**
- **Vitest** for unit tests

## Architecture

```
Customer Browser
        ↓
Cloudflare Workers (Next.js via @opennextjs/cloudflare)
        ↓
Supabase (Auth + Database connection to Neon PostgreSQL)
        ↓
Neon PostgreSQL (single database, Row Level Security for tenant isolation)
        ↓
Deriv API (per-customer credentials, see "Connecting a Deriv account" below)
```

Every tenant-scoped table has Row Level Security enabled (see `supabase/migrations/`), so one organization's data is never visible to another at the database layer, independent of application-level checks.

## Connecting a Deriv account

Customers can connect in one of two ways:

1. **OAuth 2.0 + PKCE** (recommended) — the customer authorizes through Deriv's official login. Access/refresh tokens are stored encrypted, and access tokens are refreshed automatically in the background when they expire.
2. **Manual API token** — the customer generates a token themselves (Deriv → Settings → API token, `application_read` scope) and pastes it in along with their App ID. Simpler to set up, but there's no refresh token — if it's revoked or expires, the customer has to reconnect manually.

All stored Deriv credentials (`deriv_integrations.access_token` / `refresh_token`) are encrypted at rest with AES-256-GCM (`src/lib/encryption.ts`), keyed by `ENCRYPTION_KEY`. They are decrypted only server-side, immediately before a call to Deriv's API, and are never sent to the browser.

## Local development

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) Postgres database
- A [Supabase](https://supabase.com) project (pointed at your Neon database)
- A [Deriv developer](https://developers.deriv.com) OAuth application (for the OAuth flow)

### Setup

```bash
npm install
cp .env.example .env.local
# fill in .env.local with your own values - see below
```

Run the database migrations (`supabase/migrations/*.sql`, in order) against your Neon database via the Neon SQL editor or `psql`.

```bash
npm run dev       # start the dev server
npm run typecheck # tsc --noEmit
npm run lint       # eslint
npm run test       # vitest
npm run build       # production build
```

### Required environment variables

See `.env.example` for the full list with descriptions. At minimum for local dev:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase auth + DB access |
| `DATABASE_URL` | Direct Neon connection string |
| `NEXT_PUBLIC_DERIV_APP_ID` / `DERIV_CLIENT_SECRET` | Your platform's registered Deriv OAuth app |
| `NEXT_PUBLIC_DERIV_REDIRECT_URI` | Must exactly match the callback URL registered with Deriv |
| `ENCRYPTION_KEY` | 32-byte key (or any string, which is stretched via SHA-256) used to encrypt stored Deriv credentials. Generate with `openssl rand -hex 32`. |
| `AUTH_SECRET` | Reserved for session signing (Supabase currently manages sessions itself) |

Never commit `.env.local` — it's already in `.gitignore`.

## Deployment

Deploys to Cloudflare Workers:

```bash
npm run deploy   # opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

See `DEPLOYMENT.md` for the full internal deployment runbook (Neon/Supabase/Deriv app setup, custom domain, security checklist) — that file is for the platform owner only and should not be exposed to customers.

## Testing & CI

`tests/` holds unit tests for the encryption helper and the Deriv OAuth/PKCE helpers (`npm run test`, via Vitest). `.github/workflows/ci.yml` runs typecheck, lint, test, and build on every push/PR to `main`.

## Security notes

- Route protection for `/dashboard`, `/admin`, and other authenticated pages is enforced in `src/middleware.ts`.
- API routes independently verify the caller's session server-side (`createServerSupabaseClient().auth.getUser()`) and scope every query to the caller's `organization_id`.
- Deriv credentials are encrypted at rest (see above) and RLS-protected at the database layer.
- Audit-relevant actions (connect, disconnect, sync) are recorded in `audit_logs`.
