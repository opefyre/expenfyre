# Development Guidelines

## Getting Started

### Prerequisites
- Node.js LTS (v20.x recommended)
- pnpm package manager
- Firebase CLI
- Cloudflare account

### Local Development Setup

#### 1. Clone and Install
```bash
git clone <repository-url>
cd expense-tracker

# Install backend dependencies
cd api
pnpm install

# Install frontend dependencies
cd ../web
pnpm install
```

#### 2. Environment Configuration
Create `.dev.vars` in the `api/` directory:
```bash
# api/.dev.vars
SHEET_ID=your_spreadsheet_id
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
JWT_SECRET=your_jwt_secret
SERVICE_ACCOUNT_JSON={"type":"service_account",...}
API_BASE_URL=http://localhost:8787
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

Create `.env.local` in the `web/` directory:
```bash
# web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8787
```

#### 3. Start Development Servers
```bash
# Terminal 1 - Backend
cd api
pnpm dev

# Terminal 2 - Frontend
cd web
pnpm dev
```

## 🏗️ Microservices Development

### Creating a New Service

#### 1. Create Service File
```typescript
// api/src/services/your-service.service.ts
export interface YourData {
  id: string
  // Define your data structure
}

export class YourService {
  constructor(private env: any) {}

  async getData(userEmail: string): Promise<YourData[]> {
    // Your service logic here
  }

  async createData(userEmail: string, data: Omit<YourData, 'id'>): Promise<YourData> {
    // Your service logic here
  }
}

export function getYourService(env: any): YourService {
  return new YourService(env)
}
```

#### 2. Add API Endpoints
```typescript
// In api/src/index.ts
import { getYourService } from './services/your-service.service'

app.get('/api/your-endpoint', authMiddleware, requireAuth, async (c) => {
  const auth = c.get('auth')
  const yourService = getYourService(c.env)
  const data = await yourService.getData(auth.user.email)
  
  return c.json({ data })
})
```

#### 3. Test Your Service
```bash
# Test locally
curl -H "Authorization: Bearer your-jwt-token" http://localhost:8787/api/your-endpoint
```

### Service Design Principles

#### **Single Responsibility**
Each service should have one clear purpose:
- **Auth Service**: Authentication only
- **Expenses Service**: Expense management only
- **Budgets Service**: Budget management only

#### **Loose Coupling**
Services should not depend on each other directly:
```typescript
// ❌ Bad - Direct dependency
class AnalyticsService {
  constructor(private expensesService: ExpensesService) {}
}

// ✅ Good - Use through interfaces
class AnalyticsService {
  async getAnalytics(userEmail: string) {
    const expensesService = getExpensesService(this.env)
    const expenses = await expensesService.getExpenses(userEmail)
    // Analytics logic
  }
}
```

#### **High Cohesion**
Related functionality should be in the same service:
```typescript
// ✅ Good - All expense-related operations
class ExpensesService {
  async getExpenses(userEmail: string) {}
  async createExpense(userEmail: string, data: any) {}
  async updateExpense(userEmail: string, id: string, data: any) {}
  async deleteExpense(userEmail: string, id: string) {}
  async getExpensesByCategory(userEmail: string, category: string) {}
}
```

## 🎨 Frontend Development

### 🌟 Global UI Components

The application includes several global UI components that provide consistent user experience across all pages:

#### **Global Loader System**
A centralized loading system that provides visual feedback during async operations.

**Location**: `web/src/components/GlobalLoader.tsx` + `web/src/contexts/LoadingContext.tsx`

**Usage**:
```typescript
import { useLoading } from '@/contexts/LoadingContext'

function MyComponent() {
  const { showLoading, hideLoading } = useLoading()
  
  const handleAsyncOperation = async () => {
    showLoading('Processing your request...')
    try {
      await someAsyncOperation()
    } finally {
      hideLoading()
    }
  }
}
```

**Features**:
- **Auto-managed**: Shows/hides automatically
- **Custom Messages**: Contextual loading messages
- **Modern Design**: Glass morphism with backdrop blur
- **Minimal Footprint**: Small, unobtrusive design

#### **Toast Notification System**
A comprehensive notification system for user feedback and alerts.

**Location**: `web/src/components/Toast.tsx` + `web/src/contexts/ToastContext.tsx`

**Usage**:
```typescript
import { useToastHelpers } from '@/contexts/ToastContext'

