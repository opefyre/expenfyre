'use client'

import { useState, useEffect } from 'react'
import { User, getCurrentUser, signInWithGoogle, authenticatedFetch } from '@/lib/auth'
import AccessDenied from '@/components/AccessDenied'
import Layout from '@/components/Layout'
import { useLoading } from '@/contexts/LoadingContext'
import { useToastHelpers } from '@/contexts/ToastContext'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [popup, setPopup] = useState<any>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [deniedUserInfo, setDeniedUserInfo] = useState<{
    email: string
    name: string
    picture?: string
    google_id: string
  } | null>(null)
  
  const { showLoading, hideLoading } = useLoading()
  const { showSuccess, showError } = useToastHelpers()

  useEffect(() => {
    checkAuth()
  }, [])

  // Dashboard content component (only rendered when authenticated)
  function DashboardContent() {

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-600 mt-1">Welcome back! Here's your financial overview</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Current Month</p>
                <p className="text-xl sm:text-2xl font-bold">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </div>


          {/* Quick Actions */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <a href="/expenses" className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow text-center group">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-blue-200 transition-colors">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-900">Add Expense</p>
              </a>
              
              <a href="/budgets" className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow text-center group">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-green-200 transition-colors">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-900">Add Budget</p>
              </a>
              
              <a href="/analytics" className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow text-center group">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-purple-200 transition-colors">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-900">View Analytics</p>
              </a>
              
              <a href="/expenses" className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow text-center group">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-orange-200 transition-colors">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-900">View Expenses</p>
              </a>
            </div>
          </div>


        </div>
      </div>
    )
  }

      // Listen for messages from popup
      useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'AUTH_SUCCESS') {
            if (event.data.tokens) {
              const { access_token, refresh_token } = event.data.tokens
              document.cookie = `access_token=${access_token}; Secure; SameSite=None; Path=/; Max-Age=900`
              document.cookie = `refresh_token=${refresh_token}; Secure; SameSite=None; Path=/; Max-Age=604800`
            }
            if (event.data.user) {
              setUser(event.data.user)
            }
            checkAuth()
          } else if (event.data?.type === 'ACCESS_DENIED') {
            setUser(null)
            setAccessDenied(true)
            if (event.data.userInfo) {
              setDeniedUserInfo(event.data.userInfo)
            }
          }
        }

        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
      }, [])

  useEffect(() => {
    if (!popup) return

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        setPopup(null)
        clearInterval(checkClosed)
        checkAuth()
      }
    }, 1000)

    return () => clearInterval(checkClosed)
  }, [popup])

  const checkAuth = async () => {
    showLoading('Checking authentication...')
    try {
      const userData = await getCurrentUser()
      if (userData) {
        setUser(userData)
      } else {
        setUser(null)
      }
    } catch (error) {
      setUser(null)
    } finally {
      hideLoading()
    }
  }

  const handleSignIn = async () => {
    try {
      showLoading('Redirecting to Google for login...')
      const authUrl = await signInWithGoogle()
      const newPopup = (window as any).open(authUrl, 'oauthPopup', 'width=600,height=700,left=200,top=200')
      setPopup(newPopup)
    } catch (error) {
      console.error('Google sign-in failed:', error)
      showError('Google sign-in failed', 'Please try again.')
      hideLoading()
    }
  }

  const handleSignOut = async () => {
    try {
      showLoading('Signing out...')
      await authenticatedFetch('/api/auth/signout', { method: 'POST' })
      // Clear cookies from browser
      document.cookie = 'access_token=; Secure; SameSite=None; Path=/; Max-Age=0'
      document.cookie = 'refresh_token=; Secure; SameSite=None; Path=/; Max-Age=0'
      setUser(null)
      showSuccess('Signed out successfully!')
      // Redirect to login page
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      showError('Sign out failed', 'Please try again.')
    } finally {
      hideLoading()
    }
  }

  if (accessDenied) {
    return <AccessDenied userInfo={deniedUserInfo || undefined} onRetry={() => setAccessDenied(false)} />
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">Expenfyre</h1>
            <p className="text-gray-600">Sign in to continue</p>
            </div>
            
                <button
                  onClick={handleSignIn}
            className="w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center space-x-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
        </div>
      </div>
    )
  }

  return (
    <Layout user={user} currentPage="/" onSignOut={handleSignOut}>
      <DashboardContent />
    </Layout>
  )
}
