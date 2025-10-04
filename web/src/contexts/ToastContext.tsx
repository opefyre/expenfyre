'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Toast, ToastType } from '@/components/Toast'

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    
    // Set different durations based on toast type
    let defaultDuration = 3000 // 3 seconds default
    if (toast.type === 'error') {
      defaultDuration = 5000 // 5 seconds for errors (more important)
    } else if (toast.type === 'success') {
      defaultDuration = 2500 // 2.5 seconds for success (quick confirmation)
    } else if (toast.type === 'warning') {
      defaultDuration = 4000 // 4 seconds for warnings
    }
    
    const newToast: Toast = {
      id,
      duration: toast.duration !== undefined ? toast.duration : defaultDuration,
      ...toast
    }
    
    console.log('Adding toast:', { type: toast.type, duration: newToast.duration, title: toast.title })
    setToasts(prev => [...prev, newToast])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Convenience functions for common toast types
export function useToastHelpers() {
  const { addToast } = useToast()

  const showSuccess = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'success', title, message, duration })
  }, [addToast])

  const showError = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'error', title, message, duration })
  }, [addToast])

  const showWarning = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'warning', title, message, duration })
  }, [addToast])

  const showInfo = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'info', title, message, duration })
  }, [addToast])

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}
