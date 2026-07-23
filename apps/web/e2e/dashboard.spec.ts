import { test, expect, type Page } from '@playwright/test'

// Helper: creates a logged-in session via localStorage (bypasses UI login)
async function setupAuthState(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('kanavu_access_token', 'e2e-test-token')
    localStorage.setItem('kanavu_refresh_token', 'e2e-test-refresh')
  })
}

test.describe('Dashboard Shell', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })

  test('landing page loads without errors', async ({ page }) => {
    await page.goto('/')
    await expect(page).not.toHaveURL(/error/)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Social Media Page', () => {
  test('page loads without JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await setupAuthState(page)
    await page.goto('/dashboard/social')
    // The redirect to login is fine in e2e — we're just checking no crashes
    await expect(page.locator('body')).toBeVisible()
    expect(errors.filter(e => !e.includes('401') && !e.includes('token'))).toHaveLength(0)
  })
})

test.describe('Analytics Page', () => {
  test('page loads without JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/dashboard/analytics')
    await expect(page.locator('body')).toBeVisible()
    expect(errors.filter(e => !e.includes('401'))).toHaveLength(0)
  })
})
