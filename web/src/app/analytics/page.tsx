'use client'

import { useState, useEffect } from 'react'
import { User, getCurrentUser, authenticatedFetch } from '@/lib/auth'
import { Category } from '@/lib/types'
import Layout from '@/components/Layout'
import { useLoading } from '@/contexts/LoadingContext'
import { useToastHelpers } from '@/contexts/ToastContext'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter, ComposedChart } from 'recharts'

interface AnalyticsSummary {
  total_expenses: number
  total_budget: number
  expense_count: number
  budget_count: number
  average_expense: number
  budget_utilization: number
}

interface CategoryBreakdown {
  category_id: string
  category_name: string
  total_amount: number
  expense_count: number
  percentage: number
  budget_amount: number
  remaining: number
  over_budget: boolean
}

interface MonthlyComparison {
  month: string
  total_expenses: number
  total_budget: number
  expense_count: number
  budget_count: number
  variance: number
  variance_percentage: number
}

interface BudgetPerformance {
  category_id: string
  category_name: string
  budget_amount: number
  spent_amount: number
  remaining: number
  utilization_percentage: number
  status: 'under' | 'near' | 'over'
}

interface SpendingVelocityData {
  date: string
  daily_spending: number
  transaction_count: number
  expenses: {
    expense_id: string
    amount: number
    category_id: string
    category_name: string
    description: string
  }[]
}


