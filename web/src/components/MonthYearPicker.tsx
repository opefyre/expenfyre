'use client'

import { useState, useRef, useEffect } from 'react'

interface MonthYearPickerProps {
  value: string // Format: "YYYY-MM"
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

export default function MonthYearPicker({ value, onChange, placeholder = "Select month", className = "", disabled = false, required = false }: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(value ? new Date(value + '-01') : null)
  const [currentYear, setCurrentYear] = useState<number>(selectedMonth?.getFullYear() || new Date().getFullYear())
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      const date = new Date(value + '-01')
      setSelectedMonth(date)
      setCurrentYear(date.getFullYear())
    } else {
      // Clear the selected month when value is empty
      setSelectedMonth(null)
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDisplayValue = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    })
  }

  const formatValue = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  const handleMonthSelect = (month: number) => {
    if (disabled) return
    const date = new Date(currentYear, month, 1)
    setSelectedMonth(date)
    onChange(formatValue(date))
    setIsOpen(false)
  }

  const navigateYear = (direction: 'prev' | 'next') => {
    if (disabled) return
    setCurrentYear(prev => direction === 'prev' ? prev - 1 : prev + 1)
  }

  const isCurrentMonth = (month: number) => {
    const today = new Date()
    return currentYear === today.getFullYear() && month === today.getMonth()
  }

  const isSelected = (month: number) => {
    return selectedMonth && 
           selectedMonth.getFullYear() === currentYear && 
           selectedMonth.getMonth() === month
  }

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={selectedMonth ? formatDisplayValue(selectedMonth) : ''}
        onChange={() => {}} // Controlled by the picker
        onClick={() => !disabled && setIsOpen(!isOpen)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${disabled ? 'cursor-not-allowed bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-500'} ${className}`}
        readOnly
        disabled={disabled}
        required={required}
      />
      
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-48"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => navigateYear('prev')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {currentYear}
            </h3>
            <button
              onClick={() => navigateYear('next')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-4 gap-1 p-3">
            {monthNames.map((month, index) => (
              <button
                key={index}
                onClick={() => handleMonthSelect(index)}
                className={`
                  px-2 py-2 text-sm rounded transition-colors text-center
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  ${isCurrentMonth(index) ? 'bg-gray-100 dark:bg-gray-700 font-medium' : ''}
                  ${isSelected(index) ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                  ${!isSelected(index) && !isCurrentMonth(index) ? 'text-gray-700 dark:text-gray-300' : ''}
                `}
              >
                {month}
              </button>
            ))}
          </div>

          {/* Current Month Button */}
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                const today = new Date()
                const date = new Date(today.getFullYear(), today.getMonth(), 1)
                setSelectedMonth(date)
                setCurrentYear(today.getFullYear())
                onChange(formatValue(date))
                setIsOpen(false)
              }}
              className="w-full text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 py-1"
            >
              Current Month
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
