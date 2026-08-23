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
Supabase (Auth + Database connection to Neon PostgreSQL)
        ↓
Neon PostgreSQL (single database, RLS for tenant isolation)
        ↓
Deriv API (OAuth 2.0 + PKCE per customer)
```

## Prerequisites

- Cloudflare account
- Neon account (https://neon.tech)
- Supabase account (https://supabase.com) - for auth and database connection
- Deriv developers account (https://developers.deriv.com)
- Node.js 18+ installed locally
- GitHub account

---

## Step 1: Create Neon Database

1. Go to https://neon.tech and sign up/login
2. Create a new project
3. Copy the connection string (looks like: `postgresql://username:password@endpoint.neon.tech/dbname?sslmode=require`)
4. Save this as `DATABASE_URL`

## Step 2: Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Create a new project
3. Go to Settings → Database
4. Under "Connection string", copy the URI
5. Replace the placeholder with your Neon connection details
6. Save as `NEXT_PUBLIC_SUPABASE_URL`

## Step 3: Run Database Migrations

1. Open Neon SQL editor
2. Copy and run the contents of `supabase/migrations/001_initial_schema.sql`
3. Verify all tables are created

## Step 4: Register Deriv Application

1. Go to https://developers.deriv.com
2. Register a new OAuth2 application
3. Set callback URL to: `https://your-domain.com/api/deriv/oauth/callback`
4. Save the App ID and Client Secret

## Step 5: Configure Environment Variables

Create a `.env.local` file (never commit this):

```bash
# Supabase (connects to Neon)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Direct Neon connection
DATABASE_URL=postgresql://username:password@endpoint.neon.tech/dbname?sslmode=require

# Authentication
AUTH_SECRET=your-random-64-char-secret-here

# Deriv Platform Credentials
NEXT_PUBLIC_DERIV_APP_ID=your_deriv_app_id
DERIV_CLIENT_SECRET=your_deriv_client_secret

# Application URLs
APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=DERIV TECH
NEXT_PUBLIC_DERIV_REDIRECT_URI=https://your-domain.com/api/deriv/oauth/callback

# Encryption
ENCRYPTION_KEY=your-32-char-encryption-key-here
```

## Step 6: Generate Secrets

```bash
# Generate AUTH_SECRET
openssl rand -hex 32

# Generate ENCRYPTION_KEY
openssl rand -hex 16
```

## Step 7: Install Dependencies

```bash
cd deriv-partner-hub
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

## Step 10: Configure Custom Domain

1. Go to Cloudflare Dashboard
2. Add your custom domain
3. Update DNS records
4. Update environment variables with production URL:
   - `APP_URL=https://derivtech.example.com`
   - `NEXT_PUBLIC_APP_URL=https://derivtech.example.com`
   - `NEXT_PUBLIC_DERIV_REDIRECT_URI=https://derivtech.example.com/api/deriv/oauth/callback`

## Step 11: Update Deriv Application

1. Go to https://developers.deriv.com
2. Update your application's callback URL to production domain
3. Verify OAuth flow works in production

## Step 12: Test Production

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
- [ ] `DERIV_CLIENT_SECRET` is server-side only
- [ ] Customer credentials are encrypted at rest
- [ ] RLS policies enforce tenant isolation
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
- Verify callback URL matches exactly in Deriv dashboard
- Check that `DERIV_CLIENT_SECRET` is correct
- Verify `AUTH_SECRET` is set

### Data not syncing
- Check customer's integration status in admin
- Verify Deriv access token is valid
- Check for API rate limiting

### Multi-tenant isolation breach
- Immediately check RLS policies are active
- Review database queries for proper `organization_id` filtering
- Check API routes for authorization checks
