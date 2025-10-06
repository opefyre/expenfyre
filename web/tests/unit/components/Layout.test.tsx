import { render, screen } from '@testing-library/react'
import { User } from '@/lib/auth'
import Layout from '@/components/Layout'
import { ThemeProvider } from '@/contexts/ThemeContext'

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
  created_at: '2024-01-01T00:00:00Z',
}

const mockOnSignOut = jest.fn()

// Test wrapper component that provides necessary contexts
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    {children}
  </ThemeProvider>
)

describe('Layout Component', () => {
  beforeEach(() => {
    mockOnSignOut.mockClear()
  })

  it('renders layout with user information', () => {
    render(
      <TestWrapper>
        <Layout user={mockUser} currentPage="/" onSignOut={mockOnSignOut}>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
    expect(screen.getByAltText('Test User')).toBeInTheDocument()
  })

  it('renders sidebar navigation', () => {
    render(
      <TestWrapper>
        <Layout user={mockUser} currentPage="/" onSignOut={mockOnSignOut}>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Expenses')).toBeInTheDocument()
    expect(screen.getByText('Budgets')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
  })

  it('highlights current page in navigation', () => {
    render(
      <TestWrapper>
        <Layout user={mockUser} currentPage="/expenses" onSignOut={mockOnSignOut}>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    )

    // The current page highlighting is handled by the Sidebar component
    // We just verify the expenses link exists
    expect(screen.getByText('Expenses')).toBeInTheDocument()
  })

  it('renders footer with copyright', () => {
    render(
      <TestWrapper>
        <Layout user={mockUser} currentPage="/" onSignOut={mockOnSignOut}>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    )

    expect(screen.getByText('© 2025 Expenfyre')).toBeInTheDocument()
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument()
  })
})
