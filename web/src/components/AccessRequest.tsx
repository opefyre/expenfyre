'use client'

import { useState } from 'react'

interface AccessRequestProps {
  userInfo: {
    email: string
    name: string
    picture?: string
    google_id: string
  }
  onClose: () => void
}

export default function AccessRequest({ userInfo, onClose }: AccessRequestProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://expense-tracker-api.opefyre.workers.dev'
      console.log('Submitting access request to:', `${API_URL}/api/access-request`)
      console.log('User info:', userInfo)
      
      const response = await fetch(`${API_URL}/api/access-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userInfo)
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      const result = await response.json()
      console.log('Response result:', result)

      if (result.success) {
        setIsSubmitted(true)
      } else {
        setError(result.error || 'Failed to submit access request')
      }
    } catch (err) {
      console.error('Access request error:', err)
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl float" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-200/20 rounded-full blur-2xl float" style={{animationDelay: '4s'}}></div>
        </div>

        <div className="relative z-10 w-full max-w-md mx-4">
          <div className="glass-card rounded-3xl p-8 text-center">
            {/* Success Icon */}
            <div className="checkmark mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-800 mb-3">Request Submitted!</h2>
                <p className="text-slate-600 text-lg">
                  Your access request has been successfully submitted.
                </p>
              </div>
              
              <button
                onClick={onClose}
                className="btn-primary w-full flex items-center justify-center space-x-2 py-4 text-lg font-medium"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-200/20 rounded-full blur-2xl float" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-card rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="info-icon mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-3">Request Access</h2>
            <p className="text-slate-600">Submit your information to request access</p>
          </div>
          
          {/* User Information Display */}
          <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-200/50 mb-8">
            <p className="text-sm font-semibold text-slate-700 mb-4 text-center">Your Information</p>
            <div className="flex items-center space-x-4">
              {userInfo.picture && (
                <img 
                  src={userInfo.picture} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-2xl border-4 border-white/50 shadow-lg" 
                />
              )}
              <div className="flex-1 text-left">
                <p className="text-lg font-semibold text-slate-800 mb-1">{userInfo.name}</p>
                <p className="text-slate-500 text-sm">{userInfo.email}</p>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-slate-500">Google Account</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-success w-full flex items-center justify-center space-x-2 py-4 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="spinner w-5 h-5"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Submit Access Request</span>
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
