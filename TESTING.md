# Testing Guide

This document outlines the comprehensive testing strategy for the Expenfyre expense tracker application.

## Testing Architecture

### Frontend Testing (Next.js/React)
- **Unit Tests**: Jest + React Testing Library
- **Component Tests**: Isolated component testing
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Playwright for full user workflows

### Backend Testing (Cloudflare Workers/Hono)
- **Unit Tests**: Jest for service functions
- **Integration Tests**: API endpoint testing
- **Mock Testing**: External service mocking

## Test Structure

```
├── web/
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── components/
│   │   │   └── contexts/
│   │   ├── integration/
│   │   └── e2e/
│   ├── jest.config.js
│   ├── jest.setup.js
│   └── playwright.config.ts
├── api/
│   ├── tests/
│   │   ├── unit/
│   │   │   └── services/
│   │   └── integration/
│   ├── jest.config.js
│   └── setup.ts
└── .github/workflows/
    ├── test.yml
    ├── deploy-frontend.yml
    └── deploy-backend.yml
```

## Running Tests

### Frontend Tests

```bash
# Run all tests
cd web && pnpm run test

# Run tests in watch mode
cd web && pnpm run test:watch

# Run tests with coverage
cd web && pnpm run test:coverage

# Run component tests only
cd web && pnpm run test:components

# Run integration tests only
cd web && pnpm run test:integration

# Run E2E tests
cd web && pnpm run test:e2e

# Run E2E tests with UI
cd web && pnpm run test:e2e:ui

# Run E2E tests in headed mode
cd web && pnpm run test:e2e:headed
```

### Backend Tests

```bash
# Run all tests
cd api && pnpm run test

# Run tests in watch mode
cd api && pnpm run test:watch

# Run tests with coverage
cd api && pnpm run test:coverage

# Run API integration tests only
cd api && pnpm run test:api
```

### Full Integration Tests

```bash
# Run all tests across frontend and backend
pnpm run test

# Run full integration test suite
pnpm run test:integration:full

# Run with coverage
pnpm run test:coverage
```

## Test Categories

### 1. Unit Tests

#### Frontend Unit Tests
- **Components**: Layout, Sidebar, Header, Forms
- **Contexts**: DataContext, ToastContext, LoadingContext
- **Hooks**: Custom hooks like useDataFetching
- **Utilities**: Helper functions and utilities

#### Backend Unit Tests
- **Services**: AuthService, ExpensesService, BudgetsService
- **Utilities**: JWT handling, data validation
- **Helpers**: Date formatting, currency conversion

### 2. Integration Tests

#### Frontend Integration Tests
- **Component Interactions**: Form submissions, data flow
- **Context Integration**: Data flow between components
- **API Integration**: Mock API calls and responses

#### Backend Integration Tests
- **API Endpoints**: Full request/response cycles
- **Authentication Flow**: Login, logout, token refresh
- **Data Operations**: CRUD operations with validation

### 3. End-to-End Tests

#### User Workflows
- **Authentication**: Login, logout, session management
- **Expense Management**: Create, edit, delete expenses
- **Budget Management**: Create, edit, delete budgets
- **Analytics**: View charts and insights
- **Navigation**: Page transitions and routing

#### Cross-Browser Testing
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome Mobile, Safari Mobile
- **Responsive**: Different screen sizes

## Test Configuration

### Jest Configuration

#### Frontend (web/jest.config.js)
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

