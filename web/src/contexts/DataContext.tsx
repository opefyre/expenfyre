'use client'

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react'
import { User } from '@/lib/auth'
import { Expense, Budget, Category } from '@/lib/types'
import { authenticatedFetch } from '@/lib/auth'

interface DataContextType {
  // Data
  expenses: Expense[]
  budgets: Budget[]
  categories: Category[]
  
  // Loading states
  loading: {
    expenses: boolean
    budgets: boolean
    categories: boolean
  }
  
  // Error states
  error: {
    expenses: string | null
    budgets: string | null
    categories: string | null
  }
  
  // Refetch functions
  refetchExpenses: () => void
  refetchBudgets: () => void
  refetchCategories: () => void
  
  // Cache management
  invalidateCache: (type?: 'expenses' | 'budgets' | 'categories' | 'all') => void
  
  // Utility functions
  getExpensesByMonth: (month: string) => Expense[]
  getBudgetsByMonth: (month: string) => Budget[]
  getCategoryById: (categoryId: string) => Category | undefined
  getBudgetById: (budgetId: string) => Budget | undefined
  
  // Data modification helpers (smart refresh)
  addExpense: (expense: Expense) => Promise<void>
  updateExpense: (expenseId: string, updates: Partial<Expense>) => Promise<void>
  deleteExpense: (expenseId: string) => Promise<void>
  addBudget: (budget: Budget) => Promise<void>
  updateBudget: (budgetId: string, updates: Partial<Budget>) => Promise<void>
  deleteBudget: (budgetId: string) => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

interface DataProviderProps {
  children: ReactNode
  user: User | null
}

export function DataProvider({ children, user }: DataProviderProps) {
  // State management
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  
  const [loading, setLoading] = useState({
    expenses: false,
    budgets: false,
    categories: false,
  })
  
  const [error, setError] = useState({
    expenses: null as string | null,
    budgets: null as string | null,
    categories: null as string | null,
  })

  // Fetch functions
  const fetchExpenses = async () => {
    if (!user) return
    setLoading(prev => ({ ...prev, expenses: true }))
    try {
      const response = await authenticatedFetch('/api/expenses')
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])
        setError(prev => ({ ...prev, expenses: null }))
      } else {
        setError(prev => ({ ...prev, expenses: 'Failed to fetch expenses' }))
      }
    } catch (err) {
      setError(prev => ({ ...prev, expenses: 'Failed to fetch expenses' }))
    } finally {
      setLoading(prev => ({ ...prev, expenses: false }))
    }
  }

  const fetchBudgets = async () => {
    if (!user) return
    setLoading(prev => ({ ...prev, budgets: true }))
    try {
      const response = await authenticatedFetch('/api/budgets')
      if (response.ok) {
        const data = await response.json()
        setBudgets(data.budgets || [])
        setError(prev => ({ ...prev, budgets: null }))
      } else {
        setError(prev => ({ ...prev, budgets: 'Failed to fetch budgets' }))
      }
    } catch (err) {
      setError(prev => ({ ...prev, budgets: 'Failed to fetch budgets' }))
    } finally {
      setLoading(prev => ({ ...prev, budgets: false }))
    }
  }

  const fetchCategories = async () => {
    if (!user) return
    setLoading(prev => ({ ...prev, categories: true }))
    try {
      const response = await authenticatedFetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
        setError(prev => ({ ...prev, categories: null }))
      } else {
        setError(prev => ({ ...prev, categories: 'Failed to fetch categories' }))
      }
    } catch (err) {
      setError(prev => ({ ...prev, categories: 'Failed to fetch categories' }))
    } finally {
      setLoading(prev => ({ ...prev, categories: false }))
    }
  }

  // Initial data loading
  useEffect(() => {
    if (user) {
      fetchExpenses()
      fetchBudgets()
      fetchCategories()
    } else {
      // Clear data when user logs out
      setExpenses([])
      setBudgets([])
      setCategories([])
    }
  }, [user])

  // Memoized utility functions
  const getExpensesByMonth = useMemo(() => {
    return (month: string) => {
      return expenses.filter((expense: Expense) => expense.month === month)
    }
  }, [expenses])

  const getBudgetsByMonth = useMemo(() => {
    return (month: string) => {
      return budgets.filter((budget: Budget) => budget.month === month)
    }
  }, [budgets])

  const getCategoryById = useMemo(() => {
    return (categoryId: string) => {
      return categories.find((cat: Category) => cat.category_id === categoryId)
    }
  }, [categories])

  const getBudgetById = useMemo(() => {
    return (budgetId: string) => {
      return budgets.find((budget: Budget) => budget.budget_id === budgetId)
    }
  }, [budgets])

  // Cache management (simplified)
  const invalidateCache = (type?: 'expenses' | 'budgets' | 'categories' | 'all') => {
    // For now, just refetch the data
    if (type === 'all' || !type || type === 'expenses') fetchExpenses()
    if (type === 'all' || !type || type === 'budgets') fetchBudgets()
    if (type === 'all' || !type || type === 'categories') fetchCategories()
  }

  // Smart refresh helpers
  const addExpense = async (expense: Expense) => {
    await fetchExpenses()
  }

  const updateExpense = async (expenseId: string, updates: Partial<Expense>) => {
    await fetchExpenses()
  }

  const deleteExpense = async (expenseId: string) => {
    await fetchExpenses()
  }

  const addBudget = async (budget: Budget) => {
    await fetchBudgets()
  }

  const updateBudget = async (budgetId: string, updates: Partial<Budget>) => {
    await fetchBudgets()
  }

  const deleteBudget = async (budgetId: string) => {
    await fetchBudgets()
  }

  const contextValue: DataContextType = {
    // Data
    expenses,
    budgets,
    categories,
    
    // Loading states
    loading,
    
    // Error states
    error,
    
    // Refetch functions
    refetchExpenses: fetchExpenses,
    refetchBudgets: fetchBudgets,
    refetchCategories: fetchCategories,
    
    // Cache management
    invalidateCache,
    
    // Utility functions
    getExpensesByMonth,
    getBudgetsByMonth,
    getCategoryById,
    getBudgetById,
    
    // Data modification helpers
    addExpense,
    updateExpense,
    deleteExpense,
    addBudget,
    updateBudget,
    deleteBudget,
  }

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}