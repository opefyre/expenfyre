'use client'

import { useState } from 'react'
import AccessRequest from './AccessRequest'

interface AccessDeniedProps {
  onRetry?: () => void
  userInfo?: {
    email: string
    name: string
    picture?: string
    google_id: string
  }
}

export default function AccessDenied({ onRetry, userInfo }: AccessDeniedProps) {
  const [showRequestForm, setShowRequestForm] = useState(false)

  if (showRequestForm && userInfo) {
    return <AccessRequest userInfo={userInfo} onClose={() => setShowRequestForm(false)} />
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-red-200/30 rounded-full blur-3xl float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-200/20 rounded-full blur-2xl float" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-card rounded-3xl p-8 text-center">
          {/* Error Icon */}
          <div className="error-icon mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          {/* Content */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-3">Access Denied</h1>
              <p className="text-slate-600 text-lg">
                You are not authorized to access this application.
              </p>
              <p className="text-slate-500 text-sm mt-2">
                Request access below or contact your administrator.
              </p>
            </div>
            
            {/* User Info Display */}
            {userInfo && (
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/50">
                <p className="text-sm font-medium text-slate-700 mb-2">Your Information:</p>
                <div className="flex items-center space-x-3">
                  {userInfo.picture && (
                    <img 
                      src={userInfo.picture} 
                      alt="Profile" 
                      className="w-10 h-10 rounded-xl border-2 border-white/50" 
                    />
                  )}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-800">{userInfo.name}</p>
                    <p className="text-xs text-slate-500">{userInfo.email}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="space-y-4">
              {userInfo && (
                <button
                  onClick={() => setShowRequestForm(true)}
                  className="btn-success w-full flex items-center justify-center space-x-2 py-4 text-lg font-medium"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Request Access</span>
                </button>
              )}
              
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Try Again</span>
                </button>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary w-full flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh Page</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
