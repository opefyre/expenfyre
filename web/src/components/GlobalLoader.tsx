'use client'

import { useLoading } from '@/contexts/LoadingContext'

export default function GlobalLoader() {
  const { isLoading, loadingMessage } = useLoading()
  
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20 max-w-xs mx-4">
        {/* Minimal Spinner */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <div className="w-8 h-8 border-2 border-slate-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          
          {/* Loading Message */}
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">{loadingMessage}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
