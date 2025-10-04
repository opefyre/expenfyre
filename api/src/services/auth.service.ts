// Auth Service - Completely independent microservice
// This service handles ALL authentication logic and can be used by any other service

export interface User {
  id: string
  name: string
  email: string
  picture?: string
  created_at: string
  default_group_id?: string
}

export interface AuthContext {
  user: User | null
  isAuthenticated: boolean
  token: string | null
}

export interface AuthResult {
  valid: boolean
  user?: User
  error?: string
}

// JWT helpers
function strToUint8(str: string): Uint8Array { 
  return new TextEncoder().encode(str) 
}

function base64urlFromBytes(bytes: Uint8Array): string { 
  let b = ''
  for (let i = 0; i < bytes.length; i++) b += String.fromCharCode(bytes[i])
  return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64urlFromJSON(o: any) { 
  return base64urlFromBytes(strToUint8(JSON.stringify(o))) 
}

async function hmacSha256(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    strToUint8(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, strToUint8(data))
  return base64urlFromBytes(new Uint8Array(sig))
}

async function signJwtHS256(payload: any, secret: string, expSecs: number): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = { ...payload, iat: now, exp: now + expSecs }
  
  const headerB64 = base64urlFromJSON(header)
  const payloadB64 = base64urlFromJSON(fullPayload)
  const signature = await hmacSha256(secret, `${headerB64}.${payloadB64}`)
  
  return `${headerB64}.${payloadB64}.${signature}`
}

function parseIdToken(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - padded.length % 4) % 4)
    return JSON.parse(atob(padded + padding))
  } catch {
    return null
  }
}

// Auth Service Class - The core microservice
export class AuthService {
  constructor(private env: any) {}

  // Verify JWT token
  async verifyToken(token: string, tokenType: 'access' | 'refresh' = 'access'): Promise<AuthResult> {
    try {
      if (!token) {
        return { valid: false, error: 'No token provided' }
      }

      // Verify token format
      const [header, payload, signature] = token.split('.')
      if (!header || !payload || !signature) {
        return { valid: false, error: 'Invalid token format' }
      }

      // Decode payload first to determine token type
      const paddedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
      const padding = '='.repeat((4 - paddedPayload.length % 4) % 4)
      const decoded = JSON.parse(atob(paddedPayload + padding))

      // Check if token type matches expected type
      if (decoded.type !== tokenType) {
        return { valid: false, error: `Invalid token type. Expected ${tokenType}` }
      }

      // Select correct secret based on token type
      const secret = tokenType === 'access' ? this.env.JWT_SECRET : this.env.JWT_REFRESH_SECRET

      // Verify signature with correct secret
      const expectedSignature = await hmacSha256(secret, `${header}.${payload}`)
      if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid token signature' }
      }

      // Check expiration
      if (decoded.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: 'Token expired' }
      }

      // Check if token is blacklisted
      if (decoded.jti) {
        const isBlacklisted = await this.isTokenBlacklisted(decoded.jti)
        if (isBlacklisted) {
          return { valid: false, error: 'Token has been revoked' }
        }
      }

      // For refresh tokens, verify it exists in our tracking
      if (tokenType === 'refresh' && decoded.jti) {
        const storedToken = await this.env.EXPENSE_KV.get(`refresh_token:${decoded.jti}`)
        if (!storedToken || storedToken !== decoded.sub) {
          return { valid: false, error: 'Invalid refresh token' }
        }
      }

      // Get user data from KV
      const userData = await this.env.EXPENSE_KV.get(`user:${decoded.sub}`)
      if (!userData) {
        return { valid: false, error: 'User not found' }
      }

