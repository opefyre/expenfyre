// Analytics Service - Provides comprehensive expense and budget analytics
// This service aggregates data from expenses and budgets to provide insights

import { AuthService } from './auth.service'
import { ExpensesService } from './expenses.service'
import { BudgetsService } from './budgets.service'

export interface TimeSeriesData {
  date: string
  amount: number
  count: number
}

export interface CategoryBreakdown {
  category_id: string
  category_name: string
  total_amount: number
  expense_count: number
  percentage: number
  budget_amount: number
  remaining: number
  over_budget: boolean
}

export interface MonthlyComparison {
  month: string
  total_expenses: number
  total_budget: number
  expense_count: number
  budget_count: number
  variance: number
  variance_percentage: number
}

export interface BudgetPerformance {
  category_id: string
  category_name: string
  budget_amount: number
  spent_amount: number
  remaining: number
  utilization_percentage: number
  status: 'under' | 'near' | 'over'
}

export interface TopExpenses {
  expense_id: string
  description: string
  category_name: string
  amount: number
  date: string
}

export interface AnalyticsSummary {
  total_expenses: number
  total_budget: number
  expense_count: number
  budget_count: number
  average_expense: number
  largest_expense: number
  smallest_expense: number
  most_frequent_category: string
  budget_utilization: number
}

export class AnalyticsService {
  constructor(private env: any) {}

  // Get comprehensive analytics summary
  async getSummary(userEmail: string, filters?: {
    start_date?: string
    end_date?: string
    category_id?: string
    month?: string
  }): Promise<AnalyticsSummary> {
    try {
      console.log('[ANALYTICS] Getting summary for user:', userEmail)
      
      const expensesService = new ExpensesService(this.env)
      const budgetsService = new BudgetsService(this.env)

      const expensesResult = await expensesService.getExpenses(userEmail, {
        start_date: filters?.start_date,
        end_date: filters?.end_date,
        category_id: filters?.category_id
      })

      const budgetsResult = await budgetsService.getBudgets(userEmail, {
        category_id: filters?.category_id,
        month: filters?.month
      })

      const expenses = expensesResult.expenses
      const budgets = budgetsResult.budgets

      const total_expenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
      const total_budget = budgets.reduce((sum, bud) => sum + bud.amount, 0)
      const expense_count = expenses.length
      const budget_count = budgets.length
      const average_expense = expense_count > 0 ? total_expenses / expense_count : 0
      const largest_expense = expense_count > 0 ? Math.max(...expenses.map(e => e.amount)) : 0
      const smallest_expense = expense_count > 0 ? Math.min(...expenses.map(e => e.amount)) : 0
      
      const categoryFrequency: Record<string, number> = {}
      expenses.forEach(exp => {
        categoryFrequency[exp.category_id] = (categoryFrequency[exp.category_id] || 0) + 1
      })
      const most_frequent_category = Object.keys(categoryFrequency).length > 0
        ? Object.entries(categoryFrequency).sort((a, b) => b[1] - a[1])[0][0]
        : ''

      const budget_utilization = total_budget > 0 ? (total_expenses / total_budget) * 100 : 0

    return {
        total_expenses,
        total_budget,
        expense_count,
        budget_count,
        average_expense,
        largest_expense,
        smallest_expense,
        most_frequent_category,
        budget_utilization
      }
    } catch (error) {
      console.error('[ANALYTICS] Error getting summary:', error)
      throw new Error('Failed to get analytics summary')
    }
  }

