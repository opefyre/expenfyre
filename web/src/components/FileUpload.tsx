'use client'

import { useState, useRef } from 'react'

interface FileUploadProps {
  value: string // Receipt URL
  onChange: (url: string) => void
  onUpload: (file: File) => Promise<string> // Upload function that returns URL
  className?: string
}

export default function FileUpload({ value, onChange, onUpload, className = "" }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Please select an image or PDF file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    try {
      const url = await onUpload(file)
      onChange(url)
      setPreview(URL.createObjectURL(file))
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }


  const removeFile = () => {
    onChange('')
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Current File Display */}
      {value && (
        <div className="relative">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Receipt uploaded</p>
                <button
                  type="button"
                  onClick={() => window.open(value, '_blank')}
                  className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  Click to view
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {preview && (
            <div className="mt-2">
              <img 
                src={preview} 
                alt="Receipt preview" 
                className="w-full h-32 object-cover rounded-lg border border-slate-200"
              />
            </div>
          )}
        </div>
      )}

      {/* Upload Button - Single Unified Button */}
      {!value && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-center">
            <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm font-medium text-slate-700">
              {isUploading ? 'Uploading...' : 'Add Receipt'}
            </p>
            <p className="text-xs text-slate-500">Photo or PDF (max 10MB)</p>
          </div>
        </button>
      )}

      {/* Single Hidden File Input - No capture attribute for consistency */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  )
}
