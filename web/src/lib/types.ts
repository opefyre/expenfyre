// Database Types - Updated Schema

export interface User {
  user_id: string
  google_id: string
  email: string
  name: string
  avatar_url?: string
  currency: string
  timezone: string
  created_at: string
}

export interface Category {
  category_id: string
  name: string
  icon: string
  color: string
  is_default: boolean
  created_at: string
}

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

export interface Group {
  group_id: string
  name: string
  description: string
  owner_email: string
  created_at: string
  updated_at: string
  status: 'active' | 'inactive'
}

export interface GroupMember {
  group_member_id: string
  group_id: string
  user_email: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  status: 'active' | 'inactive'
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Form Types
export interface CreateExpenseData {
  category_id: string
  budget_id: string
  amount: number
  description: string
  date: string
  receipt_url?: string
  tags: string
  status?: 'active' | 'inactive'
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  expense_id: string
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

// Filter and Search Types
export interface ExpenseFilters {
  category_id?: string
  budget_id?: string
  month?: string
  date_from?: string
  date_to?: string
  tags?: string
  min_amount?: number
  max_amount?: number
}

export interface BudgetFilters {
  category_id?: string
  month?: string
}

// Analytics Types
export interface ExpenseAnalytics {
  total_expenses: number
  total_by_category: Array<{
    category_id: string
    category_name: string
    amount: number
    percentage: number
  }>
  total_by_month: Array<{
    month: string
    amount: number
  }>
  average_daily: number
  average_monthly: number
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