function MyComponent() {
  const { showSuccess, showError, showWarning, showInfo } = useToastHelpers()
  
  const handleAction = async () => {
    try {
      await someOperation()
      showSuccess('Operation completed', 'Your data has been saved successfully')
    } catch (error) {
      showError('Operation failed', 'Please try again later')
    }
  }
}
```

**Toast Types**:
- **Success**: 2.5 seconds (quick confirmation)
- **Info**: 3 seconds (standard information)
- **Warning**: 4 seconds (important notices)
- **Error**: 5 seconds (critical issues)

**Features**:
- **Auto-dismiss**: Automatically disappears after duration
- **Manual Close**: Click X to dismiss immediately
- **Smooth Animations**: Slide-in from right with fade effects
- **Professional Icons**: Contextual icons for each type
- **Smart Timing**: Different durations based on importance

#### **Layout System**
A unified layout system that provides consistent structure across all pages.

**Location**: `web/src/components/Layout.tsx` + `web/src/components/Sidebar.tsx` + `web/src/components/Header.tsx`

**Usage**:
```typescript
import Layout from '@/components/Layout'

function MyPage() {
  return (
    <Layout user={user} currentPage="/my-page" onSignOut={handleSignOut}>
      {/* Your page content */}
    </Layout>
  )
}
```

**Features**:
- **Consistent Structure**: Header, sidebar, main content, footer
- **Responsive Design**: Mobile-friendly with collapsible sidebar
- **Active State**: Highlights current page in navigation
- **User Management**: Integrated user dropdown and sign-out
- **Native App Layout**: Fixed header/footer with scrollable content area

#### **Confirmation Dialog System**
A global confirmation dialog system for safe operations like deletions.

**Location**: `web/src/components/ConfirmDialog.tsx` + `web/src/contexts/ConfirmDialogContext.tsx`

**Usage**:
```typescript
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext'

function MyComponent() {
  const { showConfirm } = useConfirmDialog()
  
  const handleDelete = async () => {
    const confirmed = await showConfirm(
      'Delete Item',
      'Are you sure you want to delete this item? This action cannot be undone.',
      'Delete',
      'Cancel'
    )
    
    if (confirmed) {
      // Proceed with deletion
    }
  }
}
```

**Features**:
- **Global State**: Managed through React Context
- **Promise-based**: Returns boolean for user decision
- **Customizable**: Custom titles, messages, and button text
- **Safe Operations**: Prevents accidental deletions
- **Modern Design**: Glass morphism with backdrop blur

#### **File Upload Component**
A comprehensive file upload component with camera support.

**Location**: `web/src/components/FileUpload.tsx`

**Usage**:
```typescript
import FileUpload from '@/components/FileUpload'

function MyForm() {
  const [file, setFile] = useState<File | null>(null)
  
  return (
    <FileUpload
      onFileSelect={setFile}
      accept="image/*"
      maxSize={5 * 1024 * 1024} // 5MB
      className="w-full"
    />
  )
}
```

**Features**:
- **Camera Support**: Direct camera access on mobile devices
- **File Validation**: Size and type validation
- **Drag & Drop**: Modern file selection interface
- **Preview**: Image preview before upload
- **Error Handling**: User-friendly error messages

#### **Custom Form Components**
Reusable form components for consistent UI across the application.

**Components**:
- **MonthYearPicker**: `web/src/components/MonthYearPicker.tsx`
- **Select**: `web/src/components/Select.tsx`
- **TagInput**: `web/src/components/TagInput.tsx`
- **DatePicker**: `web/src/components/DatePicker.tsx`

**Usage**:
```typescript
import MonthYearPicker from '@/components/MonthYearPicker'
import Select from '@/components/Select'
import TagInput from '@/components/TagInput'

function MyForm() {
  const [month, setMonth] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  
  return (
    <form>
      <MonthYearPicker
        value={month}
        onChange={setMonth}
        placeholder="Select month"
      />
      <Select
        options={categories}
        value={category}
        onChange={setCategory}
        placeholder="Select category"
      />
      <TagInput
        tags={tags}
        onChange={setTags}
        placeholder="Add tags"
      />
    </form>
  )
}
```

### Creating a New Page

#### 1. Create Page Component
```typescript
// web/src/app/your-page/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { authenticatedFetch } from '@/lib/auth'

export default function YourPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await authenticatedFetch('/api/your-endpoint')
      const result = await response.json()
      setData(result.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>Your Page</h1>
      {/* Your page content */}
    </div>
  )
}
```

#### 2. Add Navigation
```typescript
// web/src/app/layout.tsx
// Add your page to the navigation
```

### Frontend Best Practices

#### **Authentication**
Always use `authenticatedFetch` for API calls:
```typescript
// ✅ Good
const response = await authenticatedFetch('/api/endpoint')

// ❌ Bad - Direct fetch without auth
const response = await fetch('/api/endpoint')
```

#### **Error Handling**
Handle errors gracefully:
```typescript
try {
  const response = await authenticatedFetch('/api/endpoint')
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  const data = await response.json()
  setData(data)
} catch (error) {
  console.error('Error:', error)
  setError('Failed to load data')
}
```

#### **Loading States**
Always show loading states:
```typescript
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetchData().finally(() => setLoading(false))
}, [])

