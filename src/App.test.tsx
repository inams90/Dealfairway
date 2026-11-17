import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

let currentSession: Session | null = null

vi.mock('./lib/supabase', () => {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: null, error: null }),
  }
  return {
    supabaseConfigured: true,
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: currentSession } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
      },
      from: () => query,
    },
  }
})

const { AuthProvider } = await import('./lib/auth')
const { AppRoutes } = await import('./App')

function renderAt(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>,
  )
}

const fakeSession = {
  access_token: 't',
  user: { id: 'user-1', email: 'agent@example.com', user_metadata: { full_name: 'Test Agent' } },
} as unknown as Session

describe('routing and app shell', () => {
  beforeEach(() => {
    currentSession = null
  })

  it('sends logged-out visitors to the login page', async () => {
    renderAt('/clients')
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('shows the dashboard with all five tabs when logged in', async () => {
    currentSession = fakeSession
    renderAt('/')
    expect(await screen.findByRole('heading', { name: /Good (morning|afternoon|evening), Test/ })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    for (const tab of ['Home', 'Clients', 'Tasks', 'Inquiries', 'More']) {
      expect(within(nav).getByRole('link', { name: tab })).toBeInTheDocument()
    }
  })

  it('sends logged-in users away from the login page', async () => {
    currentSession = fakeSession
    renderAt('/login')
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })
})
