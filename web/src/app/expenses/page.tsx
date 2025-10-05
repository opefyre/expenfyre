'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { User, getCurrentUser, authenticatedFetch } from '@/lib/auth'
import { Expense, Category, Budget, CreateExpenseData } from '@/lib/types'
import Layout from '@/components/Layout'
import { useLoading } from '@/contexts/LoadingContext'
import { useToastHelpers } from '@/contexts/ToastContext'
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext'
import { useData } from '@/contexts/DataContext'
import DatePicker from '@/components/DatePicker'
import MonthYearPicker from '@/components/MonthYearPicker'
import Pagination from '@/components/Pagination'
import TagInput from '@/components/TagInput'
import Select from '@/components/Select'
import FileUpload from '@/components/FileUpload'

export default function ExpensesPage() {
  const [user, setUser] = useState<User | null>(null)
  
  const { showLoading, hideLoading } = useLoading()
  const { showSuccess, showError } = useToastHelpers()

  const checkAuth = async () => {
    showLoading('Checking authentication...')
    try {
      const userData = await getCurrentUser()
      if (userData) {
        setUser(userData)
      } else {
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      window.location.href = '/'
    } finally {
      hideLoading()
    }
  }

  const handleSignOut = async () => {
    try {
      showLoading('Signing out...')
      await authenticatedFetch('/api/auth/signout', { method: 'POST' })
      // Clear cookies from browser
      document.cookie = 'access_token=; Secure; SameSite=None; Path=/; Max-Age=0'
      document.cookie = 'refresh_token=; Secure; SameSite=None; Path=/; Max-Age=0'
      setUser(null)
      showSuccess('Signed out successfully!')
      // Redirect to login page
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      showError('Sign out failed', 'Please try again.')
      // Still clear cookies and redirect even if API call fails
      document.cookie = 'access_token=; Secure; SameSite=None; Path=/; Max-Age=0'
      document.cookie = 'refresh_token=; Secure; SameSite=None; Path=/; Max-Age=0'
      window.location.href = '/'
    } finally {
      hideLoading()
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  if (!user) {
    return null
  }

  return (
    <Layout user={user} currentPage="/expenses" onSignOut={handleSignOut}>
      <ExpensesContent />
    </Layout>
  )
}

function ExpensesContent() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    category_id: '',
    budget_id: '',
    month: '',
    search: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 20
  })
  
  const { showLoading, hideLoading } = useLoading()
  const { showSuccess, showError, showInfo } = useToastHelpers()
  const { showConfirm } = useConfirmDialog()
  
  // Use global data context
  const { 
    expenses, 
    categories, 
    budgets, 
    loading, 
    error,
    addExpense, 
    updateExpense, 
    deleteExpense,
    getCategoryById,
    getBudgetById
  } = useData()

  // Helper function to get budget display name
  const getBudgetDisplayName = useCallback((budget: Budget | undefined) => {
    if (!budget) return 'Unknown'
    const category = getCategoryById(budget.category_id)
    return category ? `${category.name} (${budget.month})` : `Budget ${budget.budget_id.slice(-4)}`
  }, [getCategoryById])

  // Filter expenses based on current filters
  const filteredExpenses = useMemo(() => {
    let filtered = expenses

    // Filter by category
    if (filters.category_id) {
      filtered = filtered.filter(expense => expense.category_id === filters.category_id)
    }

    // Filter by budget
    if (filters.budget_id) {
      filtered = filtered.filter(expense => expense.budget_id === filters.budget_id)
    }

    // Filter by month
    if (filters.month) {
      filtered = filtered.filter(expense => expense.month === filters.month)
    }

    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(expense => 
        expense.description.toLowerCase().includes(searchTerm) ||
        expense.tags.toLowerCase().includes(searchTerm) ||
        getCategoryById(expense.category_id)?.name.toLowerCase().includes(searchTerm)
      )
    }

    return filtered
  }, [expenses, filters, getCategoryById])

  // Paginate filtered expenses
  const paginatedExpenses = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit
    const endIndex = startIndex + pagination.limit
    return filteredExpenses.slice(startIndex, endIndex)
  }, [filteredExpenses, pagination.page, pagination.limit])

  // Update pagination when filters change
  useEffect(() => {
    const totalPages = Math.ceil(filteredExpenses.length / pagination.limit)
    setPagination(prev => ({
      ...prev,
      totalPages,
      total: filteredExpenses.length,
      page: 1 // Reset to first page when filters change
    }))
  }, [filteredExpenses.length, pagination.limit])

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const clearFilters = () => {
    setFilters({
      category_id: '',
      budget_id: '',
      month: '',
      search: ''
    })
  }

  const hasActiveFilters = filters.category_id || filters.budget_id || filters.month || filters.search

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const handleAddExpense = async (expenseData: CreateExpenseData) => {
    try {
      showLoading('Creating expense...')
      
      const response = await authenticatedFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseData)
      })

      const data = await response.json()
      
      if (data.success) {
        await addExpense(data.data)
        setShowAddForm(false)
        showSuccess('Expense created successfully!')
      } else {
        showError(data.error || 'Failed to create expense')
      }
    } catch (error) {
      console.error('Error creating expense:', error)
      showError('Failed to create expense')
    } finally {
      hideLoading()
    }
  }

  const handleUpdateExpense = async (expenseId: string, updates: Partial<Expense>) => {
    try {
      showLoading('Updating expense...')
      
      const response = await authenticatedFetch(`/api/expenses/${expenseId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      })

      const data = await response.json()
      
      if (data.success) {
        await updateExpense(expenseId, updates)
        setEditingExpense(null)
        showSuccess('Expense updated successfully!')
      } else {
        showError(data.error || 'Failed to update expense')
      }
    } catch (error) {
      console.error('Error updating expense:', error)
      showError('Failed to update expense')
    } finally {
      hideLoading()
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    showConfirm({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        try {
          showLoading('Deleting expense...')
          
      const response = await authenticatedFetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE'
      })

          const data = await response.json()
          
          if (data.success) {
            await deleteExpense(expenseId)
            showSuccess('Expense deleted successfully!')
          } else {
            showError(data.error || 'Failed to delete expense')
      }
    } catch (error) {
          console.error('Error deleting expense:', error)
          showError('Failed to delete expense')
        } finally {
          hideLoading()
        }
      }
    })
  }

  return (
    <div className="h-full flex flex-col w-full max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
            <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
            <p className="text-slate-600 mt-1">Manage your expenses and track spending</p>
          </div>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add
                </button>
              </div>

              {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 mb-4 flex-shrink-0">
          {/* Mobile: Collapsible Filters with Toggle */}
          <div className="block sm:hidden">
            {/* Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    Active
                  </span>
                )}
              </div>
              <svg className={`w-5 h-5 text-slate-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Collapsible Filter Content */}
            {showFilters && (
              <div className="p-3 border-t border-slate-100">
                <div className="space-y-3">
                  {/* Search - Full Width */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search expenses..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Filter Row - 2 columns */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Category Filter */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                      <Select
                        value={filters.category_id}
                        onChange={(value) => setFilters(prev => ({ ...prev, category_id: value }))}
                        options={[
                          { value: '', label: 'All Categories' },
                          ...categories.map(cat => ({ value: cat.category_id, label: cat.name }))
                        ]}
                        placeholder="Select category"
                      />
                    </div>

                    {/* Budget Filter */}
                  <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Budget</label>
                      <Select
                      value={filters.budget_id}
                        onChange={(value) => setFilters(prev => ({ ...prev, budget_id: value }))}
                        options={[
                          { value: '', label: 'All Budgets' },
                          ...budgets.map(budget => ({ 
                            value: budget.budget_id, 
                            label: getBudgetDisplayName(budget)
                          }))
                        ]}
                        placeholder="Select budget"
                      />
                    </div>
                  </div>
                  
                  {/* Month Filter */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
                    <MonthYearPicker
                      value={filters.month}
                      onChange={(value) => setFilters(prev => ({ ...prev, month: value }))}
                      placeholder="Select month"
                    />
                  </div>
                  
                  {/* Clear Button */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Desktop: Horizontal Layout */}
          <div className="hidden sm:block p-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Search */}
              <div className="flex-1 min-w-64">
                <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
        <input
                      type="text"
                      placeholder="Search expenses..."
                      value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
              </div>

              {/* Category Filter */}
              <div className="min-w-48">
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <Select
                  value={filters.category_id}
                  onChange={(value) => setFilters(prev => ({ ...prev, category_id: value }))}
                  options={[
                    { value: '', label: 'All Categories' },
                    ...categories.map(cat => ({ value: cat.category_id, label: cat.name }))
                  ]}
                  placeholder="Select category"
                />
              </div>

              {/* Budget Filter */}
              <div className="min-w-48">
                <label className="block text-sm font-medium text-slate-700 mb-1">Budget</label>
                <Select
                  value={filters.budget_id}
                  onChange={(value) => setFilters(prev => ({ ...prev, budget_id: value }))}
                  options={[
                    { value: '', label: 'All Budgets' },
                    ...budgets.map(budget => ({ 
                      value: budget.budget_id, 
                      label: getBudgetDisplayName(budget)
                    }))
                  ]}
                  placeholder="Select budget"
                />
              </div>

              {/* Month Filter */}
              <div className="min-w-40">
                <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                <MonthYearPicker
                  value={filters.month}
                  onChange={(value) => setFilters(prev => ({ ...prev, month: value }))}
                  placeholder="Select month"
                />
                </div>
                
              {/* Clear Filters */}
              {hasActiveFilters && (
                    <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                  Clear
        </button>
              )}
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
          {loading.expenses ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error.expenses ? (
            <div className="text-center py-8">
              <p className="text-red-600">Error loading expenses: {error.expenses}</p>
            </div>
          ) : paginatedExpenses.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-slate-900">No expenses found</h3>
              <p className="mt-1 text-sm text-slate-500">
                {hasActiveFilters ? 'Try adjusting your filters' : 'Get started by adding your first expense'}
              </p>
                  </div>
                ) : (
            <div className="space-y-3">
              {paginatedExpenses.map((expense) => {
                const category = getCategoryById(expense.category_id)
                const budget = getBudgetById(expense.budget_id)
                
                return (
                  <div
                    key={expense.expense_id}
                    className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setViewingExpense(expense)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {expense.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {category?.name || 'Unknown'}
                              </span>
                              {budget && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                {getBudgetDisplayName(budget)}
                              </span>
                              )}
                              <span className="text-xs text-slate-500">
                                {new Date(expense.date).toLocaleDateString()}
                              </span>
                            </div>
                              {expense.tags && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {expense.tags.split(',').map((tag, index) => (
                                  <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                                      {tag.trim()}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                      </div>
                      <div className="flex items-center space-x-2">
                            <div className="text-right">
                          <p className="text-sm font-medium text-slate-900">
                                {formatCurrency(expense.amount)}
                              </p>
                            </div>
                        <div className="flex items-center space-x-1">
                              <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingExpense(expense)
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteExpense(expense.expense_id)
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredExpenses.length > pagination.limit && (
          <div className="flex-shrink-0 mt-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
            />
          </div>
        )}

        {/* Add/Edit Expense Form Modal */}
        {(showAddForm || editingExpense) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingExpense(null)
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
      </div>

        <ExpenseForm
          expense={editingExpense}
          categories={categories}
          budgets={budgets}
          getBudgetDisplayName={getBudgetDisplayName}
          onSubmit={editingExpense ? 
            (data) => handleUpdateExpense(editingExpense.expense_id, data) :
            handleAddExpense
          }
          onCancel={() => {
            setShowAddForm(false)
            setEditingExpense(null)
          }}
        />
              </div>
            </div>
          </div>
        )}

        {/* View Expense Modal */}
        {viewingExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Expense Details</h2>
                  <button
                    onClick={() => setViewingExpense(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <ExpenseViewModal
                  expense={viewingExpense}
                  categories={categories}
                  budgets={budgets}
                  getBudgetDisplayName={getBudgetDisplayName}
                  onEdit={() => {
                    setEditingExpense(viewingExpense)
                    setViewingExpense(null)
                  }}
                  onDelete={() => {
                    handleDeleteExpense(viewingExpense.expense_id)
                    setViewingExpense(null)
                  }}
                />
              </div>
            </div>
          </div>
      )}
    </div>
  )
}

// Expense Form Component
interface ExpenseFormProps {
  expense?: Expense | null
  categories: Category[]
  budgets: Budget[]
  getBudgetDisplayName: (budget: Budget | undefined) => string
  onSubmit: (data: any) => void
  onCancel: () => void
}

function ExpenseForm({ expense, categories, budgets, getBudgetDisplayName, onSubmit, onCancel }: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    category_id: expense?.category_id || '',
    budget_id: expense?.budget_id || '',
    amount: expense?.amount || 0,
    description: expense?.description || '',
    date: expense?.date || new Date().toISOString().split('T')[0],
    tags: expense?.tags || '',
    receipt_url: expense?.receipt_url || ''
  })
  
  // Debug: Log expense data to see if receipt_url is present
  console.log('ExpenseForm - expense data:', expense)
  console.log('ExpenseForm - receipt_url:', expense?.receipt_url)
  console.log('ExpenseForm - formData.receipt_url:', formData.receipt_url)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleFileUpload = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await authenticatedFetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error('Upload failed')
    }
    
    const result = await response.json()
    return result.data.url
  }

  return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
        <Select
          value={formData.category_id}
          onChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
          options={categories.map(cat => ({ value: cat.category_id, label: cat.name }))}
          placeholder="Select category"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Budget</label>
        <Select
          value={formData.budget_id}
          onChange={(value) => setFormData(prev => ({ ...prev, budget_id: value }))}
          options={budgets.map(budget => ({ 
            value: budget.budget_id, 
            label: getBudgetDisplayName(budget)
          }))}
          placeholder="Select budget"
            />
          </div>
          
            <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
          min="0"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              </div>
            
            <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
        <DatePicker
          value={formData.date}
          onChange={(value) => setFormData(prev => ({ ...prev, date: value }))}
        />
          </div>
          
          <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
        <TagInput
          value={formData.tags}
          onChange={(value) => setFormData(prev => ({ ...prev, tags: value }))}
          placeholder="Enter tags separated by commas"
        />
          </div>
          
          <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Receipt</label>
        
        {/* Show existing receipt if available */}
        {formData.receipt_url && (
          <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Current receipt</p>
                <button
                  type="button"
                  onClick={() => window.open(formData.receipt_url, '_blank')}
                  className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  Click to view
                </button>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, receipt_url: '' }))}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        <FileUpload
          value={formData.receipt_url}
          onChange={(value) => setFormData(prev => ({ ...prev, receipt_url: value }))}
          onUpload={handleFileUpload}
          className="w-full"
        />
          </div>
          
      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
        >
          {expense ? 'Update Expense' : 'Add Expense'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 py-2 px-4 rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// Expense View Modal Component
interface ExpenseViewModalProps {
  expense: Expense
  categories: Category[]
  budgets: Budget[]
  getBudgetDisplayName: (budget: Budget | undefined) => string
  onEdit: () => void
  onDelete: () => void
}

function ExpenseViewModal({ expense, categories, budgets, getBudgetDisplayName, onEdit, onDelete }: ExpenseViewModalProps) {
  const category = categories.find(cat => cat.category_id === expense.category_id)
  const budget = budgets.find(bud => bud.budget_id === expense.budget_id)
  
  // Debug: Log expense data to see if receipt_url is present
  console.log('ExpenseViewModal - expense data:', expense)
  console.log('ExpenseViewModal - receipt_url:', expense.receipt_url)

                return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{expense.description}</h3>
            <p className="text-2xl font-bold text-blue-600">${expense.amount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-slate-600">Category:</span>
          <span className="font-medium">{category?.name || 'Unknown'}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-slate-600">Budget:</span>
          <span className="font-medium">{getBudgetDisplayName(budget)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-slate-600">Date:</span>
          <span className="font-medium">{new Date(expense.date).toLocaleDateString()}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-slate-600">Month:</span>
          <span className="font-medium">{expense.month}</span>
          </div>
          
        {expense.tags && (
          <div>
            <span className="text-slate-600 block mb-2">Tags:</span>
            <div className="flex flex-wrap gap-1">
              {expense.tags.split(',').map((tag, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 rounded text-sm bg-slate-100 text-slate-600">
                  {tag.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {expense.receipt_url && (
          <div>
            <span className="text-slate-600 block mb-2">Receipt:</span>
            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Receipt attached</p>
                <button
                  onClick={() => window.open(expense.receipt_url, '_blank')}
                  className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  Click to view
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
          
      <div className="flex space-x-3 pt-4">
            <button
          onClick={onEdit}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
          Edit
            </button>
            <button
          onClick={onDelete}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
          Delete
            </button>
      </div>
    </div>
  )
}
