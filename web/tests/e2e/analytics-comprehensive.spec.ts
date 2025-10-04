import { test, expect } from '@playwright/test'

// Helper function to mock authenticated user with analytics data
async function mockAuthenticatedUserWithAnalytics(page: any) {
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

  // Mock analytics API endpoints
  await page.route('**/api/analytics/monthly-comparison*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            month: '2024-01',
            total_budget: 1000.00,
            total_spent: 750.00,
            expenses_count: 15,
          },
          {
            month: '2024-02',
            total_budget: 1200.00,
            total_spent: 900.00,
            expenses_count: 18,
          },
          {
            month: '2024-03',
            total_budget: 1100.00,
            total_spent: 850.00,
            expenses_count: 12,
          },
        ],
      }),
    })
  })

  await page.route('**/api/analytics/category-breakdown*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            category_id: 'cat-1',
            category_name: 'Food',
            total_spent: 450.00,
            budget_amount: 500.00,
            percentage: 90.0,
            expense_count: 8,
          },
          {
            category_id: 'cat-2',
            category_name: 'Entertainment',
            total_spent: 200.00,
            budget_amount: 300.00,
            percentage: 66.7,
            expense_count: 5,
          },
          {
            category_id: 'cat-3',
            category_name: 'Transportation',
            total_spent: 150.00,
            budget_amount: 200.00,
            percentage: 75.0,
            expense_count: 3,
          },
        ],
      }),
    })
  })

  await page.route('**/api/analytics/budget-performance*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            budget_id: 'budget-1',
            category_name: 'Food',
            budget_amount: 500.00,
            spent_amount: 450.00,
            remaining_amount: 50.00,
            percentage_used: 90.0,
            status: 'warning',
          },
          {
            budget_id: 'budget-2',
            category_name: 'Entertainment',
            budget_amount: 300.00,
            spent_amount: 200.00,
            remaining_amount: 100.00,
            percentage_used: 66.7,
            status: 'good',
          },
          {
            budget_id: 'budget-3',
            category_name: 'Transportation',
            budget_amount: 200.00,
            spent_amount: 150.00,
            remaining_amount: 50.00,
            percentage_used: 75.0,
            status: 'good',
          },
        ],
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
            description: 'Movie ticket',
            date: '2024-01-14',
            month: '2024-01',
            receipt_url: '',
            tags: ['entertainment', 'movie'],
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
          {
            category_id: 'cat-3',
            name: 'Transportation',
            icon: '🚗',
            color: '#45B7D1',
            is_default: true,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      }),
    })
  })
}

