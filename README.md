# DealFairway

An AI-powered business app for Ontario real estate agents. Phase 1: client CRM,
inquiry-to-task, gesture-based tasks, installable phone app (PWA).

Project rules for Claude Code live in [CLAUDE.md](CLAUDE.md). Build progress: [docs/phase-1-plan.md](docs/phase-1-plan.md).

## Run it on your computer

1. Install **Node.js LTS** (v22+) and the **Supabase CLI**.
2. Install packages:
   ```bash
   npm install
   ```
3. Copy the environment file and fill in your **dealfairway-dev** project's values
   (Supabase → Project Settings → API → Project URL and `anon` public key):
   ```bash
   cp .env.example .env.local
   ```
4. Apply the database migrations to your dev project (one time, then after every new migration):
   ```bash
   supabase login
   supabase link --project-ref <your-dev-project-ref>
   supabase db push
   ```
5. Start the app:
   ```bash
   npm run dev
   ```
   Open http://localhost:5173. To try it on your phone on the same Wi-Fi, run
   `npm run dev -- --host` and open the "Network" address it prints.

In Supabase → Authentication → URL Configuration, add `http://localhost:5173/**`
(and later `https://app.dealfairway.ca/**`) to the redirect URLs so magic links and
password resets come back to the app.

## Tests

| Command | What it runs |
|---|---|
| `npm test` | Unit tests (Vitest). Database tests are skipped unless `TEST_DATABASE_URL` is set. |
| `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db` | Row Level Security tests against a local Postgres (creates and drops a throwaway database). |
| `npm run test:e2e` | Playwright end-to-end tests on a phone-sized browser. Supabase is faked, so no project is needed. |
| `npm run build` | Type-check and production build. |

## Importing your existing clients

In the app: **More → Import contacts**, choose the CSV exported from your old CRM, check the
column matches, review duplicates, then import. Your CSV stays on your device until you
confirm, and goes only to your own Supabase project. **Never commit client CSV files to this repo.**

Per the Phase 1 plan, import real clients into **dealfairway-prod** once it exists
(Prompt 19). The dev project is for made-up test contacts.

## Deploying

See [docs/deploy-cloudflare.md](docs/deploy-cloudflare.md).
