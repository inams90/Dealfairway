# DealFairway

DealFairway is an AI-powered business app for Ontario real estate agents.

## Phase 1 scope
Client CRM, inquiry-to-task, gesture-based tasks, installable PWA.
Full plan: see `docs/phase-1-plan.md` (Prompts 1–19). Progress is tracked there.

## Stack
React + TypeScript + Vite, Tailwind CSS (v4, theme tokens in `src/index.css`),
Supabase (Postgres, Auth, Storage, Edge Functions), hosted on Cloudflare Pages.
Vitest for unit tests, Playwright for end-to-end tests.

## Rules
- Every table has a `user_id` column and Row Level Security so users only see their own rows.
- Never put secret keys in front-end code; use environment variables. Only `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_ANON_KEY` (public by design) may be read in the browser.
- All database changes go through Supabase migration files in `/supabase/migrations`.
  Never edit a migration that has already been applied to prod — add a new one.
- Mobile-first design: every screen must work one-handed on a phone (primary actions
  in the bottom half, tap targets at least 44px).
- Brand (from the official logo kit, `docs/brand/colour-specifications.txt`): Forest `#143D31`,
  Grass `#568238`, Ivory `#F8F6EF`, Red `#C43C34`. Use the Tailwind tokens `brand-deep`,
  `brand-fairway`, `brand-cream`, `brand-red`.
- Logos live in `public/brand/` (wordmark.svg for light backgrounds, mark-white.svg for the
  dark top bar) and app icons in `public/icons/`. Do not redraw or recolour them.
- Real client data (e.g. CRM CSV exports) must never be committed to git or put in test
  fixtures; tests use made-up contacts only.
- Plain names in the UI, except "Caddie" (AI assistant) and "Fairway" (deal progress).
- Write tests for each new feature and run them before saying a task is done.
- Explain what you changed in plain language at the end of each task.

## Project layout
- `src/lib/` — Supabase client, auth context, helpers
- `src/components/` — shared UI (app shell, top bar, bottom tabs, form fields)
- `src/pages/` — one file per screen; `src/pages/auth/` for login/sign-up screens
- `src/types/database.ts` — DB types (regenerate with `npm run db:types` after migrations)
- `supabase/migrations/` — SQL migrations
- `tests/e2e/` — Playwright tests (Supabase calls are mocked in `tests/e2e/mockSupabase.ts`)
- `tests/db/` — database tests (RLS) that run against a real Postgres

## Commands
- `npm run dev` — local dev server
- `npm test` — unit tests (Vitest); DB tests run only when `TEST_DATABASE_URL` is set
- `npm run test:e2e` — Playwright end-to-end tests
- `npm run build` — type-check and production build

## Decisions log
- 2026-11-17: Brand colours updated to the logo kit's exact values (they replace the slightly
  different values in the original plan).
- 2026-11-17: Tailwind v4 via `@tailwindcss/vite`; brand colours defined with `@theme`.
- 2026-11-17: A `profiles` row is created by a database trigger on `auth.users` insert,
  so it exists even if the browser closes right after sign-up.
- 2026-11-17: E2E tests mock Supabase's HTTP API so they run without a live project.
- 2026-11-17: RLS tests run against plain Postgres with a small shim of Supabase's
  `auth` schema (`tests/db/supabase-shim.sql`).
