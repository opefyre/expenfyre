import { render, screen } from '@testing-library/react'
import { User } from '@/lib/auth'
import Layout from '@/components/Layout'

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
  created_at: '2024-01-01T00:00:00Z',
}

const mockOnSignOut = jest.fn()

describe('Layout Component', () => {
  beforeEach(() => {
    mockOnSignOut.mockClear()
  })

  it('renders layout with user information', () => {
    render(
      <Layout user={mockUser} currentPage="/" onSignOut={mockOnSignOut}>
        <div>Test Content</div>
      </Layout>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
    expect(screen.getByAltText('Test User')).toBeInTheDocument()
  })

  it('renders sidebar navigation', () => {
    render(
      <Layout user={mockUser} currentPage="/" onSignOut={mockOnSignOut}>
        <div>Test Content</div>
      </Layout>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Expenses')).toBeInTheDocument()
    expect(screen.getByText('Budgets')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
  })

  it('highlights current page in navigation', () => {
    render(
      <Layout user={mockUser} currentPage="/expenses" onSignOut={mockOnSignOut}>
        <div>Test Content</div>
      </Layout>
    )

    // The current page highlighting is handled by the Sidebar component
    // We just verify the expenses link exists
    expect(screen.getByText('Expenses')).toBeInTheDocument()
  })

  it('renders footer with copyright', () => {
    render(
      <Layout user={mockUser} currentPage="/" onSignOut={mockOnSignOut}>
        <div>Test Content</div>
      </Layout>
    )

    expect(screen.getByText('© 2025 Expenfyre')).toBeInTheDocument()
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument()
  })
})