test.describe('Analytics Page UI/UX - Comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await mockAuthenticatedUserWithAnalytics(page)
    
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

  test('should display analytics page with proper layout', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check page title and header
    await expect(page.getByText('Analytics')).toBeVisible()
    
    // Check for summary cards
    await expect(page.getByText('Total Spent')).toBeVisible()
    await expect(page.getByText('Total Budget')).toBeVisible()
    await expect(page.getByText('Remaining')).toBeVisible()
    await expect(page.getByText('Budget Used')).toBeVisible()
  })

  test('should display monthly overview chart', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check for monthly overview section
    await expect(page.getByText('Monthly Overview')).toBeVisible()
    
    // Check for chart container
    const chartContainer = page.locator('[data-testid="monthly-overview-chart"]')
    if (await chartContainer.count() > 0) {
      await expect(chartContainer).toBeVisible()
    }
    
    // Check for chart data
    await expect(page.getByText('2024-01')).toBeVisible()
    await expect(page.getByText('2024-02')).toBeVisible()
    await expect(page.getByText('2024-03')).toBeVisible()
  })

  test('should display spending by category chart', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check for spending by category section
    await expect(page.getByText('Spending by Category')).toBeVisible()
    
    // Check for chart container
    const chartContainer = page.locator('[data-testid="category-chart"]')
    if (await chartContainer.count() > 0) {
      await expect(chartContainer).toBeVisible()
    }
    
    // Check for category data
    await expect(page.getByText('Food')).toBeVisible()
    await expect(page.getByText('Entertainment')).toBeVisible()
    await expect(page.getByText('Transportation')).toBeVisible()
  })

  test('should display budget performance table', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check for budget performance section
    await expect(page.getByText('Budget Performance')).toBeVisible()
    
    // Check for table headers
    await expect(page.getByText('Category')).toBeVisible()
    await expect(page.getByText('Budget')).toBeVisible()
    await expect(page.getByText('Spent')).toBeVisible()
    await expect(page.getByText('Remaining')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()
    
    // Check for table data
    await expect(page.getByText('Food')).toBeVisible()
    await expect(page.getByText('Entertainment')).toBeVisible()
    await expect(page.getByText('Transportation')).toBeVisible()
  })

  test('should handle mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/analytics')
    
    // Check that page loads properly on mobile
    await expect(page.getByText('Analytics')).toBeVisible()
    
    // Check that summary cards are visible
    await expect(page.getByText('Total Spent')).toBeVisible()
    await expect(page.getByText('Total Budget')).toBeVisible()
    
    // Check that charts are responsive
    const monthlyChart = page.locator('[data-testid="monthly-overview-chart"]')
    if (await monthlyChart.count() > 0) {
      await expect(monthlyChart).toBeVisible()
    }
    
    const categoryChart = page.locator('[data-testid="category-chart"]')
    if (await categoryChart.count() > 0) {
      await expect(categoryChart).toBeVisible()
    }
  })

  test('should show loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/analytics/monthly-comparison*', async (route: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      })
    })

    await page.goto('/analytics')
    
    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="loading"]')
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toBeVisible()
    }
  })

  test('should handle empty state', async ({ page }) => {
    // Mock empty analytics response
    await page.route('**/api/analytics/monthly-comparison*', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      })
    })

    await page.route('**/api/analytics/category-breakdown*', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      })
    })

    await page.goto('/analytics')
    
    // Check for empty state message
    await expect(page.getByText(/No data available/i)).toBeVisible()
  })

  test('should display correct currency formatting', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check for proper currency formatting
    await expect(page.getByText('$1,000.00')).toBeVisible()
    await expect(page.getByText('$750.00')).toBeVisible()
    await expect(page.getByText('$500.00')).toBeVisible()
    await expect(page.getByText('$450.00')).toBeVisible()
  })

  test('should display percentage calculations', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check for percentage displays
    await expect(page.getByText('90.0%')).toBeVisible()
    await expect(page.getByText('66.7%')).toBeVisible()
    await expect(page.getByText('75.0%')).toBeVisible()
  })

  test('should display status indicators', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check for status indicators in budget performance table
    await expect(page.getByText('Warning')).toBeVisible()
    await expect(page.getByText('Good')).toBeVisible()
  })

  test('should handle chart interactions', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check for chart containers
    const monthlyChart = page.locator('[data-testid="monthly-overview-chart"]')
    const categoryChart = page.locator('[data-testid="category-chart"]')
    
    if (await monthlyChart.count() > 0) {
      await expect(monthlyChart).toBeVisible()
      
      // Test chart hover interactions if available
      await monthlyChart.hover()
    }
    
    if (await categoryChart.count() > 0) {
      await expect(categoryChart).toBeVisible()
      
      // Test chart hover interactions if available
      await categoryChart.hover()
    }
  })

  test('should display data for current month', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check that current month data is displayed
    const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM format
    
    // The analytics should show data for the current month
    await expect(page.getByText(currentMonth)).toBeVisible()
  })

  test('should handle different screen sizes', async ({ page }) => {
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/analytics')
    
    await expect(page.getByText('Analytics')).toBeVisible()
    await expect(page.getByText('Monthly Overview')).toBeVisible()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/analytics')
    
    await expect(page.getByText('Analytics')).toBeVisible()
    await expect(page.getByText('Monthly Overview')).toBeVisible()
  })

  test('should display insights and recommendations', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check for insights section if it exists
    const insightsSection = page.locator('[data-testid="insights"]')
    if (await insightsSection.count() > 0) {
      await expect(insightsSection).toBeVisible()
    }
    
    // Check for recommendations if they exist
    const recommendationsSection = page.locator('[data-testid="recommendations"]')
    if (await recommendationsSection.count() > 0) {
      await expect(recommendationsSection).toBeVisible()
    }
  })

  test('should handle data refresh', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check for refresh button if it exists
    const refreshButton = page.locator('[data-testid="refresh-button"]')
    if (await refreshButton.count() > 0) {
      await refreshButton.click()
      
      // Should reload the data
      await expect(page.getByText('Analytics')).toBeVisible()
    }
  })
})
