import { expect, type Page } from '@playwright/test'
import { FakeSupabase } from './mockSupabase'

/** Installs the fake backend, creates an agent and logs them in. */
export async function loggedIn(page: Page, fullName = 'Test Agent') {
  const fake = new FakeSupabase()
  await fake.install(page)
  const user = fake.addUser('agent@example.com', 'right-password-123', fullName)
  return {
    fake,
    user,
    async login() {
      await page.goto('/login')
      await page.getByLabel('Email').fill('agent@example.com')
      await page.getByLabel('Password').fill('right-password-123')
      await page.getByRole('button', { name: 'Log in', exact: true }).click()
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
    },
  }
}
