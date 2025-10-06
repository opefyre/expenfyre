'use client'

import { useState, useEffect } from 'react'
import { User } from '@/lib/auth'
import Sidebar from './Sidebar'
import Header from './Header'

interface LayoutProps {
  children: React.ReactNode
  user: User
  currentPage: string
  onSignOut: () => void
}

export default function Layout({ children, user, currentPage, onSignOut }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="h-screen bg-slate-50 dark:bg-gray-900 overflow-hidden w-full max-w-full">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Application Layout */}
      <div className="flex h-full w-full max-w-full">
        {/* Sidebar */}
        <Sidebar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          currentPage={currentPage}
        />

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0 ${
          sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-64'
        }`}>
          {/* Header - Fixed at top */}
          <Header 
            user={user}
            onSignOut={onSignOut}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Main Content - Scrollable area between header and footer */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden w-full">
            <div className="p-3 sm:p-6 h-full w-full max-w-full">
              <div className="max-w-7xl mx-auto w-full h-full min-w-0">
                {children}
              </div>
            </div>
          </main>

          {/* Footer - Fixed at bottom */}
          <footer className="bg-white dark:bg-gray-800 border-t border-slate-200 dark:border-gray-700 px-3 sm:px-6 py-4 flex-shrink-0 w-full">
            <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-slate-500 dark:text-gray-400 space-y-2 sm:space-y-0 max-w-7xl mx-auto">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <span>© 2025 Expenfyre</span>
                <span className="hidden sm:inline">•</span>
                <span>Expense Tracker</span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                <span>Version 1.0.0</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Built with Next.js & Cloudflare</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}