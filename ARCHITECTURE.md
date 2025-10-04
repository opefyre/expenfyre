# Expenfyre - Technical Architecture

## Overview

Expenfyre is built using a modern microservices architecture that provides scalability, maintainability, and separation of concerns. The application consists of independent services that can be developed, deployed, and scaled independently.

## 🏗️ System Architecture

### **High-Level Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (Workers)     │◄──►│   (Sheets + KV) │
│   Firebase      │    │   Microservices │    │   Google Cloud  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Microservices Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Auth Service│  │Expenses Svc │  │Budgets Svc  │  ...    │
│  │             │  │             │  │             │         │
│  │ • OAuth 2.0 │  │ • CRUD      │  │ • CRUD      │         │
│  │ • JWT       │  │ • Categories│  │ • Tracking  │         │
│  │ • Sessions  │  │ • Analytics │  │ • Reports   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Technology Stack

### **Frontend**
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks + Context
- **Authentication**: Google OAuth 2.0
- **Deployment**: Firebase Hosting (Static Export)

#### **Global UI Components Architecture**
The frontend includes a comprehensive set of global UI components that provide consistent user experience:

**Global Loader System**:
- **Context**: `LoadingContext` manages global loading state
- **Component**: `GlobalLoader` provides visual feedback
- **Features**: Auto-managed, custom messages, modern glass morphism design

**Toast Notification System**:
- **Context**: `ToastContext` manages notification state
- **Component**: `Toast` with auto-dismiss and manual close
- **Types**: Success (2.5s), Info (3s), Warning (4s), Error (5s)
- **Features**: Smooth animations, professional icons, smart timing

**Layout System**:
- **Components**: `Layout`, `Sidebar`, `Header` for consistent structure
- **Features**: Responsive design, active state management, user integration
- **Navigation**: Unified sidebar with modern icons and professional styling

### **Backend**
- **Platform**: Cloudflare Workers
- **Framework**: Hono
- **Language**: TypeScript
- **Architecture**: Microservices
- **Authentication**: JWT + Google OAuth 2.0
- **Caching**: Cloudflare KV

### **Database**
- **Primary**: Google Sheets API (Users, Expenses, Budgets, Categories)
- **Sessions**: Cloudflare KV (JWT tokens, user sessions)
- **File Storage**: Cloudflare KV (Receipt images, Base64 encoded)
- **Caching**: Cloudflare KV (API response caching)

### **Infrastructure**
- **CDN**: Cloudflare (Global)
- **Hosting**: Firebase Hosting (Static Export)
- **PWA**: Service Worker with offline capabilities
- **Domain**: Custom domain support
- **SSL**: Automatic (Cloudflare + Firebase)
- **File Storage**: Cloudflare KV for receipt images

## 🏛️ Microservices Design

### **Service Independence**
Each service is completely independent:
- **Separate codebases** - Each service has its own logic
- **Independent deployment** - Services can be deployed separately
- **Loose coupling** - Services communicate via well-defined APIs
- **Single responsibility** - Each service has one clear purpose

### **Service Communication**
- **Synchronous**: HTTP/REST APIs
- **Authentication**: Shared Auth Service
- **Data**: Each service manages its own data
- **Errors**: Independent error handling

## 📊 Data Architecture

### **Data Flow**
```
User Request → Frontend → Auth Service → Business Service → Database
     ↓              ↓           ↓              ↓            ↓
   Browser    Next.js App   JWT Verify   Service Logic   Sheets/KV
```

### **Data Storage Strategy**
- **User Data**: Google Sheets (Users table)
- **Business Data**: Google Sheets (Expenses, Budgets, Categories)
- **Sessions**: Cloudflare KV (Fast access)
- **Cache**: Cloudflare KV (Temporary data)

### **Data Models**

#### **Users Table**
```typescript
interface User {
  user_id: string
  google_id: string
  email: string
  name: string
  avatar_url?: string
  currency: string
  timezone: string
  created_at: string
}
```

#### **Expenses Table**
```typescript
interface Expense {
  expense_id: string
  category_id: string
  user_id: string
  budget_id: string
  amount: number
  description: string
  date: string
  month: string
  receipt_url?: string
  tags: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}
```

#### **Budgets Table**
```typescript
interface Budget {
  budget_id: string
  category_id: string
  amount: number
  month: string
  rollover: boolean
  recurring: boolean
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}
```

#### **Categories Table**
```typescript
interface Category {
  category_id: string
  name: string
  icon: string
  color: string
  is_default: boolean
  created_at: string
}
```

## 🔐 Security Architecture

### **Authentication Flow**
```
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth
3. User authorizes application
4. Google redirects with authorization code
5. Backend exchanges code for tokens
6. Backend creates JWT session tokens
7. Frontend stores tokens securely
8. All API calls include JWT in Authorization header
```