export default function AnalyticsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([])
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison[]>([])
  const [budgetPerformance, setBudgetPerformance] = useState<BudgetPerformance[]>([])
  const [spendingVelocity, setSpendingVelocity] = useState<SpendingVelocityData[]>([])

  const { showLoading, hideLoading } = useLoading()
  const { showSuccess, showError } = useToastHelpers()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      // Add a small delay to ensure auth state is fully ready
      const timer = setTimeout(() => {
        loadData()
      }, 200)
      
      return () => clearTimeout(timer)
    }
  }, [user])

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

  const loadData = async () => {
    try {
      showLoading('Loading analytics...')

      const params = new URLSearchParams()
      // No filters needed - analytics service handles the date range automatically

      // Load only essential data to reduce API calls

      const [
        summaryRes, 
        categoriesRes, 
        categoryBreakdownRes, 
        monthlyComparisonRes, 
        budgetPerformanceRes,
        spendingVelocityRes
      ] = await Promise.all([
        authenticatedFetch(`/api/analytics/summary?${params.toString()}`),
        authenticatedFetch('/api/categories'),
        authenticatedFetch(`/api/analytics/category-breakdown?${params.toString()}`),
        authenticatedFetch(`/api/analytics/monthly-comparison?months=12`),
        authenticatedFetch(`/api/analytics/budget-performance?month=${new Date().toISOString().substring(0, 7)}`),
        authenticatedFetch(`/api/analytics/spending-velocity?days=30`)
      ])

      const [
        summaryData,
        categoriesData,
        categoryBreakdownData,
        monthlyComparisonData,
        budgetPerformanceData,
        spendingVelocityData
      ] = await Promise.all([
        summaryRes.json(),
        categoriesRes.json(),
        categoryBreakdownRes.json(),
        monthlyComparisonRes.json(),
        budgetPerformanceRes.json(),
        spendingVelocityRes.json()
      ])

      if (summaryData.success) setSummary(summaryData.data)
      if (categoriesData.success) setCategories(categoriesData.data)
      if (categoryBreakdownData.success) setCategoryBreakdown(categoryBreakdownData.data)
      if (monthlyComparisonData.success) setMonthlyComparison(monthlyComparisonData.data)
      if (budgetPerformanceData.success) setBudgetPerformance(budgetPerformanceData.data)
      if (spendingVelocityData.success) setSpendingVelocity(spendingVelocityData.data)

    } catch (error) {
      console.error('Error loading analytics:', error)
      showError('Failed to load analytics', 'Please try again later')
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    })
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1']

  if (!user) return null

  return (
    <Layout user={user} currentPage="/analytics" onSignOut={handleSignOut}>
      <div className="h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
            <p className="text-sm text-slate-500 mt-1">Key insights and trends for your expenses</p>
          </div>
        </div>

        {/* Filters */}

        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
          <div className="space-y-6 w-full max-w-full">
            {/* 1. Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm opacity-90">Total Spent</span>
                    <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total_expenses)}</p>
                  <p className="text-xs opacity-75 mt-1">{summary.expense_count} transactions</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm opacity-90">Total Budget</span>
                    <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total_budget)}</p>
                  <p className="text-xs opacity-75 mt-1">{summary.budget_count} budgets</p>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm opacity-90">Avg. Expense</span>
                    <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(summary.average_expense)}</p>
                  <p className="text-xs opacity-75 mt-1">per transaction</p>
                </div>

                <div className={`bg-gradient-to-br rounded-xl p-5 ${
                  summary.budget_utilization > 100 ? 'from-red-500 to-red-600 text-white' : 
                  summary.budget_utilization > 80 ? 'from-orange-500 to-orange-600 text-white' : 
                  'from-emerald-500 to-emerald-600 text-white'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Budget Usage</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-3xl font-bold">{summary.budget_utilization.toFixed(1)}%</p>
                  <p className="text-xs mt-1 opacity-90">
                    {summary.budget_utilization > 100 ? 'Over budget!' : 
                     summary.budget_utilization > 80 ? 'Near limit' : 
                     'On track'}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Monthly Overview */}
            {monthlyComparison.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Overview</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={formatMonth} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      labelFormatter={formatMonth}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total_expenses" 
                      name="Expenses" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total_budget" 
                      name="Budget" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 3. Spending Velocity & Category Performance */}
            {spendingVelocity.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Spending Velocity & Transaction Patterns</h3>
                <p className="text-sm text-slate-600 mb-4">Daily spending trends and individual transaction analysis over the last 30 days</p>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={spendingVelocity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length && label) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                              <p className="font-medium">{new Date(label as string).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}</p>
                              <p className="text-sm text-slate-600">Daily Spending: {formatCurrency(data.daily_spending)}</p>
                              <p className="text-sm text-slate-600">Transactions: {data.transaction_count}</p>
                              {data.expenses.length > 0 && (
                                <div className="mt-2 max-h-32 overflow-y-auto">
                                  <p className="text-xs font-medium text-slate-700 mb-1">Recent transactions:</p>
                                  {data.expenses.slice(0, 3).map((expense: any, index: number) => (
                                    <div key={index} className="text-xs text-slate-600">
                                      {formatCurrency(expense.amount)} - {expense.category_name}
                                    </div>
                                  ))}
                                  {data.expenses.length > 3 && (
                                    <div className="text-xs text-slate-500">+{data.expenses.length - 3} more...</div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="daily_spending" 
                      name="Daily Spending" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                      stroke="#3b82f6" 
                      strokeWidth={2}
                    />
                    <Scatter 
                      yAxisId="right"
                      dataKey="transaction_count" 
                      name="Transaction Count"
                      fill="#f59e0b"
                      r={4}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 4. Spending by Category */}
              {categoryBreakdown.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Spending by Category</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown as any}
                        dataKey="total_amount"
                        nameKey="category_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={30}
                        label={({ category_name, percentage }: any) => 
                          percentage > 5 ? `${category_name}: ${percentage.toFixed(1)}%` : ''
                        }
                        labelLine={false}
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: string, props: any) => [
                          formatCurrency(value),
                          `${props.payload.category_name} (${props.payload.percentage.toFixed(1)}%)`
                        ]}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ 
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* 5. Budget Performance */}
              {budgetPerformance.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Budget Performance</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {budgetPerformance.map((perf, index) => (
                      <div key={index} className="border border-slate-100 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">{perf.category_name}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            perf.status === 'over' ? 'bg-red-100 text-red-700' :
                            perf.status === 'near' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {perf.utilization_percentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                          <div 
                            className={`h-2 rounded-full ${
                              perf.status === 'over' ? 'bg-red-500' :
                              perf.status === 'near' ? 'bg-orange-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(perf.utilization_percentage, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Spent: {formatCurrency(perf.spent_amount)}</span>
                          <span>Budget: {formatCurrency(perf.budget_amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </Layout>
  )
}