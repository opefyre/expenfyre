import { test, expect } from '@playwright/test'

// Helper function to mock authenticated user
async function mockAuthenticatedUser(page: any) {
  // Mock the user data
  await page.route('**/api/auth/me', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          created_at: '2024-01-01T00:00:00Z',
        },
      }),
    })
  })

  // Mock API endpoints with sample data
  await page.route('**/api/expenses', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        expenses: [
          {
            expense_id: 'exp-1',
            category_id: 'cat-1',
            user_id: 'test-user',
            group_id: 'group-1',
            budget_id: 'budget-1',
            amount: 50.00,
            description: 'Test expense',
            date: '2024-01-15',
            month: '2024-01',
            receipt_url: '',
            tags: ['food'],
            status: 'active',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
          },
        ],
      }),
    })
  })

  await page.route('**/api/budgets', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        budgets: [
          {
            budget_id: 'budget-1',
            category_id: 'cat-1',
            user_id: 'test-user',
            group_id: 'group-1',
            amount: 500.00,
            month: '2024-01',
            rollover: false,
            recurring: false,
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      }),
    })
  })

  await page.route('**/api/categories', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        categories: [
          {
            category_id: 'cat-1',
            name: 'Food',
            icon: '🍔',
            color: '#FF6B6B',
            is_default: true,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      }),
    })
  })
}

test.describe('Authentication Flow', () => {
  test('should display login page when not authenticated', async ({ page }) => {
    await page.goto('/')
    
    // Check for login page elements
    await expect(page.getByText('Expenfyre')).toBeVisible()
    await expect(page.getByText('Sign in to continue')).toBeVisible()
    await expect(page.getByText('Continue with Google')).toBeVisible()
    
    // Check for minimal black & white design
    const loginContainer = page.locator('div').filter({ hasText: 'Expenfyre' }).first()
    await expect(loginContainer).toBeVisible()
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
    await page.goto('/')
    
    // Mock successful authentication
    await mockAuthenticatedUser(page)

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

    await page.reload()
    
    // Check for dashboard elements
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Quick Actions')).toBeVisible()
    
    // Check for navigation
    await expect(page.getByText('Expenses')).toBeVisible()
    await expect(page.getByText('Budgets')).toBeVisible()
    await expect(page.getByText('Analytics')).toBeVisible()
  })

  test('should handle sign out correctly', async ({ page }) => {
    await page.goto('/')
    
    // Mock authenticated user
    await mockAuthenticatedUser(page)
    
    // Simulate successful login
    await page.context().addCookies([
      {
        name: 'access_token',
        value: 'mock-access-token',
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.reload()
    
    // Should be on dashboard
    await expect(page.getByText('Dashboard')).toBeVisible()
    
    // Mock sign out API
    await page.route('**/api/auth/signout', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    // Click sign out
    await page.getByText('Sign Out').click()
    
    // Should redirect to login page
    await expect(page.getByText('Continue with Google')).toBeVisible()
    await expect(page.getByText('Sign in to continue')).toBeVisible()
  })
})
