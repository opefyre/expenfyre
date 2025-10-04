import { test, expect } from '@playwright/test'

test.describe('Analytics Page', () => {
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

    // Mock analytics summary
    await page.route('**/api/analytics/summary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            total_expenses: 1500.00,
            total_budget: 2000.00,
            expense_count: 25,
            budget_count: 5,
            average_expense: 60.00,
            budget_utilization: 75.0,
          },
        }),
      })
    })

    // Mock category breakdown
    await page.route('**/api/analytics/category-breakdown*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              category_id: 'cat-1',
              category_name: 'Food',
              total_amount: 800.00,
              expense_count: 15,
              percentage: 53.3,
              budget_amount: 1000.00,
              remaining: 200.00,
              over_budget: false,
            },
            {
              category_id: 'cat-2',
              category_name: 'Transport',
              total_amount: 700.00,
              expense_count: 10,
              percentage: 46.7,
              budget_amount: 1000.00,
              remaining: 300.00,
              over_budget: false,
            },
          ],
        }),
      })
    })

    // Mock monthly comparison
    await page.route('**/api/analytics/monthly-comparison*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              month: '2024-01',
              total_expenses: 800.00,
              total_budget: 1000.00,
              expense_count: 15,
              budget_count: 3,
              variance: 200.00,
              variance_percentage: 20.0,
            },
            {
              month: '2024-02',
              total_expenses: 700.00,
              total_budget: 1000.00,
              expense_count: 10,
              budget_count: 2,
              variance: 300.00,
              variance_percentage: 30.0,
            },
          ],
        }),
      })
    })

    // Mock budget performance
    await page.route('**/api/analytics/budget-performance*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              category_id: 'cat-1',
              category_name: 'Food',
              budget_amount: 1000.00,
              spent_amount: 800.00,
              remaining: 200.00,
              utilization_percentage: 80.0,
              status: 'near',
            },
          ],
        }),
      })
    })
  })

  test('should display analytics page', async ({ page }) => {
    await page.goto('/analytics')
    
    await expect(page.getByText('Analytics')).toBeVisible()
    await expect(page.getByText('Key insights and trends for your expenses')).toBeVisible()
  })

  test('should display summary cards', async ({ page }) => {
    await page.goto('/analytics')
    
    await expect(page.getByText('Total Spent')).toBeVisible()
    await expect(page.getByText('€1,500.00')).toBeVisible()
    await expect(page.getByText('Total Budget')).toBeVisible()
    await expect(page.getByText('€2,000.00')).toBeVisible()
    await expect(page.getByText('25 transactions')).toBeVisible()
  })

  test('should display monthly overview chart', async ({ page }) => {
    await page.goto('/analytics')
    
    await expect(page.getByText('Monthly Overview')).toBeVisible()
    // Chart should be rendered (we can't easily test chart content without more complex setup)
    await expect(page.locator('.recharts-wrapper')).toBeVisible()
  })

  test('should display spending by category chart', async ({ page }) => {
    await page.goto('/analytics')
    
    await expect(page.getByText('Spending by Category')).toBeVisible()
    // Pie chart should be rendered
    await expect(page.locator('.recharts-wrapper')).toBeVisible()
  })

  test('should display budget performance table', async ({ page }) => {
    await page.goto('/analytics')
    
    await expect(page.getByText('Budget Performance')).toBeVisible()
    await expect(page.getByText('Food')).toBeVisible()
    await expect(page.getByText('€1,000.00')).toBeVisible()
    await expect(page.getByText('€800.00')).toBeVisible()
    await expect(page.getByText('80.0%')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/analytics')
    
    await expect(page.getByText('Analytics')).toBeVisible()
    await expect(page.locator('.recharts-wrapper')).toBeVisible()
  })
})
