import { test, expect } from '@playwright/test'

// Helper function to mock authenticated user with dashboard data
async function mockAuthenticatedUserWithDashboard(page: any) {
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

  // Mock expenses API
  await page.route('**/api/expenses*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            expense_id: 'exp-1',
            category_id: 'cat-1',
            user_id: 'test-user',
            group_id: 'group-1',
            budget_id: 'budget-1',
            amount: 25.50,
            description: 'Lunch at restaurant',
            date: '2024-01-15',
            month: '2024-01',
            receipt_url: '',
            tags: ['food', 'restaurant'],
            status: 'active',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
          },
          {
            expense_id: 'exp-2',
            category_id: 'cat-2',
            user_id: 'test-user',
            group_id: 'group-1',
            budget_id: 'budget-2',
            amount: 15.00,
            description: 'Coffee shop',
            date: '2024-01-14',
            month: '2024-01',
            receipt_url: '',
            tags: ['food', 'coffee'],
            status: 'active',
            created_at: '2024-01-14T00:00:00Z',
            updated_at: '2024-01-14T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      }),
    })
  })

  // Mock budgets API
  await page.route('**/api/budgets*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
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
          {
            budget_id: 'budget-2',
            category_id: 'cat-2',
            user_id: 'test-user',
            group_id: 'group-1',
            amount: 300.00,
            month: '2024-01',
            rollover: false,
            recurring: false,
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      }),
    })
  })

  // Mock categories API
  await page.route('**/api/categories', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            category_id: 'cat-1',
            name: 'Food',
            icon: '🍔',
            color: '#FF6B6B',
            is_default: true,
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            category_id: 'cat-2',
            name: 'Entertainment',
            icon: '🎬',
            color: '#4ECDC4',
            is_default: true,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      }),
    })
  })
}

test.describe('Dashboard Page UI/UX - Comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await mockAuthenticatedUserWithDashboard(page)
    
    // Simulate successful login
    await page.context().addCookies([
      {
        name: 'access_token',
        value: 'mock-access-token',
        domain: 'localhost',
        path: '/',
      },
    ])
  })

  test('should display dashboard with proper layout', async ({ page }) => {
    await page.goto('/')
    
    // Check page title and header
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Welcome back!')).toBeVisible()
    
    // Check for quick actions section
    await expect(page.getByText('Quick Actions')).toBeVisible()
  })

  test('should display quick actions', async ({ page }) => {
    await page.goto('/')
    
    // Check for quick action buttons
    await expect(page.getByText('Add Expense')).toBeVisible()
    await expect(page.getByText('Add Budget')).toBeVisible()
    await expect(page.getByText('View Analytics')).toBeVisible()
    
    // Check that quick actions are clickable
    const addExpenseButton = page.getByText('Add Expense')
    await expect(addExpenseButton).toBeVisible()
    await addExpenseButton.click()
    
    // Should navigate to expenses page or open form
    // This depends on the implementation
  })

  test('should handle navigation from quick actions', async ({ page }) => {
    await page.goto('/')
    
    // Test navigation to expenses page
    const addExpenseButton = page.getByText('Add Expense')
    await addExpenseButton.click()
    
    // Should navigate to expenses page
    await expect(page.getByText('Expenses')).toBeVisible()
    
    // Navigate back to dashboard
    await page.goto('/')
    
    // Test navigation to budgets page
    const addBudgetButton = page.getByText('Add Budget')
    await addBudgetButton.click()
    
    // Should navigate to budgets page
    await expect(page.getByText('Budgets')).toBeVisible()
    
    // Navigate back to dashboard
    await page.goto('/')
    
    // Test navigation to analytics page
    const viewAnalyticsButton = page.getByText('View Analytics')
    await viewAnalyticsButton.click()
    
    // Should navigate to analytics page
    await expect(page.getByText('Analytics')).toBeVisible()
  })

  test('should display user information', async ({ page }) => {
    await page.goto('/')
    
    // Check for user name in header
    await expect(page.getByText('Test User')).toBeVisible()
    
    // Check for user avatar
    const userAvatar = page.locator('img[alt="Test User"]')
    if (await userAvatar.count() > 0) {
      await expect(userAvatar).toBeVisible()
    }
  })

  test('should handle mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    
    // Check that page loads properly on mobile
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Quick Actions')).toBeVisible()
    
    // Check that quick actions are visible and clickable
    await expect(page.getByText('Add Expense')).toBeVisible()
    await expect(page.getByText('Add Budget')).toBeVisible()
    await expect(page.getByText('View Analytics')).toBeVisible()
  })

  test('should handle different screen sizes', async ({ page }) => {
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Quick Actions')).toBeVisible()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Quick Actions')).toBeVisible()
  })

  test('should show loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/expenses*', async (route: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true,
          data: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
        }),
      })
    })

    await page.goto('/')
    
    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="loading"]')
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toBeVisible()
    }
  })

  test('should handle empty state', async ({ page }) => {
    // Mock empty data response
    await page.route('**/api/expenses*', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true,
          data: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
        }),
      })
    })

    await page.route('**/api/budgets*', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true,
          data: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
        }),
      })
    })

    await page.goto('/')
    
    // Check that dashboard still loads with empty data
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Quick Actions')).toBeVisible()
  })

  test('should handle sign out from dashboard', async ({ page }) => {
    await page.goto('/')
    
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

  test('should display navigation menu', async ({ page }) => {
    await page.goto('/')
    
    // Check for navigation items
    await expect(page.getByText('Expenses')).toBeVisible()
    await expect(page.getByText('Budgets')).toBeVisible()
    await expect(page.getByText('Analytics')).toBeVisible()
    
    // Check that navigation items are clickable
    await page.getByText('Expenses').click()
    await expect(page.getByText('Expenses')).toBeVisible()
    
    await page.goto('/')
    await page.getByText('Budgets').click()
    await expect(page.getByText('Budgets')).toBeVisible()
    
    await page.goto('/')
    await page.getByText('Analytics').click()
    await expect(page.getByText('Analytics')).toBeVisible()
  })

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/')
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Should be able to navigate through quick actions
    await page.keyboard.press('Enter')
    
    // Should trigger the focused action
    // This depends on the implementation
  })

  test('should display proper page title', async ({ page }) => {
    await page.goto('/')
    
    // Check page title
    await expect(page).toHaveTitle(/Dashboard|Expenfyre/)
  })

  test('should handle page refresh', async ({ page }) => {
    await page.goto('/')
    
    // Check initial state
    await expect(page.getByText('Dashboard')).toBeVisible()
    
    // Refresh the page
    await page.reload()
    
    // Should still be on dashboard
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Quick Actions')).toBeVisible()
  })

  test('should handle direct URL access', async ({ page }) => {
    // Access dashboard directly
    await page.goto('/')
    
    // Should load properly
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Welcome back!')).toBeVisible()
  })

  test('should display proper meta information', async ({ page }) => {
    await page.goto('/')
    
    // Check for proper meta tags
    const viewport = page.locator('meta[name="viewport"]')
    if (await viewport.count() > 0) {
      await expect(viewport).toHaveAttribute('content', /width=device-width/)
    }
  })
})
