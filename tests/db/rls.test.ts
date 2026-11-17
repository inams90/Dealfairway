import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type pg from 'pg'
import { asUser, createTestDatabase } from './helpers'

const adminUrl = process.env.TEST_DATABASE_URL

describe.skipIf(!adminUrl)('Row Level Security', () => {
  let db: pg.Client
  let cleanup: () => Promise<void>
  let userA: string
  let userB: string
  let contactB: string

  beforeAll(async () => {
    ;({ db, cleanup } = await createTestDatabase(adminUrl!))
    const users = await db.query<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data) values
         ('a@example.com', '{"full_name":"Agent A"}'),
         ('b@example.com', '{"full_name":"Agent B"}')
       returning id`,
    )
    ;[userA, userB] = users.rows.map((r) => r.id)

    await asUser(db, userA, () =>
      db.query(`insert into contacts (first_name, last_name, email) values ('Sara', 'A-client', 'sara@example.com')`),
    )
    contactB = await asUser(db, userB, async () => {
      const r = await db.query<{ id: string }>(
        `insert into contacts (first_name, last_name, email) values ('Ahmed', 'B-client', 'ahmed@example.com') returning id`,
      )
      return r.rows[0].id
    })
  })

  afterAll(async () => {
    await cleanup?.()
  })

  it('every table in the public schema has RLS enabled', async () => {
    const r = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    )
    expect(r.rows.map((x) => x.relname)).toEqual([])
  })

  it('every table in the public schema has a user_id column', async () => {
    const r = await db.query<{ table_name: string }>(
      `select t.table_name from information_schema.tables t
       where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
         and not exists (select 1 from information_schema.columns c
           where c.table_schema = 'public' and c.table_name = t.table_name and c.column_name = 'user_id')`,
    )
    expect(r.rows.map((x) => x.table_name)).toEqual([])
  })

  it('creates a profile automatically on sign-up', async () => {
    const r = await asUser(db, userA, () => db.query(`select full_name from profiles`))
    expect(r.rows).toEqual([{ full_name: 'Agent A' }])
  })

  it("user A cannot read user B's contacts", async () => {
    const r = await asUser(db, userA, () => db.query<{ first_name: string }>(`select first_name from contacts`))
    expect(r.rows.map((x) => x.first_name)).toEqual(['Sara'])

    const byId = await asUser(db, userA, () => db.query(`select * from contacts where id = $1`, [contactB]))
    expect(byId.rowCount).toBe(0)
  })

  it("user A cannot update or delete user B's contacts", async () => {
    const upd = await asUser(db, userA, () =>
      db.query(`update contacts set first_name = 'Hacked' where id = $1`, [contactB]),
    )
    expect(upd.rowCount).toBe(0)
    const del = await asUser(db, userA, () => db.query(`delete from contacts where id = $1`, [contactB]))
    expect(del.rowCount).toBe(0)

    const check = await asUser(db, userB, () => db.query(`select first_name from contacts where id = $1`, [contactB]))
    expect(check.rows[0].first_name).toBe('Ahmed')
  })

  it("user A cannot insert rows owned by user B", async () => {
    await expect(
      asUser(db, userA, () => db.query(`insert into contacts (user_id, first_name) values ($1, 'Sneaky')`, [userB])),
    ).rejects.toThrow(/row-level security/)
  })

  it("user A cannot link a task to user B's contact", async () => {
    await expect(
      asUser(db, userA, () => db.query(`insert into tasks (title, contact_id) values ('Call', $1)`, [contactB])),
    ).rejects.toThrow(/foreign key/)
  })

  it("user A cannot read user B's profile, tasks, inquiries or activity", async () => {
    await asUser(db, userB, async () => {
      const inq = await db.query<{ id: string }>(
        `insert into inquiries (contact_id, message) values ($1, 'Looking to rent') returning id`,
        [contactB],
      )
      await db.query(`insert into tasks (title, contact_id, inquiry_id) values ('Reply to Ahmed', $1, $2)`, [
        contactB,
        inq.rows[0].id,
      ])
      await db.query(`insert into activity_log (contact_id, kind, body) values ($1, 'call', 'Left voicemail')`, [
        contactB,
      ])
    })
    for (const table of ['profiles', 'tasks', 'inquiries', 'activity_log']) {
      const r = await asUser(db, userA, () =>
        db.query(`select count(*)::int as n from ${table} where user_id = $1`, [userB]),
      )
      expect(r.rows[0].n, table).toBe(0)
    }
  })

  it('logged-out visitors cannot read any CRM data', async () => {
    for (const table of ['profiles', 'contacts', 'tasks', 'inquiries', 'activity_log']) {
      await expect(asUser(db, null, () => db.query(`select * from ${table}`)), table).rejects.toThrow(
        /permission denied/,
      )
    }
  })

  it("keeps a contact's last_activity_at in step with its newest activity", async () => {
    const contactId = await asUser(db, userB, async () =>
      (await db.query<{ id: string }>(`insert into contacts (first_name) values ('Fresh') returning id`)).rows[0].id,
    )
    const last = async () =>
      (await asUser(db, userB, () => db.query(`select last_activity_at from contacts where id = $1`, [contactId])))
        .rows[0].last_activity_at as Date | null
    expect(await last()).toBeNull()

    const ids = await asUser(db, userB, async () => {
      const r = await db.query<{ id: string }>(
        `insert into activity_log (contact_id, kind, occurred_at) values
           ($1, 'note', '2026-01-01T12:00:00Z'), ($1, 'meeting', '2026-06-01T12:00:00Z') returning id`,
        [contactId],
      )
      return r.rows.map((x) => x.id)
    })
    expect((await last())!.toISOString()).toBe('2026-06-01T12:00:00.000Z')

    await asUser(db, userB, () => db.query(`delete from activity_log where id = $1`, [ids[1]]))
    expect((await last())!.toISOString()).toBe('2026-01-01T12:00:00.000Z')

    await asUser(db, userB, () => db.query(`delete from activity_log where id = $1`, [ids[0]]))
    expect(await last()).toBeNull()
  })
})