if (loading) return <div>Loading...</div>
```

## 🧪 Testing

### Backend Testing
```typescript
// Test your service
const service = getYourService(mockEnv)
const result = await service.getData('test@example.com')
expect(result).toBeDefined()
```

### Frontend Testing
```typescript
// Test your component
import { render, screen } from '@testing-library/react'
import YourPage from './page'

test('renders your page', () => {
  render(<YourPage />)
  expect(screen.getByText('Your Page')).toBeInTheDocument()
})
```

## 📦 Package Management

### Adding Dependencies
```bash
# Backend
cd api
pnpm add package-name

# Frontend
cd web
pnpm add package-name
```

### Updating Dependencies
```bash
# Update all dependencies
pnpm update

# Update specific package
pnpm update package-name
```

## 📱 Progressive Web App (PWA) Development

### PWA Configuration

#### Service Worker
The service worker is located at `web/public/sw.js` and provides:
- **Offline functionality**: Caches static assets
- **Minimal interference**: Doesn't interfere with Next.js routing
- **Version management**: Cache versioning for updates

#### Web App Manifest
The manifest file at `web/public/manifest.json` includes:
- **App metadata**: Name, description, theme colors
- **Icons**: Multiple sizes for different platforms
- **Installation**: Native browser install prompts

#### Meta Tags
PWA meta tags in `web/src/app/layout.tsx`:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="theme-color" content="#3b82f6" />
<link rel="manifest" href="/manifest.json?v=3" />
```

### PWA Development Guidelines

#### Service Worker Updates
When updating the service worker:
1. Increment `CACHE_NAME` version
2. Update cached URLs if needed
3. Test offline functionality
4. Deploy and verify updates

#### Icon Management
- **Icons**: Store in `web/public/` directory
- **Sizes**: 192x192 and 512x512 PNG files
- **Cache busting**: Use version parameters (`?v=3`)
- **Manifest**: Update icon references in manifest.json

#### Testing PWA Features
- **Installation**: Test "Add to Home Screen" on mobile
- **Offline**: Test functionality without network
- **Performance**: Check Lighthouse PWA score
- **Icons**: Verify icons appear correctly

## 🚀 Deployment

### Backend Deployment
```bash
cd api
pnpm run deploy
```

### Frontend Deployment
```bash
cd web
pnpm build
firebase deploy --only hosting:expenfyre --project opefyre-expense-tracker
```

### Full Deployment
```bash
# Deploy both backend and frontend
cd api && pnpm run deploy && cd ../web && pnpm build && firebase deploy --only hosting:expenfyre --project opefyre-expense-tracker
```

## 🔍 Debugging

### Backend Debugging
```bash
# View logs
pnpm dlx wrangler tail expense-tracker-api --format=pretty

# Local debugging
console.log('Debug info:', data)
```

### Frontend Debugging
```bash
# Browser console
console.log('Debug info:', data)

# React DevTools
# Install React Developer Tools browser extension
```

## 📝 Code Style

### TypeScript
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use type annotations for function parameters and return values
- Avoid `any` type when possible

### Naming Conventions
- **Files**: kebab-case (`user-service.ts`)
- **Classes**: PascalCase (`UserService`)
- **Functions**: camelCase (`getUserData`)
- **Variables**: camelCase (`userEmail`)
- **Constants**: UPPER_SNAKE_CASE (`API_URL`)

### Code Organization
```
api/src/
├── services/           # Microservices
│   ├── auth.service.ts
│   ├── expenses.service.ts
│   └── ...
└── index.ts           # Main API file

web/src/
├── app/               # Next.js App Router
│   ├── page.tsx
│   ├── layout.tsx
│   └── ...
├── lib/               # Utilities
│   └── auth.ts
└── styles/            # CSS
    └── globals.css
```

## 🐛 Common Issues

### Backend Issues
- **CORS errors**: Check CORS_ORIGIN environment variable
- **Authentication errors**: Verify JWT_SECRET and token format
- **Database errors**: Check SERVICE_ACCOUNT_JSON and SHEET_ID

### Frontend Issues
- **Build errors**: Check TypeScript errors and dependencies
- **Runtime errors**: Check browser console for errors
- **Authentication issues**: Verify NEXT_PUBLIC_API_URL

### Deployment Issues
- **Environment variables**: Ensure all required variables are set
- **Build failures**: Check for TypeScript errors
- **Service errors**: Check Cloudflare Worker logs

## 📚 Resources

- **[OPS.md](./OPS.md)** - Deployment and operations guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture
- **[README.md](./README.md)** - Project overview
- **[Next.js Documentation](https://nextjs.org/docs)**
- **[Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)**
- **[Firebase Documentation](https://firebase.google.com/docs)**

---

Follow these guidelines to maintain code quality and ensure smooth development workflow.
