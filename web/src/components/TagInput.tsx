'use client'

import { useState, useRef, KeyboardEvent, FocusEvent } from 'react'

interface TagInputProps {
  value: string // Comma-separated tags string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function TagInput({ value, onChange, placeholder = "Add tags...", className = "" }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Convert comma-separated string to array of tags
  const tags = value ? value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []

  const addTag = (tagText: string) => {
    const trimmedTag = tagText.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag]
      onChange(newTags.join(', '))
    }
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove)
    onChange(newTags.join(', '))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      if (inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(tags[tags.length - 1])
    }
  }

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    // Add tag when input loses focus (for mobile tap)
    if (inputValue.trim()) {
      addTag(inputValue)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Don't allow commas in the input
    if (!value.includes(',')) {
      setInputValue(value)
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Tags Display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-1 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 text-sm rounded-md group hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1.5 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                aria-label={`Remove ${tag} tag`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : "Add another tag..."}
        className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
      />

      {/* Helper Text */}
      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
        Press Enter, Tab, or tap outside to add tags
      </p>
    </div>
  )
}
