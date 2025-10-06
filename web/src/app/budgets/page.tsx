'use client'

import { useState, useEffect, useMemo } from 'react'
import { User, getCurrentUser, authenticatedFetch } from '@/lib/auth'
import { Budget, Category, CreateBudgetData, UpdateBudgetData } from '@/lib/types'
import Layout from '@/components/Layout'
import { useLoading } from '@/contexts/LoadingContext'
import { useToastHelpers } from '@/contexts/ToastContext'
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext'
import { useData } from '@/contexts/DataContext'
import MonthYearPicker from '@/components/MonthYearPicker'
import Select from '@/components/Select'
import Pagination from '@/components/Pagination'

export default function BudgetsPage() {
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
    <Layout user={user} currentPage="/budgets" onSignOut={handleSignOut}>
      <BudgetsContent />
    </Layout>
  )
}

function BudgetsContent() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  
  const [filters, setFilters] = useState({
    category_id: '',
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
  const { showSuccess, showError } = useToastHelpers()
  const { showConfirm } = useConfirmDialog()
  
  // Use global data context
  const { 
    budgets, 
    categories, 
    loading, 
    error,
    addBudget, 
    updateBudget, 
    deleteBudget,
    getCategoryById
  } = useData()

  // Filter budgets based on current filters
  const filteredBudgets = useMemo(() => {
    let filtered = budgets

    // Filter by category
    if (filters.category_id) {
      filtered = filtered.filter(budget => budget.category_id === filters.category_id)
    }

    // Filter by month
    if (filters.month) {
      filtered = filtered.filter(budget => budget.month === filters.month)
    }

    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(budget => {
        const category = getCategoryById(budget.category_id)
        return category?.name.toLowerCase().includes(searchTerm) ||
               budget.month.toLowerCase().includes(searchTerm)
      })
    }

    return filtered
  }, [budgets, filters, getCategoryById])

  // Paginate filtered budgets
  const paginatedBudgets = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit
    const endIndex = startIndex + pagination.limit
    return filteredBudgets.slice(startIndex, endIndex)
  }, [filteredBudgets, pagination.page, pagination.limit])

  // Update pagination when filters change
  useEffect(() => {
    const totalPages = Math.ceil(filteredBudgets.length / pagination.limit)
    setPagination(prev => ({
      ...prev,
      totalPages,
      total: filteredBudgets.length,
      page: 1 // Reset to first page when filters change
    }))
  }, [filteredBudgets.length, pagination.limit])

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const clearFilters = () => {
    setFilters({
      category_id: '',
      month: '',
      search: ''
    })
  }

  const hasActiveFilters = filters.category_id || filters.month || filters.search

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const handleAddBudget = async (budgetData: CreateBudgetData | UpdateBudgetData) => {
    try {
      showLoading('Creating budget...')
      
      const response = await authenticatedFetch('/api/budgets', {
        method: 'POST',
        body: JSON.stringify(budgetData)
      })

      const data = await response.json()
      
      if (data.success) {
        await addBudget(data.data)
        setShowAddForm(false)
        showSuccess('Budget created successfully!')
      } else {
        showError(data.error || 'Failed to create budget')
      }
    } catch (error) {
      console.error('Error creating budget:', error)
      showError('Failed to create budget')
    } finally {
      hideLoading()
    }
  }

  const handleUpdateBudget = async (budgetId: string, updates: Partial<Budget>) => {
    try {
      showLoading('Updating budget...')
      
      const response = await authenticatedFetch(`/api/budgets/${budgetId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      })

      const data = await response.json()
      
      if (data.success) {
        await updateBudget(budgetId, updates)
        setEditingBudget(null)
        showSuccess('Budget updated successfully!')
      } else {
        showError(data.error || 'Failed to update budget')
      }
    } catch (error) {
      console.error('Error updating budget:', error)
      showError('Failed to update budget')
    } finally {
      hideLoading()
    }
  }

  const handleDeleteBudget = async (budgetId: string) => {
    showConfirm({
      title: 'Delete Budget',
      message: 'Are you sure you want to delete this budget? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        try {
          showLoading('Deleting budget...')
          
          const response = await authenticatedFetch(`/api/budgets/${budgetId}`, {
            method: 'DELETE'
          })

          const data = await response.json()
          
          if (data.success) {
            await deleteBudget(budgetId)
            showSuccess('Budget deleted successfully!')
          } else {
            showError(data.error || 'Failed to delete budget')
          }
        } catch (error) {
          console.error('Error deleting budget:', error)
          showError('Failed to delete budget')
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Budgets</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your monthly budgets and track spending</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Budget
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 mb-4 flex-shrink-0">
        {/* Mobile: Collapsible Filters with Toggle */}
        <div className="block sm:hidden">
          {/* Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Active
                </span>
              )}
            </div>
            <svg className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search budgets..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Filter Row - 2 columns */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
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

                  {/* Month Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
                    <MonthYearPicker
                      value={filters.month}
                      onChange={(value) => setFilters(prev => ({ ...prev, month: value }))}
                      placeholder="Select month"
                    />
                  </div>
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
                  placeholder="Search budgets..."
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

      {/* Budgets List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
        {loading.budgets ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error.budgets ? (
          <div className="text-center py-8">
            <p className="text-red-600">Error loading budgets: {error.budgets}</p>
          </div>
        ) : paginatedBudgets.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">No budgets found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Get started by adding your first budget'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedBudgets.map((budget) => {
              const category = getCategoryById(budget.category_id)
              
              return (
                <div
                  key={budget.budget_id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {category?.name || 'Unknown'}
                            </span>
                            {budget.recurring && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Recurring
                              </span>
                            )}
                            <span className="text-xs text-slate-500">
                              {budget.month}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">
                          {formatCurrency(budget.amount)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setEditingBudget(budget)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteBudget(budget.budget_id)}
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
      {filteredBudgets.length > pagination.limit && (
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

      {/* Add/Edit Budget Form Modal */}
      {(showAddForm || editingBudget) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editingBudget ? 'Edit Budget' : 'Add New Budget'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingBudget(null)
                  }}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <BudgetForm
                budget={editingBudget}
                categories={categories}
                onSubmit={editingBudget ? 
                  (data) => handleUpdateBudget(editingBudget.budget_id, data) :
                  handleAddBudget
                }
                onCancel={() => {
                  setShowAddForm(false)
                  setEditingBudget(null)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Budget Form Component
interface BudgetFormProps {
  budget?: Budget | null
  categories: Category[]
  onSubmit: (data: CreateBudgetData | UpdateBudgetData) => void
  onCancel: () => void
}

function BudgetForm({ budget, categories, onSubmit, onCancel }: BudgetFormProps) {
  const [formData, setFormData] = useState({
    category_id: budget?.category_id || '',
    amount: budget?.amount || 0,
    month: budget?.month || '',
    rollover: budget?.rollover || false,
    recurring: budget?.recurring || false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
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
        <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
        <MonthYearPicker
          value={formData.month}
          onChange={(value) => setFormData(prev => ({ ...prev, month: value }))}
          placeholder="Select month"
          disabled={formData.recurring}
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.rollover}
            onChange={(e) => setFormData(prev => ({ ...prev, rollover: e.target.checked }))}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-700">Allow rollover to next month</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.recurring}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              recurring: e.target.checked,
              month: e.target.checked ? 'recurring' : ''
            }))}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-700">Recurring monthly budget</span>
        </label>
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
        >
          {budget ? 'Update Budget' : 'Add Budget'}
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
