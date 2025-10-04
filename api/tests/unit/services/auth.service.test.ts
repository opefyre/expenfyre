import { describe, it, expect } from '@jest/globals'

// Simple test for auth utilities
describe('Auth Utilities', () => {
  describe('JWT helpers', () => {
    it('should convert string to Uint8Array', () => {
      const str = 'test string'
      const result = new TextEncoder().encode(str)
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(str.length)
    })

    it('should create base64url from bytes', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111])
      const result = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
      expect(typeof result).toBe('string')
      expect(result).toBe('SGVsbG8')
    })

    it('should create base64url from JSON', () => {
      const obj = { test: 'value' }
      const jsonStr = JSON.stringify(obj)
      const bytes = new TextEncoder().encode(jsonStr)
      const result = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Environment variables', () => {
    it('should have test environment variables set', () => {
      expect(process.env.GOOGLE_SHEETS_API_KEY).toBe('test-api-key')
      expect(process.env.GOOGLE_SHEETS_SHEET_ID).toBe('test-sheet-id')
      expect(process.env.JWT_SECRET).toBe('test-jwt-secret')
    })
  })
})
