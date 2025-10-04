'use client'

import React, { createContext, useContext, ReactNode, useMemo } from 'react'
import { User } from '@/lib/auth'
import { Expense, Budget, Category } from '@/lib/types'
import { useExpenses, useBudgets, useCategories, cacheUtils } from '@/hooks/useDataFetching'

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
  // Only fetch data when user is authenticated
  const expensesQuery = useExpenses({}, { enabled: !!user })
  const budgetsQuery = useBudgets({}, { enabled: !!user })
  const categoriesQuery = useCategories({ enabled: !!user })

  // Memoized utility functions
  const getExpensesByMonth = useMemo(() => {
    return (month: string) => {
      return expensesQuery.data?.filter((expense: Expense) => expense.month === month) || []
    }
  }, [expensesQuery.data])

  const getBudgetsByMonth = useMemo(() => {
    return (month: string) => {
      return budgetsQuery.data?.filter((budget: Budget) => budget.month === month) || []
    }
  }, [budgetsQuery.data])

  const getCategoryById = useMemo(() => {
    return (categoryId: string) => {
      return categoriesQuery.data?.find((cat: Category) => cat.category_id === categoryId)
    }
  }, [categoriesQuery.data])

  const getBudgetById = useMemo(() => {
    return (budgetId: string) => {
      return budgetsQuery.data?.find((budget: Budget) => budget.budget_id === budgetId)
    }
  }, [budgetsQuery.data])

  // Cache management
  const invalidateCache = (type?: 'expenses' | 'budgets' | 'categories' | 'all') => {
    if (type === 'all' || !type) {
      cacheUtils.clear()
    } else {
      cacheUtils.clearByPattern(type)
    }
  }

  // Smart refresh helpers that trigger immediate refetch
  const addExpense = async (expense: Expense) => {
    // Invalidate cache and immediately refetch
    invalidateCache('expenses')
    await expensesQuery.refetch()
  }

  const updateExpense = async (expenseId: string, updates: Partial<Expense>) => {
    // Invalidate cache and immediately refetch
    invalidateCache('expenses')
    await expensesQuery.refetch()
  }

  const deleteExpense = async (expenseId: string) => {
    // Invalidate cache and immediately refetch
    invalidateCache('expenses')
    await expensesQuery.refetch()
  }

  const addBudget = async (budget: Budget) => {
    // Invalidate cache and immediately refetch
    invalidateCache('budgets')
    await budgetsQuery.refetch()
  }

  const updateBudget = async (budgetId: string, updates: Partial<Budget>) => {
    // Invalidate cache and immediately refetch
    invalidateCache('budgets')
    await budgetsQuery.refetch()
  }

  const deleteBudget = async (budgetId: string) => {
    // Invalidate cache and immediately refetch
    invalidateCache('budgets')
    await budgetsQuery.refetch()
  }

  const contextValue: DataContextType = {
    // Data
    expenses: expensesQuery.data || [],
    budgets: budgetsQuery.data || [],
    categories: categoriesQuery.data || [],
    
    // Loading states
    loading: {
      expenses: expensesQuery.loading,
      budgets: budgetsQuery.loading,
      categories: categoriesQuery.loading,
    },
    
    // Error states
    error: {
      expenses: expensesQuery.error,
      budgets: budgetsQuery.error,
      categories: categoriesQuery.error,
    },
    
    // Refetch functions
    refetchExpenses: expensesQuery.refetch,
    refetchBudgets: budgetsQuery.refetch,
    refetchCategories: categoriesQuery.refetch,
    
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