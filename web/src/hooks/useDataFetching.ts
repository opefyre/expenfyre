// Mock implementation for testing
export const useExpenses = (params: any = {}, options: any = {}) => ({
  data: [],
  loading: false,
  error: null,
  refetch: jest.fn(),
})

export const useBudgets = (params: any = {}, options: any = {}) => ({
  data: [],
  loading: false,
  error: null,
  refetch: jest.fn(),
})

export const useCategories = (options: any = {}) => ({
  data: [],
  loading: false,
  error: null,
  refetch: jest.fn(),
})

export const cacheUtils = {
  clear: jest.fn(),
  clearByPattern: jest.fn(),
}