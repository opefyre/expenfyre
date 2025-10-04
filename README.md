# Expenfyre - Expense Tracker

A modern, scalable expense tracking application built with microservices architecture.

## 🚀 Live Application

- **Frontend**: https://expenfyre.web.app
- **API**: https://expense-tracker-api.opefyre.workers.dev
- **Health Check**: https://expense-tracker-api.opefyre.workers.dev/api/health

## 🏗️ Architecture

### **Microservices Backend** (Cloudflare Workers)
- **Auth Service** - Google OAuth 2.0 authentication
- **Expenses Service** - Expense management
- **Budgets Service** - Budget tracking
- **Analytics Service** - Reporting and insights

### **Frontend** (Next.js + Firebase Hosting)
- Static site generation
- Google OAuth integration
- Responsive design with Tailwind CSS
- **Global UI Components**: Unified loader, toast notifications, and layout system

### **Database** (Google Sheets + Cloudflare KV)
- Google Sheets for persistent data storage (Users, Expenses, Budgets, Categories)
- Cloudflare KV for user sessions, caching, and file storage
- Service Account authentication for secure Google Sheets API access

## ✨ Key Features

### **Complete Expense Management**
- **Expense Tracking**: Full CRUD operations with categories, tags, and descriptions
- **Receipt Management**: File upload with camera support and Cloudflare KV storage
- **Smart Filtering**: Client-side search, category filters, and month/year filtering
- **Pagination**: Efficient data loading with pagination controls
- **Clickable Cards**: Interactive expense cards with detailed view modals

### **Advanced Budget Management**
- **Budget Creation**: Set monthly budgets by category with rollover options
- **Recurring Budgets**: Set up recurring monthly budgets for consistent planning
- **Budget Tracking**: Monitor spending against budgets with visual indicators
- **Soft Delete**: Safe budget management with status-based deletion
- **Client-side Search**: Instant filtering without API calls

### **Progressive Web App (PWA)**
- **Installable**: Add to home screen on mobile and desktop
- **Offline Ready**: Service worker for offline functionality
- **Native Feel**: App-like experience with proper meta tags and icons
- **Mobile Optimized**: Responsive design with native app layout

### **Global UI System**
- **Smart Loading**: Auto-managed global loader with contextual messages
- **Toast Notifications**: Auto-dismissing notifications with smart timing
- **Unified Layout**: Consistent header, sidebar, and navigation across all pages
- **Modern Design**: Glass morphism effects and professional styling
- **Confirmation Dialogs**: Safe delete operations with confirmation prompts

### **User Experience**
- **Responsive Design**: Mobile-first approach with collapsible sidebar
- **Real-time Feedback**: Instant visual feedback for all user actions
- **Professional Aesthetics**: Enterprise-ready design with minimal, modern UI
- **Consistent Navigation**: Unified sidebar with modern icons and active states
- **Native App Layout**: Fixed header/footer with scrollable content area

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Cloudflare Workers, Hono framework
- **Database**: Google Sheets API, Cloudflare KV
- **Authentication**: Google OAuth 2.0, JWT tokens
- **Hosting**: Firebase Hosting, Cloudflare Workers
- **Package Manager**: pnpm

## 📋 Features

### ✅ **Implemented**
- **Authentication & Security**
  - Google OAuth 2.0 authentication
  - JWT token-based session management
  - Secure cookie handling and CORS protection
  - Service Account authentication for Google Sheets

- **Expense Management**
  - Full CRUD operations for expenses
  - Category-based organization
  - Tag system for flexible categorization
  - Receipt upload with camera support
  - File storage in Cloudflare KV
  - Client-side search and filtering
  - Pagination for large datasets
  - Interactive expense cards with detailed views

- **Budget Management**
  - Monthly budget creation and tracking
  - Recurring budget support for consistent planning
  - Category-based budget allocation
  - Rollover options for unused budget
  - Soft delete with status management
  - Client-side search and filtering
  - Budget analytics and reporting

