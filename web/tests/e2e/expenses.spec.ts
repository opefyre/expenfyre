import { test, expect } from '@playwright/test'

test.describe('Expenses Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.context().addCookies([
      {
        name: 'access_token',
        value: 'mock-access-token',
        domain: 'localhost',
        path: '/',
      },
    ])

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

    // Mock expenses data
    await page.route('**/api/expenses*', async (route) => {
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
              amount: 50.00,
              description: 'Test expense',
              date: '2024-01-15',
              month: '2024-01',
              receipt_url: null,
              tags: ['test'],
              status: 'active',
              created_at: '2024-01-15T00:00:00Z',
              updated_at: '2024-01-15T00:00:00Z',
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        }),
      })
    })

    // Mock categories data
    await page.route('**/api/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              category_id: 'cat-1',
              name: 'Food',
              icon: '🍽️',
              color: '#3b82f6',
              is_default: true,
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
        }),
      })
    })

    // Mock budgets data
    await page.route('**/api/budgets*', async (route) => {
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
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        }),
      })
    })
  })

  test('should display expenses page', async ({ page }) => {
    await page.goto('/expenses')
    
    await expect(page.getByText('Expenses')).toBeVisible()
    await expect(page.getByText('Manage your expenses and track spending')).toBeVisible()
    await expect(page.getByText('Add Expense')).toBeVisible()
  })

  test('should display expense list', async ({ page }) => {
    await page.goto('/expenses')
    
    await expect(page.getByText('Test expense')).toBeVisible()
    await expect(page.getByText('€50.00')).toBeVisible()
  })

  test('should open add expense form', async ({ page }) => {
    await page.goto('/expenses')
    
    await page.getByText('Add Expense').click()
    
    await expect(page.getByText('Add New Expense')).toBeVisible()
    await expect(page.getByLabel('Amount')).toBeVisible()
    await expect(page.getByLabel('Description')).toBeVisible()
  })

  test('should filter expenses by category', async ({ page }) => {
    await page.goto('/expenses')
    
    // Open filters on mobile
    if (await page.getByText('Filters').isVisible()) {
      await page.getByText('Filters').click()
    }
    
    await page.selectOption('select[name="category_id"]', 'cat-1')
    
    // Verify filter is applied (this would trigger a new API call in real app)
    await expect(page.getByText('Test expense')).toBeVisible()
  })

  test('should search expenses', async ({ page }) => {
    await page.goto('/expenses')
    
    await page.fill('input[placeholder*="Search expenses"]', 'Test')
    
    // Verify search is applied
    await expect(page.getByText('Test expense')).toBeVisible()
  })
})
