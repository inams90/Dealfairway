import type { Page, Route } from '@playwright/test'

/**
 * A tiny in-memory fake of the Supabase Auth + REST APIs, so end-to-end tests
 * exercise the real UI and supabase-js without a live Supabase project.
 */
export const SUPABASE_URL = 'http://supabase.e2e.test'

type FakeUser = { id: string; email: string; password: string; full_name: string }

export class FakeSupabase {
  users: FakeUser[] = []
  tables = new Map<string, Row[]>()
  calls: string[] = []

  table(name: string): Row[] {
    if (!this.tables.has(name)) this.tables.set(name, [])
    return this.tables.get(name)!
  }

  profile(userId: string) {
    return this.table('profiles').find((p) => p.user_id === userId)
  }

  /** Seeds a contact owned by the given user (made-up data only). */
  addContact(userId: string, contact: Row) {
    const now = new Date().toISOString()
    const row = withDefaults('contacts', { id: crypto.randomUUID(), user_id: userId, created_at: now, updated_at: now, ...contact })
    this.table('contacts').push(row)
    return row
  }

  addUser(email: string, password: string, full_name = 'Test Agent') {
    const user = { id: crypto.randomUUID(), email, password, full_name }
    this.users.push(user)
    this.table('profiles').push(this.newProfile(user))
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

    // ---- REST: a tiny generic PostgREST for our tables, scoped to the signed-in user (like RLS)
    const table = url.pathname.match(/^\/rest\/v1\/(\w+)$/)?.[1]
    if (table) {
      const user = this.userFromRequest(route)
      if (!user) return json(401, { message: 'JWT required' })
      const headers = req.headers()
      const wantsObject = (headers['accept'] ?? '').includes('vnd.pgrst.object')
      const wantsRows = (headers['prefer'] ?? '').includes('return=representation')
      const rows = this.table(table)
      const mine = rows.filter((r) => r.user_id === user.id)
      const matches = (r: Row) => matchesFilters(r, url.searchParams)
      const respond = (status: number, result: Row[]) => {
        if (wantsObject) return result.length === 1 ? json(status, result[0]) : json(406, { message: 'not one row' })
        return json(status, result)
      }

      if (method === 'GET') return respond(200, sortRows(mine.filter(matches), url.searchParams.get('order')))
      if (method === 'POST') {
        const body = req.postDataJSON() as Row | Row[]
        const now = new Date().toISOString()
        const key = table === 'profiles' ? 'user_id' : 'id'
        const saved = (Array.isArray(body) ? body : [body]).map((input) => {
          const row: Row = { id: crypto.randomUUID(), created_at: now, ...input, user_id: input.user_id ?? user.id, updated_at: now }
          if (row.user_id !== user.id) throw new Error('rls')
          const existing = rows.findIndex((r) => r[key] === row[key])
          if (existing >= 0) rows[existing] = { ...rows[existing], ...row }
          else rows.push(withDefaults(table, row))
          return rows.find((r) => r[key] === row[key])!
        })
        return wantsRows || wantsObject ? respond(201, saved) : route.fulfill({ status: 201, headers: corsHeaders })
      }
      if (method === 'PATCH') {
        const patch = req.postDataJSON() as Row
        const updated = mine.filter(matches).map((r) => Object.assign(r, patch, { updated_at: new Date().toISOString() }))
        return wantsRows || wantsObject ? respond(200, updated) : route.fulfill({ status: 204, headers: corsHeaders })
      }
      if (method === 'DELETE') {
        const doomed = new Set(mine.filter(matches))
        this.tables.set(table, rows.filter((r) => !doomed.has(r)))
        return route.fulfill({ status: 204, headers: corsHeaders })
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

type Row = Record<string, unknown>

const DEFAULTS: Record<string, Row> = {
  contacts: {
    first_name: '', last_name: '', email: null, phone: null, type: 'other', property_interest: null,
    source: 'other', notes: '', tags: [], last_activity_at: null,
  },
}

function withDefaults(table: string, row: Row): Row {
  return { ...(DEFAULTS[table] ?? {}), ...row }
}

/** Supports the PostgREST filters our app uses: col=eq.x, col=is.null, col=in.(a,b). */
function matchesFilters(row: Row, params: URLSearchParams) {
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) continue
    const [op, ...rest] = raw.split('.')
    const value = rest.join('.')
    const actual = row[key]
    if (op === 'eq' && String(actual) !== value) return false
    if (op === 'is' && value === 'null' && actual !== null && actual !== undefined) return false
    if (op === 'in' && !value.replace(/^\(|\)$/g, '').split(',').includes(String(actual))) return false
  }
  return true
}

function sortRows(rows: Row[], order: string | null) {
  if (!order) return rows
  const keys = order.split(',').map((o) => {
    const [col, dir] = o.split('.')
    return { col, desc: dir === 'desc' }
  })
  return [...rows].sort((a, b) => {
    for (const { col, desc } of keys) {
      const x = String(a[col] ?? '')
      const y = String(b[col] ?? '')
      if (x !== y) return (x < y ? -1 : 1) * (desc ? -1 : 1)
    }
    return 0
  })
}
