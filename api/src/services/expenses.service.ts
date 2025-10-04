// Expenses Service - Independent microservice for expense management
// This service can be used by any page without affecting auth or other services

import { AuthService } from './auth.service'

export interface Expense {
  expense_id: string
  category_id: string
  user_id: string
  group_id: string
  budget_id: string
  amount: number
  description: string
  date: string
  month: string
  receipt_url?: string
  tags: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Category {
  category_id: string
  name: string
  icon: string
  color: string
  is_default: boolean
  created_at: string
}

export interface Budget {
  budget_id: string
  category_id: string
  amount: number
  month: string
  rollover: boolean
  created_at: string
}

export class ExpensesService {
  constructor(private env: any) {}

  // Get Google Sheets service
  private async getSheetsService() {
    const authService = new AuthService(this.env)
    return await authService.getSheetsService()
  }

  // Get Google Drive service
  private async getDriveService() {
    const authService = new AuthService(this.env)
    return await authService.getDriveService()
  }

  // Get expenses for a user from Google Sheets
  async getExpenses(userEmail: string, filters?: {
    category_id?: string
    budget_id?: string
    group_id?: string
    month?: string
    date_from?: string
    date_to?: string
    tags?: string
    min_amount?: number
    max_amount?: number
    status?: string
    page?: number
    limit?: number
  }): Promise<{ expenses: Expense[], total: number, page: number, totalPages: number }> {
    try {
      console.log('[EXPENSES] Getting expenses for user:', userEmail)
      const sheets = await this.getSheetsService()
      const spreadsheetId = this.env.SHEET_ID
      
      if (!spreadsheetId) {
        console.log('[EXPENSES] SHEET_ID not configured')
        throw new Error('SHEET_ID not configured')
      }

      console.log('[EXPENSES] Getting expenses from sheet:', spreadsheetId)
      const range = 'Expenses!A:N' // Include group_id and status columns
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })

      console.log('[EXPENSES] Expenses response:', response.data)
      const rows = response.data.values || []
      console.log('[EXPENSES] Expenses rows:', rows)
      
      if (rows.length <= 1) {
        console.log('[EXPENSES] No expense data found, returning empty array')
        return { expenses: [], total: 0, page: 1, totalPages: 1 }
      }

      const headers = rows[0]
      const dataRows = rows.slice(1)
      console.log('[EXPENSES] Expense headers:', headers)
      console.log('[EXPENSES] Expense data rows:', dataRows)

      // Find column indices
      const expenseIdIndex = headers.indexOf('expense_id')        // A
      const categoryIdIndex = headers.indexOf('category_id')      // B
      const userIdIndex = headers.indexOf('user_id')              // C
      const groupIdIndex = headers.indexOf('group_id')            // D
      const budgetIdIndex = headers.indexOf('budget_id')          // E
      const amountIndex = headers.indexOf('amount')               // F
      const descriptionIndex = headers.indexOf('description')     // G
      const dateIndex = headers.indexOf('date')                   // H
      const monthIndex = headers.indexOf('month')                 // I
      const receiptUrlIndex = headers.indexOf('receipt_url')      // J
      const tagsIndex = headers.indexOf('tags')                   // K
      const statusIndex = headers.indexOf('status')               // L
      const createdAtIndex = headers.indexOf('created_at')        // M
      const updatedAtIndex = headers.indexOf('updated_at')        // N

      let expenses: Expense[] = dataRows.map(row => ({
        expense_id: row[expenseIdIndex] || '',                    // A
        category_id: row[categoryIdIndex] || '',                  // B
        user_id: row[userIdIndex] || '',                          // C
        group_id: row[groupIdIndex] || '',                        // D
        budget_id: row[budgetIdIndex] || '',                      // E
        amount: parseFloat(row[amountIndex]) || 0,                // F
        description: row[descriptionIndex] || '',                 // G
        date: row[dateIndex] || '',                               // H
        month: row[monthIndex] || '',                             // I
        receipt_url: row[receiptUrlIndex] || undefined,           // J
        tags: row[tagsIndex] || '',                               // K
        status: (row[statusIndex] || 'active') as 'active' | 'inactive',  // L
        created_at: row[createdAtIndex] || '',                    // M
        updated_at: row[updatedAtIndex] || ''                     // N
      }))

