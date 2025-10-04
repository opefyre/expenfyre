// Budgets Service - Independent microservice for budget management
// This service can be used by any page without affecting auth or other services

import { AuthService } from './auth.service'

export interface Budget {
  budget_id: string
  category_id: string
  user_id: string
  group_id: string
  amount: number
  month: string
  rollover: boolean
  recurring: boolean
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface CreateBudgetData {
  category_id: string
  amount: number
  month: string
  rollover: boolean
  recurring: boolean
}

export interface UpdateBudgetData extends Partial<CreateBudgetData> {
  budget_id: string
}

export interface BudgetFilters {
  category_id?: string
  month?: string
  group_id?: string
}

export interface BudgetAnalytics {
  total_budget: number
  total_spent: number
  remaining: number
  percentage_used: number
  by_category: Array<{
    category_id: string
    category_name: string
    budget_amount: number
    spent_amount: number
    remaining: number
    percentage_used: number
  }>
}

export class BudgetsService {
  constructor(private env: any) {}

  // Get all budgets for a user with optional filters
  async getBudgets(
    userEmail: string, 
    filters: BudgetFilters = {}
  ): Promise<{ budgets: Budget[], total: number, page: number, totalPages: number }> {
    try {
      console.log('[BUDGETS] Fetching budgets for user:', userEmail)
      console.log('[BUDGETS] Filters:', filters)

      const authService = await this.getAuthService()
      const sheets = await authService.getSheetsService()

      // Get user's groups to determine access
      const { GroupsService } = await import('./groups.service')
      const groupsService = new GroupsService(this.env)
      const userGroups = await groupsService.getUserGroups(userEmail)
      const userGroupIds = userGroups.map(group => group.group_id)

      console.log('[BUDGETS] User groups:', userGroupIds)

      // Get all budgets from the sheet
      const range = 'Budgets!A:K' // budget_id, category_id, user_id, group_id, amount, month, rollover, recurring, status, created_at, updated_at
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.env.SHEET_ID,
        range: range
      })

      const rows = response.data.values || []
      console.log('[BUDGETS] Raw rows from sheet:', rows.length)

      if (rows.length <= 1) {
        console.log('[BUDGETS] No budget data found')
        return { budgets: [], total: 0, page: 1, totalPages: 1 }
      }

      // Parse headers
      const headers = rows[0]
      const budgetIdIndex = headers.indexOf('budget_id')
      const categoryIdIndex = headers.indexOf('category_id')
      const userIdIndex = headers.indexOf('user_id')
      const groupIdIndex = headers.indexOf('group_id')
      const amountIndex = headers.indexOf('amount')
      const monthIndex = headers.indexOf('month')
      const rolloverIndex = headers.indexOf('rollover')
      const recurringIndex = headers.indexOf('recurring')
      const statusIndex = headers.indexOf('status')
      const createdAtIndex = headers.indexOf('created_at')
      const updatedAtIndex = headers.indexOf('updated_at')

      console.log('[BUDGETS] Column indices:', {
        budgetIdIndex, categoryIdIndex, userIdIndex, groupIdIndex, amountIndex, monthIndex, rolloverIndex, recurringIndex, statusIndex, createdAtIndex, updatedAtIndex
      })

      // Parse budget data
      let budgets: Budget[] = rows.slice(1).map((row: any[]) => {
        const budget: Budget = {
          budget_id: row[budgetIdIndex] || '',
          category_id: row[categoryIdIndex] || '',
          user_id: row[userIdIndex] || '',
          group_id: row[groupIdIndex] || '',
          amount: parseFloat(row[amountIndex]) || 0,
          month: row[monthIndex] || '',
          rollover: row[rolloverIndex] === 'TRUE' || row[rolloverIndex] === true,
          recurring: row[recurringIndex] === 'TRUE' || row[recurringIndex] === true,
          status: (row[statusIndex] as 'active' | 'inactive') || 'active',
          created_at: row[createdAtIndex] || new Date().toISOString(),
          updated_at: row[updatedAtIndex] || new Date().toISOString()
        }
        return budget
      })

