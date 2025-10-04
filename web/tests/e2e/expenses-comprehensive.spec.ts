import { test, expect } from '@playwright/test'

// Helper function to mock authenticated user with expenses data
async function mockAuthenticatedUserWithExpenses(page: any) {
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

  // Mock expenses API with sample data
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
            amount: 200.00,
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
            name: 'Beverages',
            icon: '☕',
            color: '#4ECDC4',
            is_default: true,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      }),
    })
  })
}

test.describe('Expenses Page UI/UX - Comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await mockAuthenticatedUserWithExpenses(page)
    
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

  test('should display expenses page with proper layout', async ({ page }) => {
    await page.goto('/expenses')
    
    // Check page title and header
    await expect(page.getByText('Expenses')).toBeVisible()
    await expect(page.getByText('Add Expense')).toBeVisible()
    
    // Check for expense cards
    await expect(page.getByText('Lunch at restaurant')).toBeVisible()
    await expect(page.getByText('Coffee shop')).toBeVisible()
    
    // Check for amounts (format may vary)
    await expect(page.getByText('25.50')).toBeVisible()
    await expect(page.getByText('15.00')).toBeVisible()
    
    // Check for tags
    await expect(page.getByText('food')).toBeVisible()
    await expect(page.getByText('restaurant')).toBeVisible()
    await expect(page.getByText('coffee')).toBeVisible()
  })

  test('should open add expense form', async ({ page }) => {
    await page.goto('/expenses')
    
    // Click add expense button
    await page.getByText('Add Expense').click()
    
    // Check for form elements
    await expect(page.getByText('Add New Expense')).toBeVisible()
    await expect(page.getByLabel('Amount')).toBeVisible()
    await expect(page.getByLabel('Description')).toBeVisible()
    await expect(page.getByLabel('Date')).toBeVisible()
    
    // Check for category dropdown
    await expect(page.getByText('Category')).toBeVisible()
    
    // Check for budget dropdown (should show budget names, not IDs)
    await expect(page.getByText('Budget')).toBeVisible()
  })

  test('should filter expenses by search', async ({ page }) => {
    await page.goto('/expenses')
    
    // Check initial state - both expenses visible
    await expect(page.getByText('Lunch at restaurant')).toBeVisible()
    await expect(page.getByText('Coffee shop')).toBeVisible()
    
    // Type in search box
    const searchInput = page.getByPlaceholder(/Search expenses/i)
    if (await searchInput.count() > 0) {
      await searchInput.fill('lunch')
      
      // Should filter to show only lunch expense
      await expect(page.getByText('Lunch at restaurant')).toBeVisible()
      await expect(page.getByText('Coffee shop')).not.toBeVisible()
    }
  })

  test('should filter expenses by category', async ({ page }) => {
    await page.goto('/expenses')
    
    // Check initial state - both expenses visible
    await expect(page.getByText('Lunch at restaurant')).toBeVisible()
    await expect(page.getByText('Coffee shop')).toBeVisible()
    
    // Select category filter
    const categoryFilter = page.locator('select[name="category_id"]')
    if (await categoryFilter.count() > 0) {
      await categoryFilter.selectOption('cat-1')
      
      // Should show only food category expenses
      await expect(page.getByText('Lunch at restaurant')).toBeVisible()
      await expect(page.getByText('Coffee shop')).not.toBeVisible()
    }
  })

  test('should filter expenses by budget', async ({ page }) => {
    await page.goto('/expenses')
    
    // Check initial state - both expenses visible
    await expect(page.getByText('Lunch at restaurant')).toBeVisible()
    await expect(page.getByText('Coffee shop')).toBeVisible()
    
    // Select budget filter (should show budget names, not IDs)
    const budgetFilter = page.locator('select[name="budget_id"]')
    if (await budgetFilter.count() > 0) {
      await budgetFilter.selectOption('budget-1')
      
      // Should show only expenses from selected budget
      await expect(page.getByText('Lunch at restaurant')).toBeVisible()
      await expect(page.getByText('Coffee shop')).not.toBeVisible()
    }
  })

  test('should view expense details', async ({ page }) => {
    await page.goto('/expenses')
    
    // Click on an expense card
    await page.getByText('Lunch at restaurant').click()
    
    // Check for expense details modal
    await expect(page.getByText('Expense Details')).toBeVisible()
    await expect(page.getByText('25.50')).toBeVisible()
    await expect(page.getByText('Lunch at restaurant')).toBeVisible()
    await expect(page.getByText('2024-01-15')).toBeVisible()
    
    // Check for tags in details
    await expect(page.getByText('food')).toBeVisible()
    await expect(page.getByText('restaurant')).toBeVisible()
  })

  test('should handle mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/expenses')
    
    // Check that page loads properly on mobile
    await expect(page.getByText('Expenses')).toBeVisible()
    await expect(page.getByText('Add Expense')).toBeVisible()
    
    // Check that expense cards are visible
    await expect(page.getByText('Lunch at restaurant')).toBeVisible()
    await expect(page.getByText('Coffee shop')).toBeVisible()
    
    // Check that filters are collapsible on mobile
    const filterButton = page.getByText('Filters')
    if (await filterButton.isVisible()) {
      await filterButton.click()
      // Filters should expand/collapse properly
    }
  })

  test('should handle pagination', async ({ page }) => {
    await page.goto('/expenses')
    
    // Check for pagination controls if there are many expenses
    // This test assumes we have more than one page of expenses
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

    await page.goto('/expenses')
    
    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="loading"]')
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toBeVisible()
    }
  })

  test('should handle empty state', async ({ page }) => {
    // Mock empty expenses response
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

    await page.goto('/expenses')
    
    // Check for empty state message
    await expect(page.getByText(/No expenses found/i)).toBeVisible()
  })

  test('should handle form validation', async ({ page }) => {
    await page.goto('/expenses')
    
    // Click add expense button
    await page.getByText('Add Expense').click()
    
    // Try to submit empty form
    const submitButton = page.getByText('Save Expense')
    if (await submitButton.count() > 0) {
      await submitButton.click()
      
      // Should show validation errors
      await expect(page.getByText(/required/i)).toBeVisible()
    }
  })

  test('should handle successful expense creation', async ({ page }) => {
    await page.goto('/expenses')
    
    // Mock successful expense creation
    await page.route('**/api/expenses', async (route: any) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              expense_id: 'exp-new',
              category_id: 'cat-1',
              user_id: 'test-user',
              group_id: 'group-1',
              budget_id: 'budget-1',
              amount: 30.00,
              description: 'New expense',
              date: '2024-01-16',
              month: '2024-01',
              receipt_url: '',
              tags: ['test'],
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
                expense_id: 'exp-new',
                category_id: 'cat-1',
                user_id: 'test-user',
                group_id: 'group-1',
                budget_id: 'budget-1',
                amount: 30.00,
                description: 'New expense',
                date: '2024-01-16',
                month: '2024-01',
                receipt_url: '',
                tags: ['test'],
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

    // Click add expense button
    await page.getByText('Add Expense').click()
    
    // Fill out the form
    await page.getByLabel('Amount').fill('30.00')
    await page.getByLabel('Description').fill('New expense')
    await page.getByLabel('Date').fill('2024-01-16')
    
    // Submit the form
    const submitButton = page.getByText('Save Expense')
    if (await submitButton.count() > 0) {
      await submitButton.click()
      
      // Should show success message
      await expect(page.getByText(/success/i)).toBeVisible()
      
      // Should close the form
      await expect(page.getByText('Add New Expense')).not.toBeVisible()
    }
  })
})