  // Get category breakdown
  async getCategoryBreakdown(userEmail: string, filters?: {
    start_date?: string
    end_date?: string
    month?: string
  }): Promise<CategoryBreakdown[]> {
    try {
      console.log('[ANALYTICS] Getting category breakdown for user:', userEmail)

      const expensesService = new ExpensesService(this.env)
      const budgetsService = new BudgetsService(this.env)

      const [expensesResult, budgetsResult, allBudgetsResult, categoriesResult] = await Promise.all([
        expensesService.getExpenses(userEmail, {
          start_date: filters?.start_date,
          end_date: filters?.end_date
        }),
        budgetsService.getBudgets(userEmail, { month: filters?.month }),
        budgetsService.getBudgets(userEmail, {}), // Get all budgets for recurring check
        expensesService.getCategories()
      ])

      const expenses = expensesResult.expenses
      const budgets = budgetsResult.budgets
      const allBudgets = allBudgetsResult.budgets
      const categories = categoriesResult

      // Add recurring budgets that should apply to current month
      const currentMonth = filters?.month || new Date().toISOString().substring(0, 7)
      const recurringBudgets = allBudgets.filter(budget => 
        budget.recurring && 
        budget.status === 'active' &&
        budget.month <= currentMonth &&
        !budgets.find(b => b.budget_id === budget.budget_id) // Don't duplicate
      )
      
      // Combine regular and recurring budgets
      const allApplicableBudgets = [...budgets, ...recurringBudgets]

      // Clean expense data (remove leading apostrophes from dates/months)
      const cleanExpenses = expenses.map(expense => ({
        ...expense,
        date: expense.date.replace(/^'/, ''),
        month: expense.month.replace(/^'/, '')
      }))
      
      const total_expenses = cleanExpenses.reduce((sum, exp) => sum + exp.amount, 0)

      const categoryMap = new Map<string, {
        total_amount: number
        expense_count: number
        budget_amount: number
      }>()

      cleanExpenses.forEach(exp => {
        const current = categoryMap.get(exp.category_id) || { total_amount: 0, expense_count: 0, budget_amount: 0 }
        categoryMap.set(exp.category_id, {
          total_amount: current.total_amount + exp.amount,
          expense_count: current.expense_count + 1,
          budget_amount: current.budget_amount
        })
      })

      allApplicableBudgets.forEach(bud => {
        const current = categoryMap.get(bud.category_id) || { total_amount: 0, expense_count: 0, budget_amount: 0 }
        categoryMap.set(bud.category_id, {
          ...current,
          budget_amount: current.budget_amount + bud.amount
        })
      })

      const breakdown: CategoryBreakdown[] = Array.from(categoryMap.entries()).map(([category_id, data]) => {
        const category = categories.find(c => c.category_id === category_id)
        const percentage = total_expenses > 0 ? (data.total_amount / total_expenses) * 100 : 0
        const remaining = data.budget_amount - data.total_amount

    return {
          category_id,
          category_name: category?.name || 'Unknown',
          total_amount: data.total_amount,
          expense_count: data.expense_count,
          percentage,
          budget_amount: data.budget_amount,
          remaining,
          over_budget: remaining < 0
        }
      }).sort((a, b) => b.total_amount - a.total_amount)

      return breakdown
    } catch (error) {
      console.error('[ANALYTICS] Error getting category breakdown:', error)
      throw new Error('Failed to get category breakdown')
    }
  }

  // Get monthly comparison
  async getMonthlyComparison(userEmail: string, months?: number): Promise<MonthlyComparison[]> {
    try {
      console.log('[ANALYTICS] Getting monthly comparison for user:', userEmail)

      const expensesService = new ExpensesService(this.env)
      const budgetsService = new BudgetsService(this.env)

      const monthsToFetch = months || 6
      const comparisons: MonthlyComparison[] = []

      // Generate months from January of current year to current month
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth() + 1 // 1-based
      
      const monthsToShow = []
      for (let month = 1; month <= currentMonth; month++) {
        monthsToShow.push(`${currentYear}-${String(month).padStart(2, '0')}`)
      }
      
      console.log(`[ANALYTICS] Showing months from Jan ${currentYear} to current:`, monthsToShow)
      
      // Get all data once
      const allBudgetsResult = await budgetsService.getBudgets(userEmail, {})
      const allExpensesResult = await expensesService.getExpenses(userEmail, {})
      
      for (const month of monthsToShow) {

        console.log(`[ANALYTICS] Fetching data for month: ${month}`)

        try {
          // Use the data we already fetched
          const allBudgets = allBudgetsResult.budgets
          const allExpenses = allExpensesResult.expenses
          
          // Calculate total budget for this month
          let total_budget = 0
          let regularBudgets = 0
          let recurringBudgets = 0
          
          // Process all budgets to avoid double counting
          allBudgets.forEach(budget => {
            if (budget.status !== 'active') return
            
            // For recurring budgets, use created_at to determine start month
            if (budget.recurring && budget.month === 'recurring') {
              const createdDate = new Date(budget.created_at)
              const startMonth = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`
              if (month >= startMonth) {
                total_budget += budget.amount
                recurringBudgets++
                console.log(`[ANALYTICS] Recurring budget ${budget.budget_id}: amount=${budget.amount}, startMonth="${startMonth}", target="${month}"`)
              }
            } 
            // For non-recurring budgets, use exact month match
            else if (!budget.recurring && budget.month === month) {
              total_budget += budget.amount
              regularBudgets++
              console.log(`[ANALYTICS] Regular budget ${budget.budget_id}: amount=${budget.amount}, month="${budget.month}"`)
            }
          })

          // Parse expense data and filter by month
          const expenses = allExpenses.filter(expense => {
            // Clean the month field (remove leading apostrophe if present)
            const cleanMonth = expense.month.replace(/^'/, '')
            const matches = cleanMonth === month
            console.log(`[ANALYTICS] Expense ${expense.expense_id}: original month="${expense.month}", clean month="${cleanMonth}", target month="${month}", matches=${matches}`)
            return matches
          })
          
          console.log(`[ANALYTICS] Month ${month}: found ${expenses.length} expenses out of ${allExpenses.length} total`)
          console.log(`[ANALYTICS] Month ${month}: found ${recurringBudgets} recurring budgets, ${regularBudgets} regular budgets`)
          console.log(`[ANALYTICS] Month ${month}: total budget = ${total_budget}`)
          
          // Debug: Show sample expenses
          if (allExpenses.length > 0) {
            console.log(`[ANALYTICS] Sample expenses:`, allExpenses.slice(0, 3).map(exp => ({
              id: exp.expense_id,
              amount: exp.amount,
              date: exp.date,
              month: exp.month,
              cleanMonth: exp.month.replace(/^'/, '')
            })))
          }
          
          const total_expenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
          const variance = total_budget - total_expenses
          const variance_percentage = total_budget > 0 ? (variance / total_budget) * 100 : 0

          comparisons.push({
            month,
            total_expenses,
            total_budget,
            expense_count: expenses.length,
            budget_count: regularBudgets + recurringBudgets,
            variance,
            variance_percentage
          })
        } catch (monthError) {
          console.error(`[ANALYTICS] Error fetching data for month ${month}:`, monthError)
          // Add empty data for this month instead of failing
          comparisons.push({
            month,
            total_expenses: 0,
            total_budget: 0,
            expense_count: 0,
            budget_count: 0,
            variance: 0,
            variance_percentage: 0
          })
        }
      }

      return comparisons
    } catch (error) {
      console.error('[ANALYTICS] Error getting monthly comparison:', error)
      console.error('[ANALYTICS] Error stack:', error instanceof Error ? error.stack : 'No stack')
      throw error
    }
  }

  // Get budget performance
  async getBudgetPerformance(userEmail: string, month?: string): Promise<BudgetPerformance[]> {
    try {
      console.log('[ANALYTICS] Getting budget performance for user:', userEmail)

      const expensesService = new ExpensesService(this.env)
      const budgetsService = new BudgetsService(this.env)

      const currentMonth = month || new Date().toISOString().substring(0, 7)

      const [expensesResult, budgetsResult, allBudgetsResult, categoriesResult] = await Promise.all([
        expensesService.getExpenses(userEmail, { month: currentMonth }),
        budgetsService.getBudgets(userEmail, { month: currentMonth }),
        budgetsService.getBudgets(userEmail, {}), // Get all budgets for recurring check
        expensesService.getCategories()
      ])

      const expenses = expensesResult.expenses
      const budgets = budgetsResult.budgets
      const allBudgets = allBudgetsResult.budgets
      const categories = categoriesResult

      // Add recurring budgets that should apply to current month
      const recurringBudgets = allBudgets.filter(budget => {
        if (!budget.recurring || budget.status !== 'active') return false
        if (budgets.find(b => b.budget_id === budget.budget_id)) return false // Don't duplicate
        
        // For recurring budgets, use created_at to determine start month
        if (budget.month === 'recurring') {
          const createdDate = new Date(budget.created_at)
          const startMonth = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`
          return startMonth <= currentMonth
        }
        
        // For non-recurring budgets, use the month field directly
        return budget.month <= currentMonth
      })
      
      // Combine regular and recurring budgets
      const allApplicableBudgets = [...budgets, ...recurringBudgets]

      // Clean expense data (remove leading apostrophes from dates/months)
      const cleanExpenses = expenses.map(expense => ({
        ...expense,
        date: expense.date.replace(/^'/, ''),
        month: expense.month.replace(/^'/, '')
      }))

      const categorySpending = new Map<string, number>()
      cleanExpenses.forEach(exp => {
        categorySpending.set(exp.category_id, (categorySpending.get(exp.category_id) || 0) + exp.amount)
      })

      const performance: BudgetPerformance[] = allApplicableBudgets.map(budget => {
        const category = categories.find(c => c.category_id === budget.category_id)
        const spent_amount = categorySpending.get(budget.category_id) || 0
        const remaining = budget.amount - spent_amount
        const utilization_percentage = budget.amount > 0 ? (spent_amount / budget.amount) * 100 : 0

        let status: 'under' | 'near' | 'over' = 'under'
        if (utilization_percentage >= 100) status = 'over'
        else if (utilization_percentage >= 80) status = 'near'

        return {
          category_id: budget.category_id,
          category_name: category?.name || 'Unknown',
          budget_amount: budget.amount,
          spent_amount,
          remaining,
          utilization_percentage,
          status
        }
      }).sort((a, b) => b.utilization_percentage - a.utilization_percentage)

      return performance
    } catch (error) {
      console.error('[ANALYTICS] Error getting budget performance:', error)
      throw new Error('Failed to get budget performance')
    }
  }

  // Get top expenses
  async getTopExpenses(userEmail: string, limit: number = 10, filters?: {
    start_date?: string
    end_date?: string
    category_id?: string
  }): Promise<TopExpenses[]> {
    try {
      console.log('[ANALYTICS] Getting top expenses for user:', userEmail)

      const expensesService = new ExpensesService(this.env)
      const categoriesResult = await expensesService.getCategories()

      const expensesResult = await expensesService.getExpenses(userEmail, {
        start_date: filters?.start_date,
        end_date: filters?.end_date,
        category_id: filters?.category_id
      })

      const expenses = expensesResult.expenses
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit)
        .map(exp => {
          const category = categoriesResult.find(c => c.category_id === exp.category_id)
          return {
            expense_id: exp.expense_id,
            description: exp.description,
            category_name: category?.name || 'Unknown',
            amount: exp.amount,
            date: exp.date
          }
        })

      return expenses
    } catch (error) {
      console.error('[ANALYTICS] Error getting top expenses:', error)
      throw new Error('Failed to get top expenses')
    }
  }

  // Get daily spending trend
  async getDailyTrend(userEmail: string, filters?: {
    start_date?: string
    end_date?: string
  }): Promise<TimeSeriesData[]> {
    try {
      console.log('[ANALYTICS] Getting daily trend for user:', userEmail)

      const expensesService = new ExpensesService(this.env)
      const expensesResult = await expensesService.getExpenses(userEmail, {
        start_date: filters?.start_date,
        end_date: filters?.end_date
      })

      const expenses = expensesResult.expenses

      const dailyMap = new Map<string, { amount: number, count: number }>()
      expenses.forEach(exp => {
        const current = dailyMap.get(exp.date) || { amount: 0, count: 0 }
        dailyMap.set(exp.date, {
          amount: current.amount + exp.amount,
          count: current.count + 1
        })
      })

      const trend = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          amount: data.amount,
          count: data.count
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return trend
    } catch (error) {
      console.error('[ANALYTICS] Error getting daily trend:', error)
      throw new Error('Failed to get daily trend')
    }
  }

  // Get budget utilization over time
  async getBudgetUtilization(userEmail: string, months: number = 6): Promise<{
    month: string
    budget: number
    spent: number
    utilization: number
  }[]> {
    try {
      console.log('[ANALYTICS] Getting budget utilization for user:', userEmail)

      const expensesService = new ExpensesService(this.env)
      const budgetsService = new BudgetsService(this.env)

      const result = []
      const now = new Date()

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        console.log(`[ANALYTICS] Fetching utilization for month: ${month}`)

        try {
          const [expensesResult, budgetsResult] = await Promise.all([
            expensesService.getExpenses(userEmail, { month }),
            budgetsService.getBudgets(userEmail, { month })
          ])

          const budget = budgetsResult.budgets.reduce((sum, b) => sum + b.amount, 0)
          const spent = expensesResult.expenses.reduce((sum, e) => sum + e.amount, 0)
          const utilization = budget > 0 ? (spent / budget) * 100 : 0

          result.push({ month, budget, spent, utilization })
        } catch (monthError) {
          console.error(`[ANALYTICS] Error fetching utilization for month ${month}:`, monthError)
          // Add empty data for this month instead of failing
          result.push({ month, budget: 0, spent: 0, utilization: 0 })
        }
      }

      return result
    } catch (error) {
      console.error('[ANALYTICS] Error getting budget utilization:', error)
      console.error('[ANALYTICS] Error stack:', error instanceof Error ? error.stack : 'No stack')
      throw error
    }
  }
}

export function getAnalyticsService(env: any): AnalyticsService {
  return new AnalyticsService(env)
}
