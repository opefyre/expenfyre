'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface LoadingContextType {
  isLoading: boolean
  loadingMessage: string
  setLoading: (isLoading: boolean, message?: string) => void
  showLoading: (message?: string) => void
  hideLoading: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Loading...')

  const setLoading = useCallback((loading: boolean, message = 'Loading...') => {
    setIsLoading(loading)
    setLoadingMessage(message)
  }, [])

  const showLoading = useCallback((message = 'Loading...') => {
    setLoading(true, message)
  }, [setLoading])

  const hideLoading = useCallback(() => {
    setLoading(false)
  }, [setLoading])

  return (
    <LoadingContext.Provider value={{
      isLoading,
      loadingMessage,
      setLoading,
      showLoading,
      hideLoading
    }}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}