- **User Interface**
  - Progressive Web App (PWA) with install capability
  - Responsive design with mobile-first approach
  - Native app-like layout with fixed header/footer
  - Global loading system with contextual messages
  - Toast notification system with smart timing
  - Confirmation dialogs for safe operations
  - Modern glass morphism design
  - Professional enterprise-ready aesthetics

- **Technical Architecture**
  - Microservices architecture with independent services
  - Cloudflare Workers for serverless backend
  - Next.js 15 with App Router and static export
  - TypeScript for type safety
  - Tailwind CSS for styling
  - Firebase Hosting for frontend deployment

### 🚧 **Planned**
- Advanced analytics dashboard
- Data export functionality
- Multi-currency support
- Team/shared expense management
- Advanced reporting features
- Email notifications
- Mobile app (React Native)

## 🚀 Quick Start

### Prerequisites
- Node.js LTS (v20.x recommended)
- pnpm package manager
- Firebase CLI
- Cloudflare account

### 1. Clone Repository
```bash
git clone <repository-url>
cd expense-tracker
```

### 2. Install Dependencies
```bash
# Backend
cd api
pnpm install

# Frontend
cd ../web
pnpm install
```

### 3. Environment Setup
See [OPS.md](./OPS.md) for detailed setup instructions.

### 4. Development
```bash
# Backend (from api/)
pnpm dev

# Frontend (from web/)
pnpm dev
```

### 5. Deployment
```bash
# Backend
cd api
pnpm run deploy

# Frontend
cd web
pnpm build
firebase deploy --only hosting:expenfyre --project opefyre-expense-tracker
```

## 📚 Documentation

- **[OPS.md](./OPS.md)** - Deployment, DevOps, and Infrastructure guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture and design decisions
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development guidelines and best practices

## 🔧 API Endpoints

### Authentication
- `GET /api/auth/google` - Start Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/signout` - Sign out

### Expenses Service
- `GET /api/expenses` - Get user expenses (with pagination and filtering)
- `POST /api/expenses` - Create new expense
- `PATCH /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Soft delete expense
- `GET /api/expenses/:id` - Get single expense details

### Budgets Service
- `GET /api/budgets` - Get user budgets (with filtering)
- `POST /api/budgets` - Create new budget
- `PATCH /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Soft delete budget
- `GET /api/budgets/:id` - Get single budget details

### File Management
- `POST /api/upload` - Upload receipt files
- `GET /api/files/:id` - Serve uploaded files

### Analytics Service
- `GET /api/analytics` - Get comprehensive analytics
- `GET /api/analytics/categories` - Get category breakdown

## 🏗️ Project Structure

```
expense-tracker/
├── api/                          # Cloudflare Worker backend
│   ├── src/
│   │   ├── services/             # Microservices
│   │   │   ├── auth.service.ts
│   │   │   ├── expenses.service.ts
│   │   │   ├── budgets.service.ts
│   │   │   └── analytics.service.ts
│   │   └── index.ts              # Main API file
│   ├── package.json
│   └── wrangler.jsonc
├── web/                          # Next.js frontend
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   ├── lib/                  # Utilities
│   │   └── styles/               # CSS styles
│   ├── package.json
│   └── next.config.js
├── OPS.md                        # Operations guide
├── ARCHITECTURE.md               # Technical architecture
├── DEVELOPMENT.md                # Development guidelines
└── README.md                     # This file
```

## 🔐 Security

- JWT token-based authentication
- Google OAuth 2.0 integration
- Secure cookie handling
- CORS protection
- Environment variable security

## 🚀 Deployment

The application is deployed on:
- **Frontend**: Firebase Hosting (expenfyre.web.app)
- **Backend**: Cloudflare Workers (expense-tracker-api.opefyre.workers.dev)

See [OPS.md](./OPS.md) for detailed deployment instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is private and proprietary.

## 📞 Support

For questions or issues, please contact the development team.