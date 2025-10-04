const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://expense-tracker-api.opefyre.workers.dev'

export interface User {
  id: string
  name: string
  email: string
  picture?: string
  created_at: string
}

export function signInWithGoogle() {
  // Open OAuth in a new window
  const popup = window.open(
    `${API_URL}/api/auth/google`,
    'google-auth',
    'width=500,height=600,scrollbars=yes,resizable=yes'
  )
  
  if (!popup) {
    throw new Error('Popup blocked by browser')
  }
  
  return popup
}

export async function signOut() {
  try {
    const response = await fetch(`${API_URL}/api/auth/signout`, {
      method: 'POST',
      credentials: 'include',
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Sign out failed: ${errorText}`)
    }
    
    // Clear cookies from browser
    document.cookie = 'access_token=; Secure; SameSite=None; Path=/; Max-Age=0'
    document.cookie = 'refresh_token=; Secure; SameSite=None; Path=/; Max-Age=0'
    
  } catch (error) {
    throw error
  }
}

export async function getCurrentUser(): Promise<User | null> {
  // Get token from cookies
  const accessToken = getCookie('access_token')
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  // Add Authorization header if token exists
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: 'GET',
      headers,
      credentials: 'include',
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('getCurrentUser: 401 Unauthorized - no valid token')
        return null
      }
      
      const errorText = await response.text()
      console.error('Auth check failed:', response.status, errorText)
      return null
    }
    
    const userData = await response.json()
    
    if (userData.success && userData.user) {
      return userData.user
    } else {
      console.error('Invalid user data received:', userData)
      return null
    }
    
  } catch (error) {
    console.error('getCurrentUser error:', error)
    return null
  }
}

// Generic authenticated API call function with automatic token refresh
export async function authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = getCookie('access_token')
  const refreshToken = getCookie('refresh_token')
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  
  // Only set Content-Type to application/json if not already set and body is not FormData
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  
  // Add Authorization header if token exists
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  
  // Make the initial request
  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  })
  
  // If we get a 401 and have a refresh token, try to refresh
  if (response.status === 401 && refreshToken && endpoint !== '/api/auth/refresh') {
    console.log('Access token expired, attempting refresh...')
    try {
      const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
      
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        console.log('Token refresh successful')
        
        // Update cookies with new tokens
        document.cookie = `access_token=${refreshData.access_token}; Secure; SameSite=None; Path=/; Max-Age=900`
        document.cookie = `refresh_token=${refreshData.refresh_token}; Secure; SameSite=None; Path=/; Max-Age=604800`
        
        // Retry the original request with new access token
        headers['Authorization'] = `Bearer ${refreshData.access_token}`
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        })
        console.log('Retry request successful:', response.status)
      } else {
        console.error('Token refresh failed:', refreshResponse.status)
        // Clear invalid tokens
        document.cookie = 'access_token=; Secure; SameSite=None; Path=/; Max-Age=0'
        document.cookie = 'refresh_token=; Secure; SameSite=None; Path=/; Max-Age=0'
        // Refresh failed, redirect to login
        window.location.href = '/'
        return response
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      // Clear invalid tokens
      document.cookie = 'access_token=; Secure; SameSite=None; Path=/; Max-Age=0'
      document.cookie = 'refresh_token=; Secure; SameSite=None; Path=/; Max-Age=0'
      // Refresh failed, redirect to login
      window.location.href = '/'
      return response
    }
  }
  
  return response
}

// Helper function to get cookie value
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}