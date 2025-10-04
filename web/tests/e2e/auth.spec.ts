import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display login page when not authenticated', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.getByText('Expenfyre')).toBeVisible()
    await expect(page.getByText('Sign in to continue')).toBeVisible()
    await expect(page.getByText('Continue with Google')).toBeVisible()
  })

  test('should handle Google OAuth popup', async ({ page }) => {
    await page.goto('/')
    
    // Mock the OAuth popup
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByText('Continue with Google').click(),
    ])
    
    await expect(popup.url()).toContain('accounts.google.com')
    await popup.close()
  })

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // Mock successful authentication
    await page.goto('/')
    
    // Simulate successful login by setting cookies
    await page.context().addCookies([
      {
        name: 'access_token',
        value: 'mock-access-token',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'refresh_token',
        value: 'mock-refresh-token',
        domain: 'localhost',
        path: '/',
      },
    ])

    // Mock the user data
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user_id: 'test-user',
            email: 'test@example.com',
            name: 'Test User',
            picture: 'https://example.com/avatar.jpg',
            google_id: 'test-google-id',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        }),
      })
    })

    await page.reload()
    
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Welcome back!')).toBeVisible()
  })
})
