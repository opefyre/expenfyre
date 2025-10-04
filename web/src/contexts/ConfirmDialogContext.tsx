'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface ConfirmDialogData {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
}

interface ConfirmDialogContextType {
  showConfirm: (data: ConfirmDialogData) => void
  hideConfirm: () => void
  isOpen: boolean
  dialogData: ConfirmDialogData | null
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined)

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [dialogData, setDialogData] = useState<ConfirmDialogData | null>(null)

  const showConfirm = useCallback((data: ConfirmDialogData) => {
    setDialogData(data)
    setIsOpen(true)
  }, [])

  const hideConfirm = useCallback(() => {
    setIsOpen(false)
    setDialogData(null)
  }, [])

  return (
    <ConfirmDialogContext.Provider value={{ showConfirm, hideConfirm, isOpen, dialogData }}>
      {children}
    </ConfirmDialogContext.Provider>
  )
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext)
  if (context === undefined) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider')
  }
  return context
}
