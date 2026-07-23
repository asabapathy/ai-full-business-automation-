import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('shows login page for unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page renders all required elements', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in|log in|welcome/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('invalid@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    await expect(page.getByRole('alert').or(page.locator('[class*="error"]').or(page.locator('[class*="toast"]')))).toBeVisible({ timeout: 5000 })
  })

  test('register page renders correctly', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /create|register|sign up/i })).toBeVisible()
  })

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login')
    const registerLink = page.getByRole('link', { name: /sign up|create account|register/i })
    await expect(registerLink).toBeVisible()
    await registerLink.click()
    await expect(page).toHaveURL(/register/)
  })
})
