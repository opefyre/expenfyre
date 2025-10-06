'use client'

import { useState, useEffect, useRef } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastComponent({ toast, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const onRemoveRef = useRef(onRemove)

  // Update ref when onRemove changes
  useEffect(() => {
    onRemoveRef.current = onRemove
  }, [onRemove])

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Auto remove after duration
    console.log('Toast auto-dismiss setup:', { id: toast.id, duration: toast.duration, type: toast.type })
    const duration = toast.duration || 3000 // Default to 3 seconds if undefined
    if (duration > 0) {
      const timer = setTimeout(() => {
        console.log('Toast auto-dismissing:', toast.id)
        setIsLeaving(true)
        setTimeout(() => {
          onRemoveRef.current(toast.id)
        }, 300) // Match animation duration
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [toast.duration, toast.id])

  const handleRemove = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 300) // Match animation duration
  }

  const getToastStyles = () => {
    const baseStyles = "rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300 ease-out"
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100`
      case 'error':
        return `${baseStyles} bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100`
      case 'warning':
        return `${baseStyles} bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100`
      case 'info':
        return `${baseStyles} bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100`
      default:
        return `${baseStyles} bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100`
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div className={`${getToastStyles()} p-4 min-w-80 max-w-md`}>
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">{toast.title}</h4>
            {toast.message && (
              <p className="text-sm opacity-90 mt-1">{toast.message}</p>
            )}
          </div>
          
          {/* Close Button */}
          <button
            onClick={handleRemove}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ToastComponent
