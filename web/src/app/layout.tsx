'use client'

import '../styles/globals.css';
import { ToastProvider } from '@/contexts/ToastContext'
import { LoadingProvider } from '@/contexts/LoadingContext'
import { ConfirmDialogProvider } from '@/contexts/ConfirmDialogContext'
import { DataProvider } from '@/contexts/DataContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import GlobalLoader from '@/components/GlobalLoader'
import ToastContainer from '@/components/ToastContainer'
import ConfirmDialogContainer from '@/components/ConfirmDialogContainer'
import { registerServiceWorker } from '@/lib/pwa'
import { useEffect, useState } from 'react'
import { User, getCurrentUser } from '@/lib/auth'

function DataProviderWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
      } catch (error) {
        setUser(null)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [])

  // Always render DataProvider, but pass null user when not authenticated
  return (
    <DataProvider user={user}>
      {children}
    </DataProvider>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon-192x192.png?v=3" type="image/png" />
        <link rel="shortcut icon" href="/icon-192x192.png?v=3" type="image/png" />
        <link rel="manifest" href="/manifest.json?v=3" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Expenfyre" />
        <link rel="apple-touch-icon" href="/icon-192x192.png?v=3" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png?v=3" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512x512.png?v=3" />
        <meta name="msapplication-TileImage" content="/icon-192x192.png?v=3" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <title>Expenfyre - Expense Tracker</title>
        <meta name="description" content="Modern expense tracking and financial management application" />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <LoadingProvider>
              <ConfirmDialogProvider>
                <DataProviderWrapper>
                  {children}
                  <GlobalLoader />
                  <ToastContainer />
                  <ConfirmDialogContainer />
                </DataProviderWrapper>
              </ConfirmDialogProvider>
            </LoadingProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}