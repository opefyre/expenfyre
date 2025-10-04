import { renderHook, act } from '@testing-library/react'
import { DataProvider, useData } from '@/contexts/DataContext'
import { User } from '@/lib/auth'

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
  created_at: '2024-01-01T00:00:00Z',
}

// Mock the data fetching hooks
jest.mock('@/hooks/useDataFetching', () => ({
  useExpenses: () => ({
    data: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useBudgets: () => ({
    data: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCategories: () => ({
    data: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
  cacheUtils: {
    clear: jest.fn(),
    clearByPattern: jest.fn(),
  },
}))

describe('DataContext', () => {
  it('provides data context to children', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataProvider user={mockUser}>{children}</DataProvider>
    )

    const { result } = renderHook(() => useData(), { wrapper })

    expect(result.current.expenses).toEqual([])
    expect(result.current.budgets).toEqual([])
    expect(result.current.categories).toEqual([])
    expect(result.current.loading).toEqual({
      expenses: false,
      budgets: false,
      categories: false,
    })
    expect(result.current.error).toEqual({
      expenses: null,
      budgets: null,
      categories: null,
    })
  })

  it('provides utility functions', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataProvider user={mockUser}>{children}</DataProvider>
    )

    const { result } = renderHook(() => useData(), { wrapper })

    expect(typeof result.current.getExpensesByMonth).toBe('function')
    expect(typeof result.current.getBudgetsByMonth).toBe('function')
    expect(typeof result.current.getCategoryById).toBe('function')
    expect(typeof result.current.getBudgetById).toBe('function')
    expect(typeof result.current.invalidateCache).toBe('function')
  })

  it('provides data modification helpers', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataProvider user={mockUser}>{children}</DataProvider>
    )

    const { result } = renderHook(() => useData(), { wrapper })

    expect(typeof result.current.addExpense).toBe('function')
    expect(typeof result.current.updateExpense).toBe('function')
    expect(typeof result.current.deleteExpense).toBe('function')
    expect(typeof result.current.addBudget).toBe('function')
    expect(typeof result.current.updateBudget).toBe('function')
    expect(typeof result.current.deleteBudget).toBe('function')
  })

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test since we expect an error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      renderHook(() => useData())
    }).toThrow('useData must be used within a DataProvider')
    
    consoleSpy.mockRestore()
  })
})
