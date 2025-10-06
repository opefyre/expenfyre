'use client'

import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="
        relative inline-flex h-8 w-14 items-center rounded-full border-2 border-transparent
        bg-gray-200 dark:bg-gray-700 transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        hover:bg-gray-300 dark:hover:bg-gray-600
      "
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span
        className={`
          ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}
          inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-800
          shadow-lg transition-transform duration-200 ease-in-out
          flex items-center justify-center
        `}
      >
        {theme === 'light' ? (
          <Sun className="h-3 w-3 text-yellow-500" />
        ) : (
          <Moon className="h-3 w-3 text-blue-400" />
        )}
      </span>
    </button>
  )
}
