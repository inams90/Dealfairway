import { expect, test } from '@playwright/test'
import { loggedIn } from './helpers'

test('client list: search, filter by tag, open a profile with call/text/email', async ({ page }) => {
  const { fake, user, login } = await loggedIn(page)
  const sara = fake.addContact(user.id, {
    first_name: 'Sara', last_name: 'Demo', email: 'sara@example.com', phone: '+19055550101', type: 'tenant',
    source: 'miltonlease', tags: ['Hot Prospect'], notes: 'Wants 2 bed\n<script>alert(1)</script>',
  })
  fake.addContact(user.id, { first_name: 'Omar', last_name: 'Alpha', type: 'buyer', tags: ['Past Client'] })
  fake.addContact(user.id, { first_name: 'Lee', last_name: 'Zed', type: 'investor', tags: ['Past Client'] })
  await login()

  await page.getByRole('link', { name: 'Clients' }).click()
  const list = page.getByRole('list', { name: 'Client list' })
  await expect(list.getByRole('link')).toHaveCount(3)
  await expect(page.getByText('3 clients')).toBeVisible()
  await expect(list.getByRole('link').first()).toContainText('Omar Alpha') // sorted by last name

  await page.getByPlaceholder('Search name, email, phone, tag').fill('555-0101')
  await expect(list.getByRole('link')).toHaveCount(1)
  await page.getByPlaceholder('Search name, email, phone, tag').fill('')

  await page.getByRole('button', { name: 'Filters' }).click()
  await page.getByLabel('Tag').selectOption('Past Client')
  await expect(page.getByText('2 of 3 clients')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()

  await list.getByRole('link', { name: /Sara Demo/ }).click()
  await expect(page).toHaveURL(new RegExp(`/clients/${sara.id}$`))
  await expect(page.getByRole('heading', { name: 'Sara Demo' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:+19055550101')
  await expect(page.getByRole('link', { name: 'Text' })).toHaveAttribute('href', 'sms:+19055550101')
  await expect(page.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:sara@example.com')
  await expect(page.getByText('(905) 555-0101')).toBeVisible()
  // Notes are shown as plain text, never run as code.
  await expect(page.getByText('<script>alert(1)</script>')).toBeVisible()
})

test('add a client, get warned about a duplicate phone, then edit and delete', async ({ page }) => {
  const { fake, user, login } = await loggedIn(page)
  const existing = fake.addContact(user.id, { first_name: 'Ahmed', last_name: 'Existing', phone: '+19055550199' })
  await login()

  await page.getByRole('link', { name: 'Clients' }).click()
  await page.getByRole('link', { name: 'Add client' }).click()
  await page.getByLabel('First name').fill('Ahmed')
  await page.getByLabel('Last name').fill('New')
  await page.getByLabel('Phone').fill('905.555.0199')
  await page.getByRole('button', { name: 'Add client' }).click()

  await expect(page.getByRole('heading', { name: 'This client may already exist' })).toBeVisible()
  await expect(page.getByText('Same phone')).toBeVisible()
  await page.getByRole('link', { name: 'Open existing client' }).click()
  await expect(page).toHaveURL(new RegExp(`/clients/${existing.id}$`))

  await page.goto('/clients/new')
  await page.getByLabel('First name').fill('Nadia')
  await page.getByLabel('Last name').fill('Fresh')
  await page.getByLabel('Phone').fill('647 555 0123')
  await page.getByLabel('Type').selectOption('landlord')
  await page.getByLabel('Tags').fill('VIP, Milton')
  await page.getByRole('button', { name: 'Add client' }).click()
  await expect(page.getByRole('heading', { name: 'Nadia Fresh' })).toBeVisible()
  const saved = fake.table('contacts').find((c) => c.first_name === 'Nadia')!
  expect(saved).toMatchObject({ phone: '+16475550123', type: 'landlord', tags: ['VIP', 'Milton'], user_id: user.id })

  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Last name').fill('Updated')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('heading', { name: 'Nadia Updated' })).toBeVisible()

  await page.getByRole('button', { name: 'Delete client' }).click()
  await page.getByRole('button', { name: 'Delete client' }).click()
  await expect(page).toHaveURL(/\/clients$/)
  expect(fake.table('contacts').some((c) => c.first_name === 'Nadia')).toBe(false)
})

test('import contacts from a CRM export: map, preview, handle duplicates, import', async ({ page }) => {
  const { fake, user, login } = await loggedIn(page)
  fake.addContact(user.id, { first_name: 'Dana', last_name: 'Existing', phone: '+14165550114' })
  await login()

  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('link', { name: 'Import contacts' }).click()
  await page.getByLabel('CSV file').setInputFiles('tests/e2e/fixtures/crm-export-sample.csv')

  await expect(page.getByText('5 rows')).toBeVisible()
  await expect(page.getByLabel('Import "Main Contact First Name" as')).toHaveValue('first_name')
  await expect(page.getByLabel('Import "Main Contact Phone 1" as')).toHaveValue('phone')
  await expect(page.getByLabel('Import "Contact Status" as')).toHaveValue('tags')
  await page.getByRole('button', { name: 'Review import' }).click()

  // Chris shares Bea's email (row 3); Dana's phone matches an existing client.
  await expect(page.getByText('Row 4: Chris Example')).toBeVisible()
  await expect(page.getByText('Row 5: Dana Existing')).toBeVisible()
  await expect(page.getByText(/already in DealFairway, same phone/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Import 3' })).toBeVisible()

  // Chris is a different person sharing an email: include him.
  await page.getByRole('checkbox', { name: /Row 4: Chris Example/ }).check()
  await page.getByRole('button', { name: 'Import 4' }).click()
  await expect(page.getByText('Imported 4 clients.')).toBeVisible()

  const imported = fake.table('contacts').filter((c) => (c.tags as string[]).includes('imported'))
  expect(imported.map((c) => c.first_name).sort()).toEqual(['Alex', 'Bea', 'Chris', 'Eli'])
  const alex = imported.find((c) => c.first_name === 'Alex')!
  expect(alex).toMatchObject({ phone: '+19055550112', email: 'alex.sample@example.com', type: 'buyer', source: 'referral' })
  expect(alex.notes).toContain('Other phone (Home): (905) 555-0111')
  expect(alex.tags).toEqual(expect.arrayContaining(['Client', 'Past Client', 'imported']))

  await page.getByRole('link', { name: 'View imported clients' }).click()
  await expect(page.getByRole('list', { name: 'Client list' }).getByRole('link')).toHaveCount(4)
})
