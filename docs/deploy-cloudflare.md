# Deploy DealFairway to Cloudflare Pages (app.dealfairway.ca)

The app is a static site: Cloudflare builds it from GitHub on every push.
`public/_redirects` sends every URL to `index.html` so links like `/clients` work
when opened directly, and `public/_headers` adds basic security headers.

## Build settings

| Setting | Value |
|---|---|
| Framework preset | Vite (or None) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(leave blank)* |
| Node version | set env var `NODE_VERSION` = `22` |

## Environment variables (Pages → Settings → Variables and Secrets)

| Name | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Public |
| `VITE_SUPABASE_ANON_KEY` | the project's `anon` key | Public by design; RLS protects data |
| `NODE_VERSION` | `22` | |

Set them for **Production** and **Preview**. Use the **dev** project's values until
`dealfairway-prod` exists (Prompt 19), then switch Production to the prod values.
**Never** add the `service_role` key here.

## Step by step

1. Push this repo to GitHub (private repo `dealfairway`).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Pick the `dealfairway` repo. Production branch: `main`.
4. Enter the build settings and environment variables above. Click **Save and Deploy**.
5. When the first build finishes, open the `*.pages.dev` URL and check the login page loads.
6. **Custom domain:** project → **Custom domains** → **Set up a custom domain** →
   `app.dealfairway.ca`. If `dealfairway.ca` is already on your Cloudflare account,
   the DNS record is added for you; otherwise add the CNAME it shows you.
7. **Supabase redirect URLs:** Supabase → Authentication → URL Configuration:
   - Site URL: `https://app.dealfairway.ca`
   - Redirect URLs: add `https://app.dealfairway.ca/**` (keep `http://localhost:5173/**` for dev).
8. On your phone, open https://app.dealfairway.ca, sign up, confirm your email, and log in.

Every push to `main` now redeploys; other branches get preview URLs.
Once CI is required (Prompt 17), protect `main` in GitHub so only green builds merge.