      console.log('[EXPENSES] All expenses before filtering:', expenses)

      // Get user's groups to determine access
      const { GroupsService } = await import('./groups.service')
      const groupsService = new GroupsService(this.env)
      const userGroups = await groupsService.getUserGroups(userEmail)
      const userGroupIds = userGroups.map(group => group.group_id)

      console.log('[EXPENSES] User groups:', userGroupIds)

      // Filter by user's groups (SECURITY: Only show expenses from user's groups)
      expenses = expenses.filter(expense => userGroupIds.includes(expense.group_id))
      console.log('[EXPENSES] Expenses after group filtering:', expenses)

      // Filter out inactive expenses by default (soft delete)
      expenses = expenses.filter(expense => expense.status === 'active')
      console.log('[EXPENSES] Expenses after active status filtering:', expenses)

      // Apply additional filters
      if (filters) {
        if (filters.category_id) {
          expenses = expenses.filter(expense => expense.category_id === filters.category_id)
        }
        if (filters.budget_id) {
          expenses = expenses.filter(expense => expense.budget_id === filters.budget_id)
        }
        if (filters.group_id) {
          expenses = expenses.filter(expense => expense.group_id === filters.group_id)
        }
        if (filters.month) {
          expenses = expenses.filter(expense => expense.month === filters.month)
        }
        if (filters.date_from) {
          expenses = expenses.filter(expense => expense.date >= filters.date_from!)
        }
        if (filters.date_to) {
          expenses = expenses.filter(expense => expense.date <= filters.date_to!)
        }
        if (filters.tags) {
          expenses = expenses.filter(expense => 
            expense.tags.toLowerCase().includes(filters.tags!.toLowerCase())
          )
        }
        if (filters.min_amount !== undefined) {
          expenses = expenses.filter(expense => expense.amount >= filters.min_amount!)
        }
        if (filters.max_amount !== undefined) {
          expenses = expenses.filter(expense => expense.amount <= filters.max_amount!)
        }
        if (filters.status) {
          expenses = expenses.filter(expense => expense.status === filters.status!)
        }
      }

      console.log('[EXPENSES] Final filtered expenses:', expenses)

      // Apply pagination
      const page = filters?.page || 1
      const limit = filters?.limit || 20
      const total = expenses.length
      const totalPages = Math.ceil(total / limit)
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedExpenses = expenses.slice(startIndex, endIndex)

      console.log('[EXPENSES] Pagination info:', { page, limit, total, totalPages, startIndex, endIndex })

