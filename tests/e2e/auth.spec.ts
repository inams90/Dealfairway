import { expect, test } from '@playwright/test'
import { FakeSupabase } from './mockSupabase'

let fake: FakeSupabase

test.beforeEach(async ({ page }) => {
  fake = new FakeSupabase()
  await fake.install(page)
})

test('smoke: the login page loads with the DealFairway brand', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'DealFairway' })).toBeVisible()
})

test('sign up creates an account and opens the dashboard', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('Full name').fill('Sara Agent')
  await page.getByLabel('Email').fill('sara@example.com')
  await page.getByLabel('Password').fill('short')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('alert')).toContainText('at least 8 characters')

  await page.getByLabel('Password').fill('correct-horse-battery')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Sara/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
  expect(fake.users.map((u) => u.email)).toEqual(['sara@example.com'])
})

test('log in rejects a wrong password, then accepts the right one', async ({ page }) => {
  fake.addUser('ahmed@example.com', 'right-password-123', 'Ahmed Agent')
  await page.goto('/login')
  await page.getByLabel('Email').fill('ahmed@example.com')
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('don’t match')

  await page.getByLabel('Password').fill('right-password-123')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('heading', { name: /, Ahmed$/ })).toBeVisible()

  // Session survives a reload (phone app re-opened).
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
})

test('log out returns to login and protects pages again', async ({ page }) => {
  fake.addUser('agent@example.com', 'right-password-123')
  await page.goto('/login')
  await page.getByLabel('Email').fill('agent@example.com')
  await page.getByLabel('Password').fill('right-password-123')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.goto('/tasks')
  await expect(page).toHaveURL(/\/login$/)
})

test('magic link and forgot password show confirmation messages', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Use a sign-in link instead' }).click()
  await page.getByLabel('Email').fill('agent@example.com')
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click()
  await expect(page.getByText('Check your email for a sign-in link')).toBeVisible()

  await page.goto('/forgot-password')
  await page.getByLabel('Email').fill('agent@example.com')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText('a reset link is on its way')).toBeVisible()
})

test('profile page saves brokerage and RECO number', async ({ page }) => {
  const user = fake.addUser('agent@example.com', 'right-password-123', 'Test Agent')
  await page.goto('/login')
  await page.getByLabel('Email').fill('agent@example.com')
  await page.getByLabel('Password').fill('right-password-123')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('link', { name: 'Profile' }).click()
  await expect(page.getByLabel('Full name')).toHaveValue('Test Agent')
  await page.getByLabel('Brokerage').fill('Fairway Realty Inc., Brokerage')
  await page.getByLabel('RECO registration number (optional)').fill('1234567')
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByText('Profile saved.')).toBeVisible()
  expect(fake.profile(user.id)).toMatchObject({ brokerage: 'Fairway Realty Inc., Brokerage', reco_number: '1234567' })
})
