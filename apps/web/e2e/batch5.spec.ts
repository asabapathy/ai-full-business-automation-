import { test, expect, type Page } from '@playwright/test'

async function setupAuthState(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('kanavu_access_token', 'e2e-test-token')
    localStorage.setItem('kanavu_refresh_token', 'e2e-test-refresh')
  })
}

const BATCH5_PAGES = [
  { name: 'Expenses', path: '/dashboard/expenses' },
  { name: 'Vendors', path: '/dashboard/vendors' },
  { name: 'Inventory', path: '/dashboard/inventory' },
  { name: 'Projects', path: '/dashboard/projects' },
  { name: 'Time Tracking', path: '/dashboard/time-tracking' },
  { name: 'Estimates', path: '/dashboard/estimates' },
  { name: 'Contracts', path: '/dashboard/contracts' },
  { name: 'Goals', path: '/dashboard/goals' },
  { name: 'Email Templates', path: '/dashboard/email-templates' },
  { name: 'Client Onboarding', path: '/dashboard/client-onboarding' },
]

for (const { name, path } of BATCH5_PAGES) {
  test.describe(`${name} Page`, () => {
    test('page loads without JS errors', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', err => errors.push(err.message))
      await setupAuthState(page)
      await page.goto(path)
      await expect(page.locator('body')).toBeVisible()
      expect(errors.filter(e => !e.includes('401') && !e.includes('token'))).toHaveLength(0)
    })

    test('redirects unauthenticated user to login', async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/login/, { timeout: 5000 })
    })
  })
}
