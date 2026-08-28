# DERIV TECH

Multi-tenant SaaS analytics platform for Deriv API application operators. Customers connect their Deriv application, and DERIV TECH syncs and visualizes their markup, commissions, earnings, and trading activity.

## Stack

- **Next.js 15** (App Router) — deployed to **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Neon PostgreSQL** — accessed directly via `@neondatabase/serverless`, no Supabase involved
- Custom auth: bcrypt password hashing + signed JWT session cookies (`src/lib/auth.ts`)
- **Resend** — verification and password-reset emails (`src/lib/email.ts`)
- **Tailwind CSS**
- **Vitest** for unit tests

## Architecture

```
Customer Browser
        ↓
Cloudflare Workers (Next.js via @opennextjs/cloudflare)
        ↓
Neon PostgreSQL (single database, tenant isolation enforced in the app layer)
        ↓
Deriv API (per-customer credentials, see "Connecting a Deriv account" below)
```

Tenant isolation is enforced in the application layer — every API route verifies the
caller's session server-side and scopes queries to the caller's `organization_id`
(see `src/lib/auth.ts` and `src/middleware.ts`). Neon has no `auth.uid()` /
Supabase Auth integration, so there is no database-level Row Level Security here;
an earlier draft of this project used Supabase for that, but the project moved to
a plain Neon connection with custom auth, and Postgres RLS was never carried over.

## Connecting a Deriv account

Customers can connect in one of two ways:

1. **OAuth 2.0 + PKCE** (recommended) — the customer authorizes through Deriv's official login. Access/refresh tokens are stored encrypted, and access tokens are refreshed automatically in the background when they expire.
2. **Manual API token** — the customer generates a token themselves (Deriv → Settings → API token, `application_read` scope) and pastes it in along with their App ID. Simpler to set up, but there's no refresh token — if it's revoked or expires, the customer has to reconnect manually.

All stored Deriv credentials (`deriv_integrations.access_token` / `refresh_token`) are encrypted at rest with AES-256-GCM (`src/lib/encryption.ts`), keyed by `ENCRYPTION_KEY`. They are decrypted only server-side, immediately before a call to Deriv's API, and are never sent to the browser.

## Local development

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) Postgres database
- A [Resend](https://resend.com) account (for verification/reset emails — optional for local dev, see below)
- A [Deriv developer](https://developers.deriv.com) OAuth application (for the OAuth flow)

### Setup

```bash
npm install
cp .env.example .env.local
# fill in .env.local with your own values - see below
```

Run the database migrations (`neon/migrations/*.sql`, in order) against your Neon database via the Neon SQL editor or `psql`.

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
| `DATABASE_URL` | Direct Neon connection string |
| `AUTH_SECRET` | JWT signing secret for session cookies (`src/lib/auth.ts`). Generate with `openssl rand -hex 32`. |
| `RESEND_API_KEY` | Sends verification/reset emails. If unset, links are logged to the server console instead — auth still works locally, just without real email delivery. |
| `NEXT_PUBLIC_DERIV_APP_ID` / `DERIV_CLIENT_SECRET` | Your platform's registered Deriv OAuth app |
| `NEXT_PUBLIC_DERIV_REDIRECT_URI` | Must exactly match the callback URL registered with Deriv |
| `ENCRYPTION_KEY` | 32-byte key (or any string, which is stretched via SHA-256) used to encrypt stored Deriv credentials. Generate with `openssl rand -hex 32`. |

Never commit `.env.local` — it's already in `.gitignore`.

## Deployment

Deploys to Cloudflare Workers:

```bash
npm run deploy   # opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

See `DEPLOYMENT.md` for the full internal deployment runbook (Neon/Resend/Deriv app setup, custom domain, security checklist) — that file is for the platform owner only and should not be exposed to customers.

## Testing & CI

`tests/` holds unit tests for the encryption helper and the Deriv OAuth/PKCE helpers (`npm run test`, via Vitest). `.github/workflows/ci.yml` runs typecheck, lint, test, and build on every push/PR to `main`.

## Security notes

- Route protection for `/dashboard`, `/admin`, and other authenticated pages is enforced in `src/middleware.ts`.
- API routes independently verify the caller's session server-side (`getCurrentUser()` in `src/lib/auth.ts`, backed by a signed JWT cookie) and scope every query to the caller's `organization_id`.
- Deriv credentials are encrypted at rest (see above). Tenant isolation is enforced in the application layer, not via Postgres RLS (see "Architecture" above).
- Audit-relevant actions (connect, disconnect, sync) are recorded in `audit_logs`.