### **Security Measures**
- **JWT Tokens**: Secure session management
- **HTTPS Only**: All communication encrypted
- **CORS Protection**: Restricted origins
- **Input Validation**: All inputs sanitized
- **Error Handling**: No sensitive data in errors
- **Environment Variables**: Secrets managed securely

## 🚀 Deployment Architecture

### **Frontend Deployment**
```
GitHub → Firebase CLI → Firebase Hosting → Global CDN
```

### **Backend Deployment**
```
GitHub → Wrangler CLI → Cloudflare Workers → Global Edge
```

### **Database Deployment**
```
Google Sheets → Service Account → API Access
```

## 📈 Scalability Design

### **Horizontal Scaling**
- **Frontend**: Firebase Hosting (Automatic)
- **Backend**: Cloudflare Workers (Automatic)
- **Database**: Google Sheets (Handles large datasets)

### **Performance Optimization**
- **CDN**: Cloudflare global edge network
- **Caching**: Cloudflare KV for sessions
- **Static Assets**: Optimized and cached
- **API Responses**: Efficient data structures

## 🔄 Development Workflow

### **Service Development**
1. **Create Service**: New service in `/api/src/services/`
2. **Define Interface**: TypeScript interfaces
3. **Implement Logic**: Business logic
4. **Add Endpoints**: REST API endpoints
5. **Test**: Unit and integration tests
6. **Deploy**: Independent deployment

### **Frontend Integration**
1. **Create Page**: New page in `/web/src/app/`
2. **Add Service Calls**: Use `authenticatedFetch`
3. **Handle Auth**: Automatic via middleware
4. **Style**: Tailwind CSS
5. **Test**: Local development
6. **Deploy**: Firebase deployment

## 🛠️ Development Guidelines

### **Service Design Principles**
- **Single Responsibility**: One service, one purpose
- **Loose Coupling**: Minimal dependencies
- **High Cohesion**: Related functionality together
- **Interface Segregation**: Clean APIs
- **Dependency Inversion**: Depend on abstractions

### **Code Organization**
```
api/src/
├── services/           # Microservices
│   ├── auth.service.ts
│   ├── expenses.service.ts
│   ├── budgets.service.ts
│   └── analytics.service.ts
└── index.ts           # Main API file
```

### **Error Handling**
- **Service Level**: Handle business logic errors
- **API Level**: Handle HTTP errors
- **Frontend Level**: Handle user-facing errors
- **Logging**: Comprehensive error logging

## 🔍 Monitoring & Observability

### **Logging**
- **Cloudflare Workers**: Built-in logging
- **Firebase Hosting**: Access logs
- **Google Sheets**: API logs
- **Custom Logs**: Application-specific logging

### **Health Checks**
- **API Health**: `/api/health` endpoint
- **Service Health**: Individual service checks
- **Database Health**: Google Sheets connectivity
- **Frontend Health**: Static asset serving

## 📱 Progressive Web App (PWA) Architecture

### **PWA Implementation**
The application is built as a Progressive Web App with the following features:

#### **Service Worker**
- **Location**: `web/public/sw.js`
- **Purpose**: Offline functionality and asset caching
- **Strategy**: Minimal interference with Next.js routing
- **Caching**: Static assets only (images, manifest)
- **Versioning**: Cache versioning for updates

#### **Web App Manifest**
- **Location**: `web/public/manifest.json`
- **Features**: App metadata, icons, theme colors
- **Installation**: Native browser install prompts
- **Icons**: Multiple sizes for different platforms

#### **Meta Tags**
- **PWA Support**: `apple-mobile-web-app-capable`, `mobile-web-app-capable`
- **Theme**: Consistent theme color across platforms
- **Viewport**: Mobile-optimized viewport settings
- **Icons**: Apple touch icons and favicons

### **PWA Features**
- **Installable**: Add to home screen on mobile and desktop
- **Offline Ready**: Service worker provides offline capabilities
- **Native Feel**: App-like experience with proper meta tags
- **Responsive**: Mobile-first design with native app layout
- **Fast Loading**: Optimized asset delivery and caching

## 🚀 Future Enhancements

### **Planned Services**
- **Dashboard Service**: Dashboard data aggregation
- **Reports Service**: Advanced reporting
- **Notifications Service**: User notifications
- **Settings Service**: User preferences

### **Infrastructure Improvements**
- **Custom Domain**: Branded URLs
- **Advanced Caching**: Redis integration
- **File Storage**: Google Drive integration
- **Real-time Updates**: WebSocket support

## 📚 Related Documentation

- **[OPS.md](./OPS.md)** - Deployment and operations guide
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development guidelines
- **[README.md](./README.md)** - Project overview

---

This architecture provides a solid foundation for building a scalable, maintainable expense tracking application that can grow with your needs.