      return {
        expenses: paginatedExpenses,
        total,
        page,
        totalPages
      }
    } catch (error) {
      console.error('Error getting expenses:', error)
      return {
        expenses: [],
        total: 0,
        page: 1,
        totalPages: 0
      }
    }
  }

  // Create new expense
  async createExpense(userEmail: string, expenseData: {
    category_id: string
    budget_id: string
    amount: number
    description: string
    date: string
    receipt_url?: string
    tags: string
    status?: 'active' | 'inactive'
  }): Promise<Expense> {
    try {
      console.log('[EXPENSES] Creating expense for user:', userEmail)
      
      const authService = new AuthService(this.env)
      const user = await authService.getUserByEmail(userEmail)
      if (!user) {
        console.log('[EXPENSES] User not found for email:', userEmail)
        throw new Error('User not found')
      }

      if (!user.default_group_id) {
        throw new Error('User has no group assigned. Please contact administrator.')
      }

      console.log('[EXPENSES] User found:', user.id)
      console.log('[EXPENSES] Using user default group:', user.default_group_id)
      const sheets = await this.getSheetsService()
      const spreadsheetId = this.env.SHEET_ID
      
      if (!spreadsheetId) {
        console.log('[EXPENSES] SHEET_ID not configured')
        throw new Error('SHEET_ID not configured')
      }

      const expenseId = `EXP${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      const now = new Date().toISOString()
      const month = expenseData.date.substring(0, 7) // YYYY-MM format

      const newExpense: Expense = {
        expense_id: expenseId,
        category_id: expenseData.category_id,
        user_id: user.id, // Use user.id instead of user.user_id
        group_id: user.default_group_id!, // Use user's default group
        budget_id: expenseData.budget_id,
        amount: expenseData.amount,
        description: expenseData.description,
        date: expenseData.date,
        month: month,
        receipt_url: expenseData.receipt_url,
        tags: expenseData.tags,
        status: expenseData.status || 'active', // Default to active
        created_at: now,
        updated_at: now
      }

      console.log('[EXPENSES] New expense data:', newExpense)

      // Truncate receipt_url if it's too long for Google Sheets (max 50,000 characters per cell)
      let receiptUrl = newExpense.receipt_url || ''
      if (receiptUrl.length > 50000) {
        console.log('[EXPENSES] Receipt URL too long, truncating from', receiptUrl.length, 'to 50000 characters')
        receiptUrl = receiptUrl.substring(0, 50000)
      }

      console.log('[EXPENSES] Receipt URL length:', receiptUrl.length)

      // Add to Google Sheets
      const range = 'Expenses!A:N' // Include group_id and status columns
      const values = [[
        newExpense.expense_id,        // A
        newExpense.category_id,       // B
        newExpense.user_id,           // C
        newExpense.group_id,          // D
        newExpense.budget_id,         // E
        newExpense.amount,            // F
        newExpense.description,       // G
        newExpense.date,              // H
        newExpense.month,             // I
        receiptUrl,                   // J - truncated receipt URL
        newExpense.tags,              // K
        newExpense.status,            // L
        newExpense.created_at,        // M
        newExpense.updated_at         // N
      ]]

      console.log('[EXPENSES] Values to append:', values)

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values }
      })

      console.log('[EXPENSES] Google Sheets append response:', response.data)
      console.log('[EXPENSES] Expense created successfully')
      return newExpense
    } catch (error) {
      console.error('Error creating expense:', error)
      throw error
    }
  }

  // Update expense
  async updateExpense(userEmail: string, expenseId: string, updates: {
    category_id?: string
    budget_id?: string
    amount?: number
    description?: string
    date?: string
    receipt_url?: string
    tags?: string
    status?: 'active' | 'inactive'
  }): Promise<Expense | null> {
    try {
      const authService = new AuthService(this.env)
      const user = await authService.getUserByEmail(userEmail)
      if (!user) {
        throw new Error('User not found')
      }

      const sheets = await this.getSheetsService()
      const spreadsheetId = this.env.SHEET_ID
      
      if (!spreadsheetId) {
        throw new Error('SHEET_ID not configured')
      }

      // Get all expenses to find the one to update (no pagination)
      const expensesResult = await this.getExpenses(userEmail, { 
        status: 'active',
        page: 1,
        limit: 10000 // Large number to get all expenses
      })
      const expense = expensesResult.expenses.find(e => e.expense_id === expenseId)
      
      if (!expense) return null

      // Update the expense
      const updatedExpense: Expense = {
        ...expense,
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Update month if date changed
      if (updates.date) {
        updatedExpense.month = updates.date.substring(0, 7)
      }

      // Find the row in the sheet and update it
      const range = 'Expenses!A:N' // Include all columns A to N
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })

      const rows = response.data.values || []
      const headers = rows[0]
      const dataRows = rows.slice(1)
      
      const expenseIdIndex = headers.indexOf('expense_id')
      const rowIndex = dataRows.findIndex(row => row[expenseIdIndex] === expenseId)
      
      if (rowIndex === -1) return null

      // Update the specific row
      const updateRange = `Expenses!A${rowIndex + 2}:N${rowIndex + 2}` // Include all columns A to N
      const values = [[
        updatedExpense.expense_id,        // A
        updatedExpense.category_id,       // B
        updatedExpense.user_id,           // C
        updatedExpense.group_id,          // D
        updatedExpense.budget_id,         // E
        updatedExpense.amount,            // F
        updatedExpense.description,       // G
        updatedExpense.date,              // H
        updatedExpense.month,             // I
        updatedExpense.receipt_url || '', // J
        updatedExpense.tags,              // K
        updatedExpense.status,            // L
        updatedExpense.created_at,        // M
        updatedExpense.updated_at         // N
      ]]

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: { values }
      })

      return updatedExpense
    } catch (error) {
      console.error('Error updating expense:', error)
      throw error
    }
  }

  // Delete expense
  async deleteExpense(userEmail: string, expenseId: string): Promise<boolean> {
    try {
      console.log('[EXPENSES] Starting delete expense for:', userEmail, expenseId)
      
      const authService = new AuthService(this.env)
      const user = await authService.getUserByEmail(userEmail)
      if (!user) {
        console.log('[EXPENSES] User not found for email:', userEmail)
        throw new Error('User not found')
      }

      console.log('[EXPENSES] User found:', user.id)
      
      const sheets = await this.getSheetsService()
      const spreadsheetId = this.env.SHEET_ID
      
      if (!spreadsheetId) {
        console.log('[EXPENSES] SHEET_ID not configured')
        throw new Error('SHEET_ID not configured')
      }

      console.log('[EXPENSES] Using spreadsheet:', spreadsheetId)

      // Find the row to soft delete (mark as inactive)
      const range = 'Expenses!A:N'
      console.log('[EXPENSES] Fetching data from range:', range)
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })

      const rows = response.data.values || []
      console.log('[EXPENSES] Total rows found:', rows.length)
      
      const headers = rows[0]
      const dataRows = rows.slice(1)
      console.log('[EXPENSES] Headers:', headers)
      console.log('[EXPENSES] Data rows count:', dataRows.length)
      
      const expenseIdIndex = headers.indexOf('expense_id')
      const statusIndex = headers.indexOf('status')
      const updatedAtIndex = headers.indexOf('updated_at')
      
      console.log('[EXPENSES] Column indices - expense_id:', expenseIdIndex, 'status:', statusIndex, 'updated_at:', updatedAtIndex)
      
      const rowIndex = dataRows.findIndex(row => row[expenseIdIndex] === expenseId)
      console.log('[EXPENSES] Row index for expense ID', expenseId, ':', rowIndex)
      
      if (rowIndex === -1) {
        console.log('[EXPENSES] Expense not found in sheet')
        return false
      }

      console.log('[EXPENSES] Found expense at row:', rowIndex + 2, 'current status:', dataRows[rowIndex][statusIndex])

      // Soft delete: Update status to 'inactive' and updated_at timestamp
      const updateRange = `Expenses!L${rowIndex + 2}:N${rowIndex + 2}` // Columns L (status) and N (updated_at)
      const now = new Date().toISOString()
      const values = [[
        'inactive',  // L - status
        now          // N - updated_at
      ]]

      console.log('[EXPENSES] Updating range:', updateRange, 'with values:', values)

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: { values }
      })

      console.log('[EXPENSES] Successfully updated expense status to inactive')
      return true
    } catch (error) {
      console.error('Error deleting expense:', error)
      throw error
    }
  }

  // Get categories
  async getCategories(): Promise<Category[]> {
    try {
      const sheets = await this.getSheetsService()
      const spreadsheetId = this.env.SHEET_ID
      
      if (!spreadsheetId) {
        console.log('[EXPENSES] SHEET_ID not configured')
        throw new Error('SHEET_ID not configured')
      }

      console.log('[EXPENSES] Getting categories from sheet:', spreadsheetId)
      const range = 'Categories!A:F'
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })

      console.log('[EXPENSES] Categories response:', response.data)
      const rows = response.data.values || []
      console.log('[EXPENSES] Categories rows:', rows)
      
      if (rows.length <= 1) {
        console.log('[EXPENSES] No category data found, returning empty array')
        return []
      }

      const headers = rows[0]
      const dataRows = rows.slice(1)
      console.log('[EXPENSES] Category headers:', headers)
      console.log('[EXPENSES] Category data rows:', dataRows)

      const categories = dataRows.map(row => ({
        category_id: row[0] || '',
        name: row[1] || '',
        icon: row[2] || '',
        color: row[3] || '',
        is_default: row[4] === 'true',
        created_at: row[5] || ''
      }))
      
      console.log('[EXPENSES] Processed categories:', categories)
      return categories
    } catch (error) {
      console.error('Error getting categories:', error)
      return []
    }
  }

  // Get budgets for a user
  async getBudgets(userEmail: string): Promise<Budget[]> {
    try {
      const authService = new AuthService(this.env)
      const user = await authService.getUserByEmail(userEmail)
      if (!user) {
        console.log('[EXPENSES] User not found for email:', userEmail)
        throw new Error('User not found')
      }

      console.log('[EXPENSES] Getting budgets for user:', user.id)
      const sheets = await this.getSheetsService()
      const spreadsheetId = this.env.SHEET_ID
      
      if (!spreadsheetId) {
        console.log('[EXPENSES] SHEET_ID not configured')
        throw new Error('SHEET_ID not configured')
      }

      console.log('[EXPENSES] Getting budgets from sheet:', spreadsheetId)
      const range = 'Budgets!A:F'
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })

      console.log('[EXPENSES] Budgets response:', response.data)
      const rows = response.data.values || []
      console.log('[EXPENSES] Budgets rows:', rows)
      
      if (rows.length <= 1) {
        console.log('[EXPENSES] No budget data found, returning empty array')
        return []
      }

      const headers = rows[0]
      const dataRows = rows.slice(1)
      console.log('[EXPENSES] Budget headers:', headers)
      console.log('[EXPENSES] Budget data rows:', dataRows)

      const budgets = dataRows.map(row => ({
        budget_id: row[0] || '',
        category_id: row[1] || '',
        amount: parseFloat(row[2]) || 0,
        month: row[3] || '',
        rollover: row[4] === 'true',
        created_at: row[5] || ''
      }))
      
      console.log('[EXPENSES] Processed budgets:', budgets)
      return budgets
    } catch (error) {
      console.error('Error getting budgets:', error)
      return []
    }
  }

  // Get total expenses for user
  async getTotalExpenses(userEmail: string): Promise<number> {
    const expenses = await this.getExpenses(userEmail)
    return expenses.reduce((total, expense) => total + expense.amount, 0)
  }

  // Get expenses by category
  async getExpensesByCategory(userEmail: string, categoryId: string): Promise<Expense[]> {
    return this.getExpenses(userEmail, { category_id: categoryId })
  }

  // Get expenses by month
  async getExpensesByMonth(userEmail: string, month: string): Promise<Expense[]> {
    return this.getExpenses(userEmail, { month })
  }

  // Upload file to Cloudflare KV storage
  async uploadFile(userEmail: string, file: File): Promise<string> {
    try {
      console.log('[UPLOAD] Starting file upload for user:', userEmail)
      
      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop() || 'jpg'
      const fileName = `receipt_${userEmail.replace('@', '_at_')}_${timestamp}.${fileExtension}`
      
      console.log('[UPLOAD] Converting file to buffer')
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      console.log('[UPLOAD] File size:', buffer.length, 'bytes')
      
      // Check file size (KV has 25MB limit)
      if (buffer.length > 25 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 25MB.')
      }
      
      // Convert to base64 for KV storage
      const base64Data = buffer.toString('base64')
      const dataUrl = `data:${file.type};base64,${base64Data}`
      
      console.log('[UPLOAD] Storing file in KV')
      
      // Store in KV with a unique key
      const kvKey = `file:${fileName}`
      await this.env.EXPENSE_KV.put(kvKey, dataUrl, {
        expirationTtl: 60 * 60 * 24 * 365 // 1 year
      })
      
      // Return a URL that can be used to retrieve the file
      const fileUrl = `https://expense-tracker-api.opefyre.workers.dev/api/file/${fileName}`
      
      console.log('[UPLOAD] File stored successfully:', fileUrl)
      return fileUrl
    } catch (error) {
      console.error('[UPLOAD] Error uploading file:', error)
      throw error
    }
  }
}

// Utility function to get expenses service instance
export function getExpensesService(env: any): ExpensesService {
  return new ExpensesService(env)
}
