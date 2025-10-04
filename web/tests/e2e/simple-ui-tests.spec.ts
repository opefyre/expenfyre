import { test, expect } from '@playwright/test'

test.describe('Simple UI Tests - No Auth Required', () => {
  test('should display login page when not authenticated', async ({ page }) => {
    await page.goto('/')
    
    // Check for login page elements
    await expect(page.getByText('Expenfyre')).toBeVisible()
    await expect(page.getByText('Sign in to continue')).toBeVisible()
    await expect(page.getByText('Continue with Google')).toBeVisible()
    
    // Check for minimal black & white design
    const loginContainer = page.locator('div').filter({ hasText: 'Expenfyre' }).first()
    await expect(loginContainer).toBeVisible()
  })

  test('should handle Google OAuth button click', async ({ page }) => {
    await page.goto('/')
    
    // Check that the Google button is clickable
    const googleButton = page.getByText('Continue with Google')
    await expect(googleButton).toBeVisible()
    await expect(googleButton).toBeEnabled()
  })

  test('should have proper page structure', async ({ page }) => {
    await page.goto('/')
    
    // Check for proper HTML structure
    await expect(page.locator('h1')).toHaveText('Expenfyre')
    
    // Check for login button specifically (not Next.js dev tools button)
    const loginButton = page.getByRole('button', { name: 'Continue with Google' })
    await expect(loginButton).toBeVisible()
    
    // Check for proper styling classes on the button element
    await expect(loginButton).toHaveClass(/bg-black/)
    await expect(loginButton).toHaveClass(/text-white/)
  })

  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    
    // Check that page loads properly on mobile
    await expect(page.getByText('Expenfyre')).toBeVisible()
    await expect(page.getByText('Sign in to continue')).toBeVisible()
    await expect(page.getByText('Continue with Google')).toBeVisible()
    
    // Check that button is full width on mobile (check the button element, not the span)
    const loginButton = page.getByRole('button', { name: 'Continue with Google' })
    await expect(loginButton).toHaveClass(/w-full/)
  })

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/')
    
    // Check for viewport meta tag
    const viewport = page.locator('meta[name="viewport"]').first()
    await expect(viewport).toHaveAttribute('content', /width=device-width/)
  })

  test('should handle page refresh', async ({ page }) => {
    await page.goto('/')
    
    // Check initial state
    await expect(page.getByText('Expenfyre')).toBeVisible()
    
    // Refresh the page
    await page.reload()
    
    // Should still show login page
    await expect(page.getByText('Expenfyre')).toBeVisible()
    await expect(page.getByText('Continue with Google')).toBeVisible()
  })

  test('should have proper accessibility features', async ({ page }) => {
    await page.goto('/')
    
    // Check for proper heading structure
    await expect(page.locator('h1')).toHaveText('Expenfyre')
    
    // Check that button has proper accessibility attributes
    const loginButton = page.getByRole('button', { name: 'Continue with Google' })
    await expect(loginButton).toBeVisible()
    
    // Check for proper contrast (black button with white text)
    await expect(loginButton).toHaveClass(/bg-black/)
    await expect(loginButton).toHaveClass(/text-white/)
  })

  test('should handle different screen sizes', async ({ page }) => {
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    
    await expect(page.getByText('Expenfyre')).toBeVisible()
    await expect(page.getByText('Continue with Google')).toBeVisible()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    
    await expect(page.getByText('Expenfyre')).toBeVisible()
    await expect(page.getByText('Continue with Google')).toBeVisible()
  })

  test('should have proper page title', async ({ page }) => {
    await page.goto('/')
    
    // Check page title
    await expect(page).toHaveTitle(/Expenfyre|Dashboard/)
  })
})