#### Backend (api/jest.config.js)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
}
```

### Playwright Configuration (web/playwright.config.ts)
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

## Test Data and Mocking

### Frontend Mocking
- **Next.js Router**: Mocked for consistent testing
- **API Calls**: Mocked using MSW (Mock Service Worker)
- **Browser APIs**: IntersectionObserver, ResizeObserver
- **Authentication**: Mock user data and tokens

### Backend Mocking
- **Google Sheets API**: Mocked responses
- **Cloudflare KV**: Mocked storage operations
- **JWT**: Mocked token generation and verification
- **External Services**: All external dependencies mocked

## Continuous Integration

### GitHub Actions Workflow

#### Test Workflow (.github/workflows/test.yml)
- **Triggers**: Push to main/develop, Pull Requests
- **Frontend Tests**: Unit, component, integration, E2E
- **Backend Tests**: Unit, integration, API
- **Full Integration**: Cross-service testing

#### Deployment Workflows
- **Frontend**: Tests → Build → Deploy to Firebase
- **Backend**: Tests → Deploy to Cloudflare Workers
- **Quality Gates**: Tests must pass before deployment

### Quality Gates
- **Code Coverage**: Minimum 70% coverage required
- **Type Safety**: TypeScript compilation must pass
- **Linting**: ESLint rules must pass
- **Tests**: All tests must pass
- **E2E**: Critical user flows must pass

## Test Best Practices

### Writing Tests
1. **Arrange-Act-Assert**: Clear test structure
2. **Descriptive Names**: Test names should describe behavior
3. **Single Responsibility**: One test per behavior
4. **Mock External Dependencies**: Isolate units under test
5. **Test Edge Cases**: Handle error conditions

### Test Organization
1. **Group Related Tests**: Use describe blocks
2. **Setup and Teardown**: Use beforeEach/afterEach
3. **Test Data**: Use factories for consistent data
4. **Assertions**: Use specific matchers
5. **Async Testing**: Properly handle promises

### Performance Testing
1. **Load Testing**: API endpoint performance
2. **Memory Testing**: Component memory usage
3. **Render Testing**: Component render performance
4. **Bundle Testing**: JavaScript bundle size

## Debugging Tests

### Frontend Debugging
```bash
# Run tests with debug output
cd web && pnpm run test --verbose

# Run specific test file
cd web && pnpm run test -- Layout.test.tsx

# Run tests with coverage and open report
cd web && pnpm run test:coverage && open coverage/lcov-report/index.html
```

### Backend Debugging
```bash
# Run tests with debug output
cd api && pnpm run test --verbose

# Run specific test file
cd api && pnpm run test -- auth.service.test.ts

# Run tests with coverage
cd api && pnpm run test:coverage
```

### E2E Debugging
```bash
# Run E2E tests with UI
cd web && pnpm run test:e2e:ui

# Run specific E2E test
cd web && pnpm run test:e2e -- auth.spec.ts

# Run E2E tests in headed mode
cd web && pnpm run test:e2e:headed
```

## Coverage Reports

### Frontend Coverage
- **Location**: `web/coverage/lcov-report/index.html`
- **Thresholds**: 70% minimum coverage
- **Metrics**: Branches, Functions, Lines, Statements

### Backend Coverage
- **Location**: `api/coverage/lcov-report/index.html`
- **Thresholds**: 70% minimum coverage
- **Metrics**: Branches, Functions, Lines, Statements

## Troubleshooting

### Common Issues

#### Frontend Tests
- **Module Resolution**: Check Jest moduleNameMapping
- **Mock Issues**: Verify mock implementations
- **Async Testing**: Use proper async/await patterns
- **Component Rendering**: Check test environment setup

#### Backend Tests
- **Environment Variables**: Ensure proper mocking
- **External Dependencies**: Verify all mocks are in place
- **Timeout Issues**: Increase test timeout if needed
- **Type Errors**: Check TypeScript configuration

#### E2E Tests
- **Browser Issues**: Update Playwright browsers
- **Timing Issues**: Add proper waits
- **Element Selection**: Use stable selectors
- **Environment Setup**: Check test environment

### Getting Help
1. **Check Logs**: Review test output and error messages
2. **Verify Configuration**: Ensure all config files are correct
3. **Update Dependencies**: Keep testing libraries updated
4. **Review Documentation**: Check Jest and Playwright docs

## Future Enhancements

### Planned Improvements
1. **Visual Regression Testing**: Screenshot comparisons
2. **Performance Testing**: Load and stress testing
3. **Accessibility Testing**: Automated a11y testing
4. **Security Testing**: Vulnerability scanning
5. **API Contract Testing**: OpenAPI schema validation

### Test Automation
1. **Scheduled Tests**: Daily test runs
2. **Performance Monitoring**: Continuous performance testing
3. **Security Scanning**: Automated security tests
4. **Dependency Updates**: Automated dependency testing