      console.log('[BUDGETS] Parsed budgets:', budgets.length)

      // Filter by user's groups (SECURITY: Only show budgets from user's groups)
      budgets = budgets.filter(budget => userGroupIds.includes(budget.group_id))
      console.log('[BUDGETS] Filtered by user groups:', budgets.length)

      // Filter out inactive budgets by default
      budgets = budgets.filter(budget => budget.status === 'active')
      console.log('[BUDGETS] Active budgets:', budgets.length)

      // Apply filters
      if (filters.category_id) {
        budgets = budgets.filter(budget => budget.category_id === filters.category_id)
        console.log('[BUDGETS] Filtered by category:', budgets.length)
      }

      if (filters.month) {
        budgets = budgets.filter(budget => 
          budget.month === filters.month || budget.recurring
        )
        console.log('[BUDGETS] Filtered by month (including recurring):', budgets.length)
      }

      if (filters.group_id) {
        budgets = budgets.filter(budget => budget.group_id === filters.group_id)
        console.log('[BUDGETS] Filtered by group:', budgets.length)
      }

      // Apply pagination
      const page = 1 // For now, return all budgets (can add pagination later)
      const totalPages = 1
      const total = budgets.length

      console.log('[BUDGETS] Final result:', { total, page, totalPages, budgetsCount: budgets.length })
      return { budgets, total, page, totalPages }
    } catch (error) {
      console.error('[BUDGETS] Error fetching budgets:', error)
      throw new Error('Failed to fetch budgets')
    }
  }

  // Create a new budget
  async createBudget(userEmail: string, budgetData: CreateBudgetData): Promise<Budget> {
    try {
      console.log('[BUDGETS] ========== CREATE BUDGET START ==========')
      console.log('[BUDGETS] User email:', userEmail)
      console.log('[BUDGETS] Budget data received:', JSON.stringify(budgetData, null, 2))

      console.log('[BUDGETS] Step 1: Getting auth service and user details')
      const authService = await this.getAuthService()
      const user = await authService.getUserByEmail(userEmail)
      console.log('[BUDGETS] User found:', user ? { id: user.id, email: user.email, name: user.name, default_group_id: user.default_group_id } : 'NULL')
      
      if (!user) {
        console.error('[BUDGETS] ERROR: User not found for email:', userEmail)
        throw new Error('User not found')
      }

      if (!user.default_group_id) {
        console.error('[BUDGETS] ERROR: User has no default group assigned:', userEmail)
        throw new Error('User has no group assigned. Please contact administrator.')
      }

      console.log('[BUDGETS] Step 2: Getting sheets service')
      const sheets = await authService.getSheetsService()
      console.log('[BUDGETS] Services initialized successfully')
      console.log('[BUDGETS] Using user default group:', user.default_group_id)

      // Generate unique budget ID
      console.log('[BUDGETS] Step 4: Generating budget ID')
      const budgetId = `BUD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      console.log('[BUDGETS] Generated budget ID:', budgetId)
      
      const now = new Date().toISOString()
      const newBudget: Budget = {
        budget_id: budgetId,
        category_id: budgetData.category_id,
        user_id: user.id,
        group_id: user.default_group_id!, // Use user's default group
        amount: budgetData.amount,
        month: budgetData.recurring ? 'recurring' : budgetData.month,
        rollover: budgetData.rollover,
        recurring: budgetData.recurring,
        status: 'active',
        created_at: now,
        updated_at: now
      }

      console.log('[BUDGETS] Step 5: New budget object created:', JSON.stringify(newBudget, null, 2))

      // Add to Google Sheets
      const range = 'Budgets!A:K'
      const values = [[
        newBudget.budget_id,        // A
        newBudget.category_id,      // B
        newBudget.user_id,          // C
        newBudget.group_id,         // D
        newBudget.amount,           // E
        newBudget.month,            // F
        newBudget.rollover,         // G
        newBudget.recurring,        // H
        newBudget.status,           // I
        newBudget.created_at,       // J
        newBudget.updated_at        // K
      ]]

      console.log('[BUDGETS] Step 6: Preparing to write to sheet')
      console.log('[BUDGETS] Range:', range)
      console.log('[BUDGETS] Values:', JSON.stringify(values, null, 2))
      console.log('[BUDGETS] Spreadsheet ID:', this.env.SHEET_ID)

      console.log('[BUDGETS] Step 7: Writing to Google Sheets...')
      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId: this.env.SHEET_ID,
        range: range,
        valueInputOption: 'RAW',
        requestBody: { values }
      })

      console.log('[BUDGETS] Step 8: Sheet append response:', JSON.stringify(appendResponse.data, null, 2))
      console.log('[BUDGETS] ========== CREATE BUDGET SUCCESS ==========')
      console.log('[BUDGETS] Budget created successfully:', budgetId)
      return newBudget
    } catch (error) {
      console.error('[BUDGETS] ========== CREATE BUDGET FAILED ==========')
      console.error('[BUDGETS] Error type:', error instanceof Error ? error.constructor.name : typeof error)
      console.error('[BUDGETS] Error message:', error instanceof Error ? error.message : String(error))
      console.error('[BUDGETS] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      console.error('[BUDGETS] Full error object:', error)
      throw error
    }
  }

  // Update an existing budget
  async updateBudget(userEmail: string, budgetId: string, updates: UpdateBudgetData): Promise<Budget> {
    try {
      console.log('[BUDGETS] Updating budget:', budgetId)
      console.log('[BUDGETS] Updates:', updates)

      const authService = await this.getAuthService()
      const sheets = await authService.getSheetsService()

      // Get all budgets to find the one to update
      const budgetsResult = await this.getBudgets(userEmail)
      const budget = budgetsResult.budgets.find(b => b.budget_id === budgetId)

      if (!budget) {
        throw new Error('Budget not found')
      }

      // Create updated budget
      const updatedBudget: Budget = {
        ...budget,
        ...updates,
        budget_id: budgetId, // Ensure ID doesn't change
        month: updates.recurring ? 'recurring' : (updates.month || budget.month),
        updated_at: new Date().toISOString()
      }

      console.log('[BUDGETS] Updated budget object:', updatedBudget)

      // Find the row index in the sheet
      const range = 'Budgets!A:K'
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.env.SHEET_ID,
        range: range
      })

      const rows = response.data.values || []
      const rowIndex = rows.findIndex((row: any[]) => row[0] === budgetId)

      if (rowIndex === -1) {
        throw new Error('Budget not found in sheet')
      }

      // Update the specific row
      const updateRange = `Budgets!A${rowIndex + 1}:K${rowIndex + 1}`
      const values = [[
        updatedBudget.budget_id,        // A
        updatedBudget.category_id,      // B
        updatedBudget.user_id,          // C
        updatedBudget.group_id,         // D
        updatedBudget.amount,           // E
        updatedBudget.month,            // F
        updatedBudget.rollover,         // G
        updatedBudget.recurring,        // H
        updatedBudget.status,           // I
        updatedBudget.created_at,       // J
        updatedBudget.updated_at        // K
      ]]

      console.log('[BUDGETS] Updating sheet range:', updateRange)
      console.log('[BUDGETS] Update values:', values)

      await sheets.spreadsheets.values.update({
        spreadsheetId: this.env.SHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: { values }
      })

      console.log('[BUDGETS] Budget updated successfully:', budgetId)
      return updatedBudget
    } catch (error) {
      console.error('[BUDGETS] Error updating budget:', error)
      throw new Error('Failed to update budget')
    }
  }

  // Delete a budget (soft delete by setting status to inactive)
  async deleteBudget(userEmail: string, budgetId: string): Promise<void> {
    try {
      console.log('[BUDGETS] Soft deleting budget:', budgetId)

      // Get the budget first
      const budgetsResult = await this.getBudgets(userEmail)
      const budget = budgetsResult.budgets.find(b => b.budget_id === budgetId)

      if (!budget) {
        throw new Error('Budget not found')
      }

      // Update the budget status to inactive
      const updatedBudget: Budget = {
        ...budget,
        status: 'inactive',
        updated_at: new Date().toISOString()
      }

      const authService = await this.getAuthService()
      const sheets = await authService.getSheetsService()

      // Find the row index in the sheet
      const range = 'Budgets!A:K'
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.env.SHEET_ID,
        range: range
      })

      const rows = response.data.values || []
      const rowIndex = rows.findIndex((row: any[]) => row[0] === budgetId)

      if (rowIndex === -1) {
        throw new Error('Budget not found in sheet')
      }

      // Update the specific row with inactive status
      const updateRange = `Budgets!A${rowIndex + 1}:K${rowIndex + 1}`
      const values = [[
        updatedBudget.budget_id,        // A
        updatedBudget.category_id,      // B
        updatedBudget.user_id,          // C
        updatedBudget.group_id,         // D
        updatedBudget.amount,           // E
        updatedBudget.month,            // F
        updatedBudget.rollover,         // G
        updatedBudget.recurring,        // H
        updatedBudget.status,           // I
        updatedBudget.created_at,       // J
        updatedBudget.updated_at        // K
      ]]

      console.log('[BUDGETS] Updating budget status to inactive:', updateRange)

      await sheets.spreadsheets.values.update({
        spreadsheetId: this.env.SHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: { values }
      })

      console.log('[BUDGETS] Budget soft deleted successfully:', budgetId)
    } catch (error) {
      console.error('[BUDGETS] Error soft deleting budget:', error)
      throw new Error('Failed to delete budget')
    }
  }

  // Get budget analytics
  async getBudgetAnalytics(userEmail: string, month?: string): Promise<BudgetAnalytics> {
    try {
      console.log('[BUDGETS] Getting budget analytics for user:', userEmail)
      console.log('[BUDGETS] Month filter:', month)

      // Get budgets - include recurring budgets for the specified month
      const budgetsResult = await this.getBudgets(userEmail, month ? { month } : {})
      const budgets = budgetsResult.budgets

      // Get expenses for the same month to calculate spending
      const expensesService = await this.getExpensesService()
      const expensesResult = await expensesService.getExpenses(userEmail, {
        month: month || new Date().toISOString().slice(0, 7), // YYYY-MM format
        status: 'active'
      })
      const expenses = expensesResult.expenses

      console.log('[BUDGETS] Found budgets:', budgets.length)
      console.log('[BUDGETS] Found expenses:', expenses.length)

      // Calculate analytics
      const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0)
      const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0)
      const remaining = totalBudget - totalSpent
      const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

      // Calculate by category
      const byCategory = budgets.map(budget => {
        const categoryExpenses = expenses.filter(expense => expense.category_id === budget.category_id)
        const spentAmount = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0)
        const remaining = budget.amount - spentAmount
        const percentageUsed = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0

        return {
          category_id: budget.category_id,
          category_name: '', // Will be populated by frontend
          budget_amount: budget.amount,
          spent_amount: spentAmount,
          remaining: remaining,
          percentage_used: percentageUsed
        }
      })

      const analytics: BudgetAnalytics = {
        total_budget: totalBudget,
        total_spent: totalSpent,
        remaining: remaining,
        percentage_used: percentageUsed,
        by_category: byCategory
      }

      console.log('[BUDGETS] Analytics calculated:', analytics)
      return analytics
    } catch (error) {
      console.error('[BUDGETS] Error getting budget analytics:', error)
      throw new Error('Failed to get budget analytics')
    }
  }

  // Helper method to get auth service
  private async getAuthService() {
    const { getAuthService } = await import('./auth.service')
    return getAuthService(this.env)
  }

  // Helper method to get expenses service
  private async getExpensesService() {
    const { getExpensesService } = await import('./expenses.service')
    return getExpensesService(this.env)
  }

}

export function getBudgetsService(env: any): BudgetsService {
  return new BudgetsService(env)
}