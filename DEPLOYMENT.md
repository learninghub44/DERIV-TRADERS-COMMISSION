# DERIV TECH - Internal Deployment Guide

> **CONFIDENTIAL**: This document is for the DERIV TECH platform owner only.
> Do NOT share with customers or display in the application.

## Overview

DERIV TECH is a multi-tenant SaaS analytics platform for Deriv API application operators.

- **Customers**: Create accounts and connect their own Deriv applications
- **Platform Owner**: Manages infrastructure, deployment, and configuration

## Architecture

```
Customer Browser
        ↓
Cloudflare Workers (Next.js via @opennextjs/cloudflare)
        ↓
Neon PostgreSQL (single database, tenant isolation enforced in the app layer)
        ↓
Deriv API (OAuth 2.0 + PKCE, or manual API token, per customer)
```

## Prerequisites

- Cloudflare account
- Neon account (https://neon.tech)
- Resend account (https://resend.com) - for verification/reset emails
- Deriv developers account (https://developers.deriv.com)
- Node.js 18+ installed locally
- GitHub account

---

## Step 1: Create Neon Database

1. Go to https://neon.tech and sign up/login
2. Create a new project
3. Copy the connection string (looks like: `postgresql://username:password@endpoint.neon.tech/dbname?sslmode=require`)
4. Save this as `DATABASE_URL`

## Step 2: Create Resend Account

1. Go to https://resend.com and sign up/login
2. Verify a sending domain (already done: `derivtech.christech.co.ke`)
3. Create an API key
4. Save as `RESEND_API_KEY`

## Step 3: Run Database Migrations

1. Open Neon SQL editor
2. Run `neon/migrations/001_initial_schema.sql`, then `002_api_token_auth.sql`, then `003_platform_settings.sql`, in that order
3. Verify all tables are created — you should see a `users` table (not `profiles`)

## Step 4: Register Deriv Application

1. Go to https://developers.deriv.com
2. Register a new OAuth2 application
3. Set callback URL to: `https://your-domain.com/api/deriv/oauth/callback`
4. Note the `client_id` (this is a public client authenticated via PKCE - there's no client secret to save). You'll enter this at `/admin/settings` in Step 10, not as an environment variable.
5. Only if you separately maintain an app on the Legacy Deriv API (legacy-api.deriv.com), also note that app's `app_id` - it's optional and only needed to route legacy-platform users correctly

## Step 5: Configure Bootstrap Environment Variables

These three are the ONLY values that must be real environment variables - the app needs them before it can even reach the database that stores everything else. Create a `.env.local` file for local dev (never commit this) or set these on Cloudflare for production:

```bash
# Direct Neon connection
DATABASE_URL=postgresql://username:password@endpoint.neon.tech/dbname?sslmode=require

# Session signing
AUTH_SECRET=your-random-64-char-secret-here

# Encrypts customer Deriv credentials AND secret platform settings
# (e.g. the Resend API key you'll enter in Step 10)
ENCRYPTION_KEY=your-32-char-encryption-key-here
```

Everything else - Deriv `client_id`/legacy `app_id`/redirect URI, Resend API key, email sender, app URL - is configured later from `/admin/settings` (Step 10), not here. `.env.example` documents fallback env var names for these too, useful only for local dev before you've created an admin account.

## Step 6: Generate Secrets

```bash
# Generate AUTH_SECRET
openssl rand -hex 32

# Generate ENCRYPTION_KEY
openssl rand -hex 16
```

## Step 7: Install Dependencies

```bash
cd DERIV-TRADERS-COMMISSION
npm install
```

## Step 8: Test Locally

```bash
npm run dev
```

Test:
- Registration works
- Login works
- Deriv Integration page loads
- Connect Deriv initiates OAuth flow

## Step 9: Deploy to Cloudflare

### Option A: Automatic (recommended)

```bash
npx wrangler deploy
```

Wrangler will auto-detect Next.js and configure everything.

### Option B: Manual

1. Install Cloudflare adapter:
```bash
npm install @opennextjs/cloudflare wrangler
```

2. Build and deploy:
```bash
npm run deploy
```

## Step 10: Create Admin Account and Configure Platform Settings

1. Register a normal account through the app's `/register` page (any email/password)
2. Promote it to admin in the Neon SQL editor:
   ```sql
   UPDATE users SET role = 'super_admin' WHERE email = 'your-admin-email@example.com';
   ```
3. Sign in at `/admin/login` with that account
4. Go to `/admin/settings` and fill in:
   - **Deriv OAuth**: Client ID (from Step 4), Legacy App ID (only if applicable), Redirect URI (must match Step 4 exactly)
   - **Email (Resend)**: API key (from Step 2), From address (must use your verified Resend domain), App URL (your production domain)
5. Save both sections - customers can register and connect Deriv immediately after, with no further Cloudflare configuration needed

## Step 11: Configure Custom Domain

1. Go to Cloudflare Dashboard
2. Add your custom domain
3. Update DNS records
4. Update the **App URL** and **Deriv OAuth Redirect URI** at `/admin/settings` (Step 10) to match your production domain - no environment variables to touch

## Step 12: Update Deriv Application

1. Go to https://developers.deriv.com
2. Update your application's callback URL to production domain
3. Verify OAuth flow works in production

## Step 13: Test Production

- [ ] Registration works
- [ ] Login works
- [ ] Deriv OAuth flow works
- [ ] Data syncs correctly
- [ ] Multi-tenant isolation works (Customer A cannot see Customer B data)
- [ ] Admin dashboard works
- [ ] No secrets exposed to browser

---

## Customer Experience

When a customer signs up:

1. They create an account (email/password)
2. They create an organization
3. They go to Settings → Deriv Integration
4. They click "Connect Deriv"
5. They authorize through Deriv's official website
6. They're redirected back - connection shows "Connected"
7. Data starts syncing automatically

**The customer NEVER sees:**
- Database configuration
- Environment variables
- Cloudflare settings
- API keys or secrets
- SQL queries
- Source code

---

## Security Checklist

- [ ] `DATABASE_URL` is server-side only
- [ ] `AUTH_SECRET` is server-side only
- [ ] `ENCRYPTION_KEY` is server-side only
- [ ] `RESEND_API_KEY` is server-side only (or, if set via `/admin/settings` instead, it's encrypted at rest in `platform_settings`)
- [ ] Customer credentials are encrypted at rest
- [ ] Every API route checks the session and filters by `organization_id`
- [ ] No secrets in frontend JavaScript
- [ ] No secrets in console.log
- [ ] Audit logs don't contain sensitive data

---

## Monitoring

1. Check Cloudflare Workers logs for errors
2. Monitor Neon database performance
3. Check Deriv API rate limits
4. Review audit logs for suspicious activity
5. Monitor customer sync status

---

## Troubleshooting

### OAuth callback fails
- Verify the Redirect URI at `/admin/settings` matches exactly what's registered in the Deriv dashboard
- Check that the Client ID at `/admin/settings` matches your registered OAuth2 app's `client_id`
- Verify `AUTH_SECRET` is set

### Data not syncing
- Check customer's integration status in admin
- Verify Deriv access token is valid
- Check for API rate limiting

### Multi-tenant isolation breach
- Review database queries for proper `organization_id` filtering (isolation is enforced in the app layer, not via Postgres RLS)
- Check API routes for authorization checks (`getCurrentUser()` in `src/lib/auth.ts`)
