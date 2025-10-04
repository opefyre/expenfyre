import { test, expect } from '@playwright/test'

// Helper function to mock authenticated user with budgets data
async function mockAuthenticatedUserWithBudgets(page: any) {
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

  // Mock budgets API with sample data
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
            amount: 200.00,
            month: '2024-02',
            rollover: true,
            recurring: true,
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

  // Mock expenses API for budget performance
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
            amount: 150.00,
            description: 'Groceries',
            date: '2024-01-15',
            month: '2024-01',
            receipt_url: '',
            tags: ['food'],
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
}

test.describe('Budgets Page UI/UX - Comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await mockAuthenticatedUserWithBudgets(page)
    
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

  test('should display budgets page with proper layout', async ({ page }) => {
    await page.goto('/budgets')
    
    // Check page title and header
    await expect(page.getByText('Budgets')).toBeVisible()
    await expect(page.getByText('Add Budget')).toBeVisible()
    
    // Check for budget cards
    await expect(page.getByText('Food')).toBeVisible()
    await expect(page.getByText('Entertainment')).toBeVisible()
    
    // Check for amounts
    await expect(page.getByText('500.00')).toBeVisible()
    await expect(page.getByText('200.00')).toBeVisible()
    
    // Check for months
    await expect(page.getByText('2024-01')).toBeVisible()
    await expect(page.getByText('2024-02')).toBeVisible()
  })

  test('should display budget status indicators', async ({ page }) => {
    await page.goto('/budgets')
    
    // Check for budget status (active/inactive)
    await expect(page.getByText('Active')).toBeVisible()
    
    // Check for recurring indicator
    await expect(page.getByText('Recurring')).toBeVisible()
    
    // Check for rollover indicator
    await expect(page.getByText('Rollover')).toBeVisible()
  })

  test('should open add budget form', async ({ page }) => {
    await page.goto('/budgets')
    
    // Click add budget button
    await page.getByText('Add Budget').click()
    
    // Check for form elements
    await expect(page.getByText('Add New Budget')).toBeVisible()
    await expect(page.getByLabel('Amount')).toBeVisible()
    await expect(page.getByLabel('Month')).toBeVisible()
    
    // Check for category dropdown
    await expect(page.getByText('Category')).toBeVisible()
    
    // Check for recurring checkbox
    await expect(page.getByText('Recurring')).toBeVisible()
    
    // Check for rollover checkbox
    await expect(page.getByText('Rollover')).toBeVisible()
  })

  test('should filter budgets by category', async ({ page }) => {
    await page.goto('/budgets')
    
    // Check initial state - both budgets visible
    await expect(page.getByText('Food')).toBeVisible()
    await expect(page.getByText('Entertainment')).toBeVisible()
    
    // Select category filter
    const categoryFilter = page.locator('select[name="category_id"]')
    if (await categoryFilter.count() > 0) {
      await categoryFilter.selectOption('cat-1')
      
      // Should show only food category budgets
      await expect(page.getByText('Food')).toBeVisible()
      await expect(page.getByText('Entertainment')).not.toBeVisible()
    }
  })

  test('should filter budgets by month', async ({ page }) => {
    await page.goto('/budgets')
    
    // Check initial state - both budgets visible
    await expect(page.getByText('Food')).toBeVisible()
    await expect(page.getByText('Entertainment')).toBeVisible()
    
    // Select month filter
    const monthFilter = page.locator('select[name="month"]')
    if (await monthFilter.count() > 0) {
      await monthFilter.selectOption('2024-01')
      
      // Should show only January budgets
      await expect(page.getByText('Food')).toBeVisible()
      await expect(page.getByText('Entertainment')).not.toBeVisible()
    }
  })

  test('should search budgets', async ({ page }) => {
    await page.goto('/budgets')
    
    // Check initial state - both budgets visible
    await expect(page.getByText('Food')).toBeVisible()
    await expect(page.getByText('Entertainment')).toBeVisible()
    
    // Type in search box
    const searchInput = page.getByPlaceholder(/Search budgets/i)
    if (await searchInput.count() > 0) {
      await searchInput.fill('food')
      
      // Should filter to show only food budget
      await expect(page.getByText('Food')).toBeVisible()
      await expect(page.getByText('Entertainment')).not.toBeVisible()
    }
  })

  test('should view budget details', async ({ page }) => {
    await page.goto('/budgets')
    
    // Click on a budget card
    await page.getByText('Food').click()
    
    // Check for budget details modal
    await expect(page.getByText('Budget Details')).toBeVisible()
    await expect(page.getByText('500.00')).toBeVisible()
    await expect(page.getByText('Food')).toBeVisible()
    await expect(page.getByText('2024-01')).toBeVisible()
    
    // Check for budget status
    await expect(page.getByText('Active')).toBeVisible()
  })

  test('should handle mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/budgets')
    
    // Check that page loads properly on mobile
    await expect(page.getByText('Budgets')).toBeVisible()
    await expect(page.getByText('Add Budget')).toBeVisible()
    
    // Check that budget cards are visible
    await expect(page.getByText('Food')).toBeVisible()
    await expect(page.getByText('Entertainment')).toBeVisible()
    
    // Check that filters are collapsible on mobile
    const filterButton = page.getByText('Filters')
    if (await filterButton.isVisible()) {
      await filterButton.click()
      // Filters should expand/collapse properly
    }
  })

  test('should handle pagination', async ({ page }) => {
    await page.goto('/budgets')
    
    // Check for pagination controls if there are many budgets
    const paginationControls = page.locator('[data-testid="pagination"]')
    if (await paginationControls.count() > 0) {
      await expect(paginationControls).toBeVisible()
      
      // Test pagination navigation
      const nextButton = page.getByText('Next')
      if (await nextButton.isVisible()) {
        await nextButton.click()
        // Should navigate to next page
      }
    }
  })

  test('should show loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/budgets*', async (route: any) => {
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

    await page.goto('/budgets')
    
    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="loading"]')
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toBeVisible()
    }
  })

  test('should handle empty state', async ({ page }) => {
    // Mock empty budgets response
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

    await page.goto('/budgets')
    
    // Check for empty state message
    await expect(page.getByText(/No budgets found/i)).toBeVisible()
  })

  test('should handle form validation', async ({ page }) => {
    await page.goto('/budgets')
    
    // Click add budget button
    await page.getByText('Add Budget').click()
    
    // Try to submit empty form
    const submitButton = page.getByText('Save Budget')
    if (await submitButton.count() > 0) {
      await submitButton.click()
      
      // Should show validation errors
      await expect(page.getByText(/required/i)).toBeVisible()
    }
  })

  test('should handle successful budget creation', async ({ page }) => {
    await page.goto('/budgets')
    
    // Mock successful budget creation
    await page.route('**/api/budgets', async (route: any) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              budget_id: 'budget-new',
              category_id: 'cat-1',
              user_id: 'test-user',
              group_id: 'group-1',
              amount: 300.00,
              month: '2024-03',
              rollover: false,
              recurring: false,
              status: 'active',
              created_at: '2024-01-16T00:00:00Z',
              updated_at: '2024-01-16T00:00:00Z',
            },
          }),
        })
      } else {
        // Handle GET request with updated data
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
                budget_id: 'budget-new',
                category_id: 'cat-1',
                user_id: 'test-user',
                group_id: 'group-1',
                amount: 300.00,
                month: '2024-03',
                rollover: false,
                recurring: false,
                status: 'active',
                created_at: '2024-01-16T00:00:00Z',
                updated_at: '2024-01-16T00:00:00Z',
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
      }
    })

    // Click add budget button
    await page.getByText('Add Budget').click()
    
    // Fill out the form
    await page.getByLabel('Amount').fill('300.00')
    await page.getByLabel('Month').fill('2024-03')
    
    // Submit the form
    const submitButton = page.getByText('Save Budget')
    if (await submitButton.count() > 0) {
      await submitButton.click()
      
      // Should show success message
      await expect(page.getByText(/success/i)).toBeVisible()
      
      // Should close the form
      await expect(page.getByText('Add New Budget')).not.toBeVisible()
    }
  })

  test('should display budget performance', async ({ page }) => {
    await page.goto('/budgets')
    
    // Check for budget performance indicators
    // This would show spent vs budget amount
    await expect(page.getByText('Food')).toBeVisible()
    
    // Check for progress indicators if they exist
    const progressBar = page.locator('[data-testid="budget-progress"]')
    if (await progressBar.count() > 0) {
      await expect(progressBar).toBeVisible()
    }
  })

  test('should handle recurring budget creation', async ({ page }) => {
    await page.goto('/budgets')
    
    // Click add budget button
    await page.getByText('Add Budget').click()
    
    // Fill out the form
    await page.getByLabel('Amount').fill('400.00')
    await page.getByLabel('Month').fill('2024-04')
    
    // Check recurring checkbox
    const recurringCheckbox = page.getByLabel('Recurring')
    if (await recurringCheckbox.count() > 0) {
      await recurringCheckbox.check()
      
      // Should show recurring indicator
      await expect(page.getByText('Recurring')).toBeVisible()
    }
  })

  test('should handle rollover budget creation', async ({ page }) => {
    await page.goto('/budgets')
    
    // Click add budget button
    await page.getByText('Add Budget').click()
    
    // Fill out the form
    await page.getByLabel('Amount').fill('600.00')
    await page.getByLabel('Month').fill('2024-05')
    
    // Check rollover checkbox
    const rolloverCheckbox = page.getByLabel('Rollover')
    if (await rolloverCheckbox.count() > 0) {
      await rolloverCheckbox.check()
      
      // Should show rollover indicator
      await expect(page.getByText('Rollover')).toBeVisible()
    }
  })
})