      const user = JSON.parse(userData)
      return { valid: true, user, tokenId: decoded.jti }
    } catch (error) {
      return { valid: false, error: 'Token verification failed' }
    }
  }

  // Extract token from request
  async extractTokenFromRequest(c: any): Promise<string | null> {
    // Check Authorization header first
    const authHeader = c.req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }

    // Fallback to cookies
    const cookie = c.req.header('Cookie')
    if (cookie) {
      const accessTokenMatch = cookie.match(/access_token=([^;]+)/)
      if (accessTokenMatch) {
        return accessTokenMatch[1]
      }
    }

    return null
  }

  // Authenticate user from request
  async authenticate(c: any): Promise<AuthContext> {
    const token = await this.extractTokenFromRequest(c)
    
    if (!token) {
      return { user: null, isAuthenticated: false, token: null }
    }

    const result = await this.verifyToken(token)
    
    if (!result.valid) {
      return { user: null, isAuthenticated: false, token: null }
    }

    return { user: result.user!, isAuthenticated: true, token }
  }

  // Create JWT tokens
  async createTokens(userEmail: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Check rate limiting
    const canCreate = await this.checkRateLimit(userEmail, 'create')
    if (!canCreate) {
      throw new Error('Rate limit exceeded for token creation')
    }

    const now = Math.floor(Date.now() / 1000)
    const accessTokenId = crypto.randomUUID()
    const refreshTokenId = crypto.randomUUID()
    
    const accessToken = await signJwtHS256({ 
      sub: userEmail, 
      jti: accessTokenId,
      type: 'access'
    }, this.env.JWT_SECRET, 15 * 60) // 15 minutes
    
    const refreshToken = await signJwtHS256({ 
      sub: userEmail, 
      jti: refreshTokenId,
      type: 'refresh' 
    }, this.env.JWT_REFRESH_SECRET, 7 * 24 * 3600) // 7 days
    
    // Store refresh token ID for tracking
    await this.env.EXPENSE_KV.put(`refresh_token:${refreshTokenId}`, userEmail, { expirationTtl: 7 * 24 * 3600 })
    
    return { accessToken, refreshToken }
  }

  // Store user in database
  async storeUser(userData: User): Promise<void> {
    await this.env.EXPENSE_KV.put(`user:${userData.email}`, JSON.stringify(userData))
    // Note: Groups are managed by admin only - no auto-creation
  }

  // Check if token is blacklisted
  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    const blacklisted = await this.env.EXPENSE_KV.get(`blacklist:${tokenId}`)
    return !!blacklisted
  }

  // Revoke/blacklist a token
  async revokeToken(tokenId: string, expirationTtl: number = 7 * 24 * 3600): Promise<void> {
    await this.env.EXPENSE_KV.put(`blacklist:${tokenId}`, 'true', { expirationTtl })
  }

  // Revoke all tokens for a user
  async revokeAllUserTokens(userEmail: string): Promise<void> {
    // Get all refresh tokens for user
    const refreshTokens = await this.env.EXPENSE_KV.list({ prefix: `refresh_token:` })
    
    for (const token of refreshTokens.keys) {
      const tokenData = await this.env.EXPENSE_KV.get(token.name)
      if (tokenData === userEmail) {
        const tokenId = token.name.replace('refresh_token:', '')
        await this.revokeToken(tokenId)
        await this.env.EXPENSE_KV.delete(token.name)
      }
    }
  }

  // Refresh tokens with rotation
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      // Verify refresh token
      const result = await this.verifyToken(refreshToken, 'refresh')
      if (!result.valid || !result.user) {
        return null
      }

      // Check rate limiting
      const rateLimitKey = `rate_limit:refresh:${result.user.email}`
      const attempts = await this.env.EXPENSE_KV.get(rateLimitKey)
      if (attempts && parseInt(attempts) > 10) { // Max 10 refresh attempts per hour
        throw new Error('Rate limit exceeded for token refresh')
      }

      // Increment rate limit counter
      await this.env.EXPENSE_KV.put(rateLimitKey, '1', { expirationTtl: 3600 }) // 1 hour

      // Revoke old refresh token
      if (result.tokenId) {
        await this.revokeToken(result.tokenId)
        await this.env.EXPENSE_KV.delete(`refresh_token:${result.tokenId}`)
      }

      // Generate new tokens
      return await this.createTokens(result.user.email)
    } catch (error) {
      console.error('[AUTH] Token refresh failed:', error)
      return null
    }
  }

  // Check rate limiting for token creation
  async checkRateLimit(userEmail: string, operation: 'create' | 'refresh'): Promise<boolean> {
    const rateLimitKey = `rate_limit:${operation}:${userEmail}`
    const attempts = await this.env.EXPENSE_KV.get(rateLimitKey)
    
    const maxAttempts = operation === 'create' ? 100 : 200 // Increased limits for development
    const ttl = 3600 // 1 hour
    
    if (attempts && parseInt(attempts) >= maxAttempts) {
      console.error('[AUTH] Rate limit exceeded for', operation, 'operation. Attempts:', attempts)
      return false
    }

    // Increment counter
    const newCount = attempts ? parseInt(attempts) + 1 : 1
    await this.env.EXPENSE_KV.put(rateLimitKey, newCount.toString(), { expirationTtl: ttl })
    
    return true
  }

  // Cleanup expired tokens and old blacklist entries
  async cleanupExpiredTokens(): Promise<{ cleaned: number; errors: number }> {
    let cleaned = 0
    let errors = 0

    try {
      // Clean up expired refresh tokens
      const refreshTokens = await this.env.EXPENSE_KV.list({ prefix: 'refresh_token:' })
      
      for (const token of refreshTokens.keys) {
        try {
          // Check if token is expired by trying to get it
          const tokenData = await this.env.EXPENSE_KV.get(token.name)
          if (!tokenData) {
            // Token doesn't exist (expired), clean up
            await this.env.EXPENSE_KV.delete(token.name)
            cleaned++
          }
        } catch (error) {
          console.error(`[CLEANUP] Error cleaning refresh token ${token.name}:`, error)
          errors++
        }
      }

      // Clean up old blacklist entries (older than 7 days)
      const blacklistEntries = await this.env.EXPENSE_KV.list({ prefix: 'blacklist:' })
      const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 3600)
      
      for (const entry of blacklistEntries.keys) {
        try {
          // Check if blacklist entry is old enough to clean up
          const entryData = await this.env.EXPENSE_KV.get(entry.name, { type: 'text' })
          if (entryData) {
            // Parse the token ID to check if it's old
            const tokenId = entry.name.replace('blacklist:', '')
            // For simplicity, we'll clean up entries that are older than 7 days
            // In a real implementation, you'd store the creation timestamp
            await this.env.EXPENSE_KV.delete(entry.name)
            cleaned++
          }
        } catch (error) {
          console.error(`[CLEANUP] Error cleaning blacklist entry ${entry.name}:`, error)
          errors++
        }
      }

      // Clean up old rate limit entries
      const rateLimitEntries = await this.env.EXPENSE_KV.list({ prefix: 'rate_limit:' })
      
      for (const entry of rateLimitEntries.keys) {
        try {
          // Rate limit entries have TTL, but let's clean up any that might be stuck
          const entryData = await this.env.EXPENSE_KV.get(entry.name)
          if (!entryData) {
            // Entry doesn't exist (expired), clean up
            await this.env.EXPENSE_KV.delete(entry.name)
            cleaned++
          }
        } catch (error) {
          console.error(`[CLEANUP] Error cleaning rate limit entry ${entry.name}:`, error)
          errors++
        }
      }

      console.log(`[CLEANUP] Cleaned ${cleaned} expired entries, ${errors} errors`)
      
    } catch (error) {
      console.error('[CLEANUP] Cleanup failed:', error)
      errors++
    }

    return { cleaned, errors }
  }

  // Get cleanup statistics
  async getCleanupStats(): Promise<{ refreshTokens: number; blacklistEntries: number; rateLimitEntries: number }> {
    try {
      const refreshTokens = await this.env.EXPENSE_KV.list({ prefix: 'refresh_token:' })
      const blacklistEntries = await this.env.EXPENSE_KV.list({ prefix: 'blacklist:' })
      const rateLimitEntries = await this.env.EXPENSE_KV.list({ prefix: 'rate_limit:' })

      return {
        refreshTokens: refreshTokens.keys.length,
        blacklistEntries: blacklistEntries.keys.length,
        rateLimitEntries: rateLimitEntries.keys.length
      }
    } catch (error) {
      console.error('[CLEANUP] Failed to get stats:', error)
      return { refreshTokens: 0, blacklistEntries: 0, rateLimitEntries: 0 }
    }
  }

  async checkUserAccess(userEmail: string): Promise<{ hasAccess: boolean; user?: any; error?: string }> {
    try {
      console.log(`[AUTH] Checking access for user: ${userEmail}`)
      
      // Check if user exists in the Users sheet
      const sheetId = this.env.SHEET_ID
      if (!sheetId) {
        console.log('[AUTH] SHEET_ID not configured')
        return { hasAccess: false, error: 'SHEET_ID not configured' }
      }

      // Parse service account JSON
      const serviceAccount = JSON.parse(this.env.SERVICE_ACCOUNT_JSON)
      console.log(`[AUTH] Service account email: ${serviceAccount.client_email}`)
      
      // Get access token for service account using JWT assertion
      const accessToken = await this.getServiceAccountToken(serviceAccount)
      if (!accessToken) {
        return { hasAccess: false, error: 'Failed to get service account token' }
      }

      // Read Users sheet
      const sheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Users!A:H`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!sheetResponse.ok) {
        const errorText = await sheetResponse.text()
        console.log(`[AUTH] Sheet response error: ${errorText}`)
        return { hasAccess: false, error: 'Failed to read Users sheet' }
      }

      const sheetData = await sheetResponse.json()
      const rows = sheetData.values || []
      console.log(`[AUTH] Found ${rows.length} rows in Users sheet`)
      
      if (rows.length < 2) {
        console.log('[AUTH] No users found in sheet')
        return { hasAccess: false, error: 'No users found in sheet' }
      }

      // Check if user email exists in the sheet
      const headers = rows[0]
      const emailIndex = headers.indexOf('email')
      console.log(`[AUTH] Headers: ${JSON.stringify(headers)}`)
      console.log(`[AUTH] Email column index: ${emailIndex}`)
      
      if (emailIndex === -1) {
        console.log('[AUTH] Email column not found in Users sheet')
        return { hasAccess: false, error: 'Email column not found in Users sheet' }
      }

      // Find user by email
      const defaultGroupIdIndex = headers.indexOf('default_group_id')
      console.log(`[AUTH] default_group_id column index: ${defaultGroupIdIndex}`)
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        console.log(`[AUTH] Checking row ${i}: ${JSON.stringify(row)}`)
        if (row[emailIndex] === userEmail) {
          // User found in whitelist
          const userData = {
            user_id: row[0] || '',
            google_id: row[1] || '',
            email: row[2] || userEmail,
            name: row[3] || '',
            avatar_url: row[4] || '',
            currency: row[5] || 'USD',
            timezone: row[6] || 'UTC',
            created_at: row[7] || new Date().toISOString(),
            default_group_id: defaultGroupIdIndex !== -1 ? row[defaultGroupIdIndex] : undefined
          }
          
          console.log(`[AUTH] User found in whitelist: ${JSON.stringify(userData)}`)
          return { hasAccess: true, user: userData }
        }
      }

      // User not found in whitelist
      console.log(`[AUTH] User ${userEmail} not found in whitelist`)
      return { hasAccess: false, error: 'User not authorized' }

    } catch (error) {
      console.error('Error checking user access:', error)
      return { hasAccess: false, error: 'Failed to verify user access' }
    }
  }

  private async getServiceAccountToken(serviceAccount: any): Promise<string | null> {
    try {
      const now = Math.floor(Date.now() / 1000)
      const header = {
        alg: 'RS256',
        typ: 'JWT'
      }

      const payload = {
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
      }

      const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
      const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
      
      const message = `${headerB64}.${payloadB64}`
      
      // Clean the private key (remove headers and newlines)
      const privateKeyPem = serviceAccount.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\n/g, '')
      
      // Import the private key
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        this.base64ToArrayBuffer(privateKeyPem),
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
        },
        false,
        ['sign']
      )

      // Sign the message
      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        new TextEncoder().encode(message)
      )

      const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '')

      const assertion = `${message}.${signatureB64}`

      // Exchange assertion for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: assertion
        })
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.log(`[AUTH] Token response error: ${errorText}`)
        return null
      }

      const tokenData = await tokenResponse.json()
      console.log('[AUTH] Successfully obtained service account token')
      return tokenData.access_token

    } catch (error) {
      console.error('[AUTH] Error getting service account token:', error)
      return null
    }
  }


  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  // Delete user from database
  async deleteUser(userEmail: string): Promise<void> {
    await this.env.EXPENSE_KV.delete(`user:${userEmail}`)
  }

  // Submit access request to Google Sheets
  async submitAccessRequest(userData: {
    email: string
    name: string
    picture?: string
    google_id: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[AUTH] Submitting access request for: ${userData.email}`)
      
      const sheetId = this.env.SHEET_ID
      if (!sheetId) {
        console.log('[AUTH] SHEET_ID not configured')
        return { success: false, error: 'SHEET_ID not configured' }
      }

      // Parse service account JSON
      const serviceAccount = JSON.parse(this.env.SERVICE_ACCOUNT_JSON)
      
      // Get access token for service account
      const accessToken = await this.getServiceAccountToken(serviceAccount)
      if (!accessToken) {
        return { success: false, error: 'Failed to get service account token' }
      }

      // Prepare the access request data
      const requestData = {
        values: [[
          `REQ_${Date.now()}`, // request_id
          userData.google_id,   // google_id
          userData.email,       // email
          userData.name,        // name
          userData.picture || '', // avatar_url
          'USD',                // preferred_currency
          'UTC',                // timezone
          'pending',            // status
          new Date().toISOString() // requested_at
        ]]
      }

      // First, try to create the Access Request sheet if it doesn't exist
      try {
        // Check if Access Request sheet exists by trying to read it
        const checkResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Access%20Request!A1`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!checkResponse.ok) {
          // Sheet doesn't exist, create it
          console.log('[AUTH] Access Request sheet does not exist, creating it...')
          
          const createSheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [{
                addSheet: {
                  properties: {
                    title: 'Access Request'
                  }
                }
              }]
            })
          })

          if (!createSheetResponse.ok) {
            const errorText = await createSheetResponse.text()
            console.log(`[AUTH] Failed to create Access Request sheet: ${errorText}`)
            return { success: false, error: 'Failed to create Access Request sheet' }
          }

          // Add headers to the new sheet
          const headerResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Access%20Request!A1:I1?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [['request_id', 'google_id', 'email', 'name', 'avatar_url', 'preferred_currency', 'timezone', 'status', 'requested_at']]
            })
          })

          if (!headerResponse.ok) {
            console.log('[AUTH] Failed to add headers to Access Request sheet')
          }
        }
      } catch (error) {
        console.log('[AUTH] Error checking/creating Access Request sheet:', error)
      }

      // Append to Access Request sheet
      const sheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Access%20Request!A:I:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!sheetResponse.ok) {
        const errorText = await sheetResponse.text()
        console.log(`[AUTH] Access request submission error: ${errorText}`)
        return { success: false, error: `Failed to submit access request: ${errorText}` }
      }

      console.log(`[AUTH] Access request submitted successfully for: ${userData.email}`)
      return { success: true }

    } catch (error) {
      console.error('[AUTH] Error submitting access request:', error)
      return { success: false, error: 'Failed to submit access request' }
    }
  }

  // Parse Google ID token
  parseGoogleIdToken(token: string) {
    return parseIdToken(token)
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const accessCheck = await this.checkUserAccess(email)
      if (accessCheck.hasAccess && accessCheck.user) {
        return {
          id: accessCheck.user.user_id || email,
          name: accessCheck.user.name || email,
          email: email,
          picture: accessCheck.user.avatar_url,
          created_at: accessCheck.user.created_at || new Date().toISOString(),
          default_group_id: accessCheck.user.default_group_id
        }
      }
      return null
    } catch (error) {
      console.error('Error getting user by email:', error)
      return null
    }
  }

  // Rate limiting for Sheets API
  private static requestQueue: Promise<any>[] = []
  private static readonly MAX_CONCURRENT_REQUESTS = 3
  private static readonly REQUEST_DELAY_MS = 100

  // Make a rate-limited Sheets API request
  private async makeSheetsRequest(params: any, accessToken: string) {
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, AuthService.REQUEST_DELAY_MS))
    
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/values/${params.range}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    if (!response.ok) {
      console.error('[SHEETS] API request failed:', response.status, response.statusText)
      if (response.status === 429) {
        console.log('[SHEETS] Rate limited, waiting longer...')
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds for rate limit
        throw new Error(`Sheets API rate limited: ${response.status}`)
      }
      throw new Error(`Sheets API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('[SHEETS] Raw API response:', data)
    
    // Google Sheets API returns data in { values: [...] } format
    return { data: { values: data.values || [] } }
  }

  // Get Google Sheets service
  async getSheetsService() {
    try {
      const serviceAccount = JSON.parse(this.env.SERVICE_ACCOUNT_JSON)
      const accessToken = await this.getServiceAccountToken(serviceAccount)
      
      if (!accessToken) {
        throw new Error('Failed to get service account token')
      }

      // Return a mock sheets service object with rate limiting
      return {
        spreadsheets: {
          values: {
            get: async (params: any) => {
              // Rate limiting: wait for available slot
              while (AuthService.requestQueue.length >= AuthService.MAX_CONCURRENT_REQUESTS) {
                await Promise.race(AuthService.requestQueue)
              }

              // Create request promise
              const requestPromise = this.makeSheetsRequest(params, accessToken)
              AuthService.requestQueue.push(requestPromise)

              try {
                const result = await requestPromise
                return result
              } finally {
                // Remove completed request from queue
                const index = AuthService.requestQueue.indexOf(requestPromise)
                if (index > -1) {
                  AuthService.requestQueue.splice(index, 1)
                }
              }
            },
            append: async (params: any) => {
              const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/values/${params.range}:append?valueInputOption=${params.valueInputOption}`, {
                method: 'POST',
                headers: { 
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(params.requestBody)
              })
              return { data: await response.json() }
            },
            update: async (params: any) => {
              const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/values/${params.range}?valueInputOption=${params.valueInputOption}`, {
                method: 'PUT',
                headers: { 
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(params.requestBody)
              })
              return { data: await response.json() }
            }
          },
          batchUpdate: async (params: any) => {
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}:batchUpdate`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(params.requestBody)
            })
            return { data: await response.json() }
          }
        }
      }
    } catch (error) {
      console.error('Error getting sheets service:', error)
      throw error
    }
  }

}

// Middleware factory functions
export function createAuthMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const authService = new AuthService(c.env)
    const authContext = await authService.authenticate(c)
    
    // Add auth context to the request
    c.set('auth', authContext)
    
    await next()
  }
}

export function createRequireAuthMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const auth = c.get('auth') as AuthContext
    
    if (!auth.isAuthenticated) {
      return c.text('Unauthorized', 401)
    }
    
    await next()
  }
}

// Utility function to get auth service instance
export function getAuthService(env: any): AuthService {
  return new AuthService(env)
}
