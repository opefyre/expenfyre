'use client'

import { useState, useEffect } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    }
  }, [isOpen])

  const handleConfirm = () => {
    setIsVisible(false)
    setTimeout(() => onConfirm(), 150)
  }

  const handleCancel = () => {
    setIsVisible(false)
    setTimeout(() => onCancel(), 150)
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: (
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          confirmButton: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white'
        }
      case 'warning':
        return {
          icon: (
            <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          confirmButton: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white'
        }
      case 'info':
        return {
          icon: (
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          confirmButton: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white'
        }
    }
  }

  if (!isOpen) return null

  const typeStyles = getTypeStyles()

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 max-w-md w-full transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {typeStyles.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 dark:text-gray-400">{message}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${typeStyles.confirmButton}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
