import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

if (!supabaseConfigured && import.meta.env.MODE !== 'test') {
  console.warn('DealFairway: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. Copy .env.example to .env.local.')
}

// Only the public anon key belongs here. Row Level Security protects the data.
export const supabase = createClient<Database>(
  url ?? 'http://localhost:54321',
  anonKey ?? 'missing-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)
