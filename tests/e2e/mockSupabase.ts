import type { Page, Route } from '@playwright/test'

/**
 * A tiny in-memory fake of the Supabase Auth + REST APIs, so end-to-end tests
 * exercise the real UI and supabase-js without a live Supabase project.
 */
export const SUPABASE_URL = 'http://supabase.e2e.test'

type FakeUser = { id: string; email: string; password: string; full_name: string }

export class FakeSupabase {
  users: FakeUser[] = []
  profiles = new Map<string, Record<string, unknown>>()
  calls: string[] = []

  addUser(email: string, password: string, full_name = 'Test Agent') {
    const user = { id: crypto.randomUUID(), email, password, full_name }
    this.users.push(user)
    this.profiles.set(user.id, this.newProfile(user))
    return user
  }

  private newProfile(user: FakeUser) {
    const now = new Date().toISOString()
    return { user_id: user.id, full_name: user.full_name, brokerage: '', phone: '', reco_number: null, created_at: now, updated_at: now }
  }

  private session(user: FakeUser) {
    return {
      access_token: `token-${user.id}`,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: `refresh-${user.id}`,
      user: this.publicUser(user),
    }
  }

  private publicUser(user: FakeUser) {
    return {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      user_metadata: { full_name: user.full_name },
      app_metadata: { provider: 'email' },
      created_at: new Date().toISOString(),
    }
  }

  private userFromRequest(route: Route) {
    const auth = route.request().headers()['authorization'] ?? ''
    const id = auth.replace('Bearer token-', '')
    return this.users.find((u) => u.id === id)
  }

  async install(page: Page) {
    await page.route(`${SUPABASE_URL}/**`, (route) => this.handle(route))
  }

  private async handle(route: Route) {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()
    this.calls.push(`${method} ${url.pathname}${url.search}`)
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders })

    // ---- Auth
    if (url.pathname === '/auth/v1/signup' && method === 'POST') {
      const body = req.postDataJSON() as { email: string; password: string; data?: { full_name?: string } }
      if (this.users.some((u) => u.email === body.email)) {
        return json(422, { code: 'user_already_exists', message: 'User already registered' })
      }
      const user = this.addUser(body.email, body.password, body.data?.full_name ?? '')
      return json(200, this.session(user))
    }
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const body = req.postDataJSON() as { email: string; password: string }
      const user = this.users.find((u) => u.email === body.email && u.password === body.password)
      if (!user) return json(400, { code: 'invalid_credentials', message: 'Invalid login credentials' })
      return json(200, this.session(user))
    }
    if (url.pathname === '/auth/v1/otp' || url.pathname === '/auth/v1/recover') return json(200, {})
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers: corsHeaders })
    if (url.pathname === '/auth/v1/user') {
      const user = this.userFromRequest(route)
      return user ? json(200, this.publicUser(user)) : json(401, { message: 'not signed in' })
    }

    // ---- REST: profiles
    if (url.pathname === '/rest/v1/profiles') {
      const user = this.userFromRequest(route)
      if (!user) return json(401, { message: 'JWT required' })
      const wantsObject = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object')
      if (method === 'GET') {
        const p = this.profiles.get(user.id)
        return json(200, wantsObject ? p : p ? [p] : [])
      }
      if (method === 'POST') {
        const body = req.postDataJSON() as Record<string, unknown>
        const row = Array.isArray(body) ? body[0] : body
        if (row.user_id !== user.id) return json(403, { message: 'new row violates row-level security policy' })
        const merged = { ...this.profiles.get(user.id), ...row, updated_at: new Date().toISOString() }
        this.profiles.set(user.id, merged)
        return json(201, wantsObject ? merged : [merged])
      }
    }

    return json(404, { message: `Not mocked: ${method} ${url.pathname}` })
  }
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}
