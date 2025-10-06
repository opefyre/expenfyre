'use client'

import { useState, useRef, useEffect } from 'react'

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

export default function Select({ value, onChange, options, placeholder = "Select...", className = "" }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(option => option.value === value)

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-slate-400 dark:focus:ring-gray-500 focus:border-slate-400 dark:focus:border-gray-500 transition-colors text-left flex items-center justify-between bg-white dark:bg-gray-700 hover:bg-slate-50 dark:hover:bg-gray-600"
      >
        <span className={selectedOption ? 'text-slate-900 dark:text-gray-100' : 'text-slate-500 dark:text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg 
          className={`w-4 h-4 text-slate-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                option.value === value 
                  ? 'bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-100 font-medium' 
                  : 'text-slate-700 dark:text-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
