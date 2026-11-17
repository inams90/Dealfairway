import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const root = join(import.meta.dirname, '..', '..')

/**
 * Creates a fresh, uniquely named database, applies the Supabase shim and
 * every migration in order, and returns a connected client plus a cleanup fn.
 */
export async function createTestDatabase(adminUrl: string) {
  const name = `dealfairway_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
  const admin = new pg.Client({ connectionString: adminUrl })
  await admin.connect()
  await admin.query(`create database ${name}`)

  const url = new URL(adminUrl)
  url.pathname = `/${name}`
  const db = new pg.Client({ connectionString: url.toString() })
  await db.connect()

  await db.query(readFileSync(join(root, 'tests/db/supabase-shim.sql'), 'utf8'))
  const migrationsDir = join(root, 'supabase/migrations')
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.query(readFileSync(join(migrationsDir, file), 'utf8'))
  }

  return {
    db,
    async cleanup() {
      await db.end()
      await admin.query(`drop database if exists ${name} with (force)`)
      await admin.end()
    },
  }
}

/** Runs `fn` as the given Supabase user (role "authenticated", auth.uid() = userId). */
export async function asUser<T>(db: pg.Client, userId: string | null, fn: () => Promise<T>) {
  await db.query('begin')
  try {
    if (userId) {
      await db.query(`set local role authenticated`)
      await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId])
    } else {
      await db.query(`set local role anon`)
    }
    const result = await fn()
    await db.query('commit')
    return result
  } catch (e) {
    await db.query('rollback')
    throw e
  }
}
