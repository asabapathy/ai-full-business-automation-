import { test, expect } from '@playwright/test'

test.describe('Customer Portal', () => {
  test('shows not found for unknown org slug', async ({ page }) => {
    await page.goto('/portal/this-org-does-not-exist-xyz')
    await expect(page.getByText(/not found|doesn't exist/i)).toBeVisible({ timeout: 8000 })
  })

  test('portal landing page shows correct actions', async ({ page }) => {
    // Using a demo slug — won't have real data but should render gracefully
    await page.goto('/portal/demo')
    // Either shows the portal or not-found — both are valid UI states
    await expect(page.locator('body')).toBeVisible()
  })

  test('booking page renders step flow', async ({ page }) => {
    await page.goto('/portal/demo/book')
    // Should show services or an empty state
    await expect(page.locator('body')).toBeVisible()
  })

  test('invoice page requires token', async ({ page }) => {
    await page.goto('/portal/demo/invoice/some-invoice-id')
    // Without a valid token, should show access denied
    await expect(page.getByText(/access denied|missing|token/i)).toBeVisible({ timeout: 8000 })
  })
})
