// Global test setup

// Mock environment variables
process.env.GOOGLE_SHEETS_API_KEY = 'test-api-key'
process.env.GOOGLE_SHEETS_SHEET_ID = 'test-sheet-id'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.CLOUDFLARE_KV_NAMESPACE = 'test-kv-namespace'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Simple mocks for testing
global.crypto = {
  subtle: {
    importKey: jest.fn(),
    sign: jest.fn(),
  },
  getRandomValues: jest.fn((arr) => arr.map(() => Math.floor(Math.random() * 256))),
} as any
