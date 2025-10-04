import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { 
  AuthService, 
  createAuthMiddleware, 
  createRequireAuthMiddleware,
  getAuthService 
} from './services/auth.service'
import { getExpensesService } from './services/expenses.service'
import { getBudgetsService } from './services/budgets.service'
import { getAnalyticsService } from './services/analytics.service'

const app = new Hono()

// CORS middleware
app.use('*', cors({
  origin: ['https://expenfyre.web.app', 'http://localhost:3000'],
    credentials: true,
}))

// Initialize middleware
const authMiddleware = createAuthMiddleware()
const requireAuth = createRequireAuthMiddleware()

// ---- Auth Endpoints ----

// Start Google OAuth
app.get('/api/auth/google', (c) => {
  const base = c.env.API_BASE_URL || 'http://localhost:8787'
  const redirectUri = `${base}/api/auth/google/callback`
  
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })
  
  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  
  return c.redirect(oauthUrl)
})

// Google OAuth callback
app.get('/api/auth/google/callback', async (c) => {
  const code = c.req.query('code')
  const error = c.req.query('error')
  
  if (error) {
    return c.text(`OAuth error: ${error}`, 400)
  }
  
  if (!code) {
    return c.text('No authorization code', 400)
  }
  
  try {
    const authService = getAuthService(c.env)
    
    // Exchange code for token
    const base = c.env.API_BASE_URL || 'http://localhost:8787'
    const redirectUri = `${base}/api/auth/google/callback`
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      return c.text(`Token exchange failed: ${errorText}`, 401)
    }
    
    const tokenData = await tokenResponse.json()
    
    // Parse ID token using service
    const idToken = authService.parseGoogleIdToken(tokenData.id_token)
    if (!idToken?.email) {
      return c.text('No email in token', 401)
    }
    
    // Check if user has access (whitelist check)
    const accessCheck = await authService.checkUserAccess(idToken.email)
    if (!accessCheck.hasAccess) {
      console.log(`Access denied for user: ${idToken.email} - ${accessCheck.error}`)
      
      // Return access denied page
      const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:3000'
      return c.html(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Access Denied</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #dc2626; margin: 20px 0; }
              .message { color: #374151; margin: 20px 0; }
              .button { 
                background: #3b82f6; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 5px; display: inline-block;
              }
            </style>
          </head>
          <body>
            <h1>Access Denied</h1>
            <div class="error">You are not authorized to access this application.</div>
            <div class="message">Please contact your administrator to request access.</div>
            <a href="${frontendUrl}" class="button">Return to Home</a>
            <script>
              // Close popup if opened in popup
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'ACCESS_DENIED',
                  userInfo: {
                    email: '${idToken.email}',
                    name: '${idToken.name || idToken.email}',
                    picture: '${idToken.picture || ''}',
                    google_id: '${idToken.sub || ''}'
                  }
                }, '*');
                window.close();
              }
            </script>
          </body>
        </html>
      `)
    }
    
    // User has access - use data from sheet
    const userData = {
      id: accessCheck.user.user_id || idToken.sub || idToken.email,
      name: accessCheck.user.name || idToken.name || idToken.email,
      email: idToken.email,
      picture: idToken.picture,
      created_at: accessCheck.user.created_at || new Date().toISOString(),
      default_group_id: accessCheck.user.default_group_id
    }
    
    // Store user using service
    await authService.storeUser(userData)
    
    // Create JWT tokens using service
    const { accessToken, refreshToken } = await authService.createTokens(idToken.email)
    
    // Return a page that sends tokens to parent window and closes popup
    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:3000'
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Complete</title>
        </head>
        <body>
          <script>
            // Send tokens to parent window
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'AUTH_SUCCESS',
                tokens: {
                  access_token: '${accessToken}',
                  refresh_token: '${refreshToken}'
                },
                user: {
                  id: '${userData.id}',
                  name: '${userData.name}',
                  email: '${userData.email}',
                  picture: '${userData.picture}',
                  created_at: '${userData.created_at}',
                  default_group_id: '${userData.default_group_id || ''}'
                }
              }, '*');
            }
            
            // Close the popup
            window.close();
            
            // Fallback: redirect to frontend if popup doesn't close
            setTimeout(() => {
              window.location.href = '${frontendUrl}';
            }, 1000);
          </script>
          <p>Authentication successful! This window should close automatically.</p>
        </body>
      </html>
    `)
    
  } catch (error) {
    return c.text(`OAuth callback error: ${error}`, 500)
  }
})

// Get current user
app.get('/api/auth/me', authMiddleware, async (c) => {
  const auth = c.get('auth') as AuthContext
  
  if (!auth.isAuthenticated) {
    return c.text('Unauthorized', 401)
  }
  
  return c.json({
    success: true,
    user: auth.user
  })
})

// Token refresh endpoint
app.post('/api/auth/refresh', async (c) => {
  try {
    const authService = getAuthService(c.env)
    
    // Get refresh token from request
    const refreshToken = c.req.header('Authorization')?.replace('Bearer ', '') || 
                        c.req.query('refresh_token') ||
                        c.req.header('Cookie')?.split(';')
                          .find(cookie => cookie.trim().startsWith('refresh_token='))
                          ?.split('=')[1]

    if (!refreshToken) {
      return c.json({ success: false, error: 'Refresh token required' }, 400)
    }

    // Refresh tokens
    const newTokens = await authService.refreshTokens(refreshToken)
    
    if (!newTokens) {
      return c.json({ success: false, error: 'Invalid refresh token' }, 401)
    }

    // Set new cookies
    c.header('Set-Cookie', `access_token=${newTokens.accessToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=900`)
    c.header('Set-Cookie', `refresh_token=${newTokens.refreshToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`)

    return c.json({ 
      success: true, 
      access_token: newTokens.accessToken,
      refresh_token: newTokens.refreshToken
    })
    
  } catch (error) {
    console.error('[AUTH] Refresh failed:', error)
    return c.json({ success: false, error: 'Token refresh failed' }, 500)
  }
})

// Sign out
app.post('/api/auth/signout', authMiddleware, async (c) => {
  try {
    const auth = c.get('auth')
    
    // Clear user session if authenticated
    if (auth.isAuthenticated && auth.user) {
      const authService = getAuthService(c.env)
      await authService.revokeAllUserTokens(auth.user.email)
    }
    
    // Clear cookies
    c.header('Set-Cookie', 'access_token=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0')
    c.header('Set-Cookie', 'refresh_token=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0')
    
    return c.json({ success: true })
    
  } catch (error) {
    return c.text('Sign out failed', 500)
  }
})

// Clear rate limit (for development/testing)
app.post('/api/auth/clear-rate-limit', async (c) => {
  try {
    const body = await c.req.json()
    const { email } = body
    
    if (!email) {
      return c.json({ success: false, error: 'Email required' }, 400)
    }
    
    // Clear both create and refresh rate limits
    await c.env.EXPENSE_KV.delete(`rate_limit:create:${email}`)
    await c.env.EXPENSE_KV.delete(`rate_limit:refresh:${email}`)
    
    return c.json({ 
      success: true,
      message: `Rate limits cleared for ${email}`
    })
  } catch (error) {
    console.error('[AUTH] Clear rate limit failed:', error)
    return c.json({ success: false, error: 'Failed to clear rate limit' }, 500)
  }
})

// Cleanup endpoint (admin only - for maintenance)
app.post('/api/auth/cleanup', authMiddleware, async (c) => {
  try {
    const auth = c.get('auth')
    
    // Only allow cleanup for authenticated users (you might want to add admin check)
    if (!auth.isAuthenticated) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const authService = getAuthService(c.env)
    const result = await authService.cleanupExpiredTokens()
    
    return c.json({ 
      success: true, 
      cleaned: result.cleaned, 
      errors: result.errors 
    })
    
  } catch (error) {
    console.error('[AUTH] Cleanup failed:', error)
    return c.json({ success: false, error: 'Cleanup failed' }, 500)
  }
})

// Get cleanup statistics
app.get('/api/auth/cleanup/stats', authMiddleware, async (c) => {
  try {
    const auth = c.get('auth')
    
    if (!auth.isAuthenticated) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const authService = getAuthService(c.env)
    const stats = await authService.getCleanupStats()
    
    return c.json({ success: true, stats })
    
  } catch (error) {
    console.error('[AUTH] Stats failed:', error)
    return c.json({ success: false, error: 'Failed to get stats' }, 500)
  }
})

// ---- Group Management Endpoints ----

// Get user's groups
app.get('/api/groups', authMiddleware, requireAuth, async (c) => {
  try {
    const auth = c.get('auth')
    const { GroupsService } = await import('./services/groups.service')
    const groupsService = new GroupsService(c.env)
    
    const groups = await groupsService.getUserGroups(auth.user.email)
    
    return c.json({
      success: true,
      data: groups
    })
  } catch (error) {
    console.error('[GROUPS] Error getting user groups:', error)
    return c.json({ success: false, error: 'Failed to get groups' }, 500)
  }
})

// Create a new group
app.post('/api/groups', authMiddleware, requireAuth, async (c) => {
  try {
    const auth = c.get('auth')
    const { GroupsService } = await import('./services/groups.service')
    const groupsService = new GroupsService(c.env)
    
    const body = await c.req.json()
    const { name, description } = body
    
    if (!name) {
      return c.json({ success: false, error: 'Group name is required' }, 400)
    }
    
    const group = await groupsService.createGroup(auth.user.email, {
      name,
      description: description || ''
    })
    
    return c.json({
      success: true,
      data: group
    })
  } catch (error) {
    console.error('[GROUPS] Error creating group:', error)
    return c.json({ success: false, error: 'Failed to create group' }, 500)
  }
})

// Get group members
app.get('/api/groups/:groupId/members', authMiddleware, requireAuth, async (c) => {
  try {
    const auth = c.get('auth')
    const groupId = c.req.param('groupId')
    const { GroupsService } = await import('./services/groups.service')
    const groupsService = new GroupsService(c.env)
    
    const members = await groupsService.getGroupMembers(groupId, auth.user.email)
    
    return c.json({
      success: true,
      data: members
    })
  } catch (error) {
    console.error('[GROUPS] Error getting group members:', error)
    return c.json({ success: false, error: 'Failed to get group members' }, 500)
  }
})

// Add member to group
app.post('/api/groups/:groupId/members', authMiddleware, requireAuth, async (c) => {
  try {
    const auth = c.get('auth')
    const groupId = c.req.param('groupId')
    const { GroupsService } = await import('./services/groups.service')
    const groupsService = new GroupsService(c.env)
    
    const body = await c.req.json()
    const { user_email, role = 'member' } = body
    
    if (!user_email) {
      return c.json({ success: false, error: 'User email is required' }, 400)
    }
    
    const member = await groupsService.addGroupMember(auth.user.email, groupId, user_email, role)
    
    return c.json({
      success: true,
      data: member
    })
  } catch (error) {
    console.error('[GROUPS] Error adding group member:', error)
    return c.json({ success: false, error: 'Failed to add group member' }, 500)
  }
})

// Remove member from group
app.delete('/api/groups/:groupId/members/:userEmail', authMiddleware, requireAuth, async (c) => {
  try {
    const auth = c.get('auth')
    const groupId = c.req.param('groupId')
    const userEmail = c.req.param('userEmail')
    const { GroupsService } = await import('./services/groups.service')
    const groupsService = new GroupsService(c.env)
    
    await groupsService.removeGroupMember(auth.user.email, groupId, userEmail)
    
    return c.json({
      success: true,
      message: 'Member removed successfully'
    })
  } catch (error) {
    console.error('[GROUPS] Error removing group member:', error)
    return c.json({ success: false, error: 'Failed to remove group member' }, 500)
  }
})

// Update group
app.patch('/api/groups/:groupId', authMiddleware, requireAuth, async (c) => {
  try {
    const auth = c.get('auth')
    const groupId = c.req.param('groupId')
    const { GroupsService } = await import('./services/groups.service')
    const groupsService = new GroupsService(c.env)
    
    const body = await c.req.json()
    const { name, description } = body
    
    const group = await groupsService.updateGroup(auth.user.email, groupId, {
      name,
      description
    })
    
    return c.json({
      success: true,
      data: group
    })
  } catch (error) {
    console.error('[GROUPS] Error updating group:', error)
    return c.json({ success: false, error: 'Failed to update group' }, 500)
  }
})

// Delete group
app.delete('/api/groups/:groupId', authMiddleware, requireAuth, async (c) => {
  try {
    const auth = c.get('auth')
    const groupId = c.req.param('groupId')
    const { GroupsService } = await import('./services/groups.service')
    const groupsService = new GroupsService(c.env)
    
    await groupsService.deleteGroup(auth.user.email, groupId)
    
    return c.json({
      success: true,
      message: 'Group deleted successfully'
    })
  } catch (error) {
    console.error('[GROUPS] Error deleting group:', error)
    return c.json({ success: false, error: 'Failed to delete group' }, 500)
  }
})

// ---- Microservices Endpoints ----
// Each endpoint uses its dedicated service - completely independent!

// Protected user profile endpoint
app.get('/api/user/profile', authMiddleware, requireAuth, async (c) => {
  const auth = c.get('auth')
  return c.json({ 
    message: 'User profile - using Auth Service',
    user: auth.user,
    timestamp: new Date().toISOString()
  })
})

    // Expenses Service endpoints
    app.get('/api/expenses', authMiddleware, requireAuth, async (c) => {
      const auth = c.get('auth')
      const expensesService = getExpensesService(c.env)
      
      // Get query parameters for filtering
      const category_id = c.req.query('category_id')
      const budget_id = c.req.query('budget_id')
      const month = c.req.query('month')
      const date_from = c.req.query('date_from')
      const date_to = c.req.query('date_to')
      const tags = c.req.query('tags')
      const min_amount = c.req.query('min_amount') ? parseFloat(c.req.query('min_amount')!) : undefined
      const max_amount = c.req.query('max_amount') ? parseFloat(c.req.query('max_amount')!) : undefined
      const status = c.req.query('status') || 'active' // Default to active if not specified
      const page = c.req.query('page') ? parseInt(c.req.query('page')!) : 1
      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20
      
      const filters = {
        category_id,
        budget_id,
        month,
        date_from,
        date_to,
        tags,
        min_amount,
        max_amount,
        status,
        page,
        limit
      }
      
      const result = await expensesService.getExpenses(auth.user.email, filters)
      
      return c.json({ 
        success: true,
        data: result.expenses,
        pagination: {
          page: result.page,
          totalPages: result.totalPages,
          total: result.total,
          limit: limit
        }
      })
    })

    app.post('/api/expenses', authMiddleware, requireAuth, async (c) => {
      try {
      const auth = c.get('auth')
      const expensesService = getExpensesService(c.env)
      const expenseData = await c.req.json()
      
      const expense = await expensesService.createExpense(auth.user.email, expenseData)
      
      return c.json({ 
        success: true,
        data: expense,
        message: 'Expense created successfully'
      })
      } catch (error) {
        console.error('[EXPENSES] Error creating expense:', error)
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to create expense' }, 500)
      }
    })

    app.put('/api/expenses/:id', authMiddleware, requireAuth, async (c) => {
      const auth = c.get('auth')
      const expensesService = getExpensesService(c.env)
      const expenseId = c.req.param('id')
      const updates = await c.req.json()
      
      const expense = await expensesService.updateExpense(auth.user.email, expenseId, updates)
      
      if (!expense) {
        return c.json({ success: false, error: 'Expense not found' }, 404)
      }
      
      return c.json({ 
        success: true,
        data: expense,
        message: 'Expense updated successfully'
      })
    })

    app.patch('/api/expenses/:id', authMiddleware, requireAuth, async (c) => {
      const auth = c.get('auth')
      const expensesService = getExpensesService(c.env)
      const expenseId = c.req.param('id')
      const updates = await c.req.json()
      
      const expense = await expensesService.updateExpense(auth.user.email, expenseId, updates)
      
      if (!expense) {
        return c.json({ success: false, error: 'Expense not found' }, 404)
      }
      
      return c.json({ 
        success: true,
        data: expense,
        message: 'Expense updated successfully'
      })
    })

    app.delete('/api/expenses/:id', authMiddleware, requireAuth, async (c) => {
      try {
        console.log('[API] DELETE /api/expenses/:id called')
        const auth = c.get('auth')
        const expensesService = getExpensesService(c.env)
        const expenseId = c.req.param('id')
        
        console.log('[API] Delete request for expense:', expenseId, 'by user:', auth.user.email)
        
        const deleted = await expensesService.deleteExpense(auth.user.email, expenseId)
        
        console.log('[API] Delete result:', deleted)
        
        if (!deleted) {
          console.log('[API] Expense not found for deletion')
          return c.json({ success: false, error: 'Expense not found' }, 404)
        }
        
        console.log('[API] Expense successfully deleted')
        return c.json({ 
          success: true,
          message: 'Expense deleted successfully'
        })
      } catch (error) {
        console.error('[API] Error in delete expense endpoint:', error)
        return c.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to delete expense' 
        }, 500)
      }
    })

    // File upload endpoint
    app.post('/api/upload', authMiddleware, requireAuth, async (c) => {
      try {
        console.log('[UPLOAD] Starting file upload process')
        const auth = c.get('auth')
        console.log('[UPLOAD] User:', auth.user.email)
        
        const formData = await c.req.formData()
        const file = formData.get('file') as File
        
        if (!file) {
          console.log('[UPLOAD] No file provided')
          return c.json({ success: false, error: 'No file provided' }, 400)
        }

        console.log('[UPLOAD] File details:', {
          name: file.name,
          type: file.type,
          size: file.size
        })

        // Validate file type
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          console.log('[UPLOAD] Invalid file type:', file.type)
          return c.json({ success: false, error: 'Invalid file type. Only images and PDFs are allowed.' }, 400)
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          console.log('[UPLOAD] File too large:', file.size)
          return c.json({ success: false, error: 'File size must be less than 10MB' }, 400)
        }

        console.log('[UPLOAD] Starting upload to storage')
        const expensesService = getExpensesService(c.env)
        const fileUrl = await expensesService.uploadFile(auth.user.email, file)
        
        console.log('[UPLOAD] Upload successful, URL:', fileUrl)
        return c.json({
          success: true,
          data: { url: fileUrl },
          message: 'File uploaded successfully'
        })
      } catch (error) {
        console.error('[UPLOAD] File upload error:', error)
        return c.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to upload file' 
        }, 500)
      }
    })

    // File serving endpoint
    app.get('/api/file/:filename', async (c) => {
      try {
        const filename = c.req.param('filename')
        console.log('[FILE] Serving file:', filename)
        
        const kvKey = `file:${filename}`
        const dataUrl = await c.env.EXPENSE_KV.get(kvKey)
        
        if (!dataUrl) {
          console.log('[FILE] File not found:', filename)
          return c.text('File not found', 404)
        }
        
        // Parse data URL
        const [header, data] = dataUrl.split(',')
        const mimeType = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream'
        
        console.log('[FILE] File found, MIME type:', mimeType)
        
        // Convert base64 back to buffer
        const buffer = Buffer.from(data, 'base64')
        
        return new Response(buffer, {
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000',
            'Content-Length': buffer.length.toString()
          }
        })
      } catch (error) {
        console.error('[FILE] Error serving file:', error)
        return c.text('Internal server error', 500)
      }
    })

    // Categories endpoint
    app.get('/api/categories', authMiddleware, requireAuth, async (c) => {
      const expensesService = getExpensesService(c.env)
      const categories = await expensesService.getCategories()
      
      return c.json({ 
        success: true,
        data: categories
      })
    })

    // Budgets Service endpoints
    app.get('/api/budgets', authMiddleware, requireAuth, async (c) => {
      const auth = c.get('auth')
      const budgetsService = getBudgetsService(c.env)
      
      // Get query parameters for filtering
      const category_id = c.req.query('category_id')
      const month = c.req.query('month')
      
      const filters = {
        ...(category_id && { category_id }),
        ...(month && { month })
      }
      
      const result = await budgetsService.getBudgets(auth.user.email, filters)
      
      return c.json({ 
        success: true,
        data: result.budgets,
        pagination: {
          page: result.page,
          totalPages: result.totalPages,
          total: result.total,
          limit: 1000 // For now, return all budgets
        }
  })
})

app.post('/api/budgets', authMiddleware, requireAuth, async (c) => {
      try {
  const auth = c.get('auth')
  const budgetsService = getBudgetsService(c.env)
  const budgetData = await c.req.json()
  
  const budget = await budgetsService.createBudget(auth.user.email, budgetData)
  
  return c.json({ 
          success: true,
          data: budget,
          message: 'Budget created successfully'
        })
      } catch (error) {
        console.error('[BUDGETS] Error creating budget:', error)
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to create budget' }, 500)
      }
    })

    app.patch('/api/budgets/:id', authMiddleware, requireAuth, async (c) => {
      const auth = c.get('auth')
      const budgetsService = getBudgetsService(c.env)
      const budgetId = c.req.param('id')
      const updates = await c.req.json()
      
      const budget = await budgetsService.updateBudget(auth.user.email, budgetId, updates)
      
      return c.json({
        success: true,
        data: budget,
        message: 'Budget updated successfully'
      })
    })

    app.delete('/api/budgets/:id', authMiddleware, requireAuth, async (c) => {
      const auth = c.get('auth')
      const budgetsService = getBudgetsService(c.env)
      const budgetId = c.req.param('id')
      
      await budgetsService.deleteBudget(auth.user.email, budgetId)
      
      return c.json({
        success: true,
        message: 'Budget deleted successfully'
      })
    })

    app.get('/api/budgets/analytics', authMiddleware, requireAuth, async (c) => {
      const auth = c.get('auth')
      const budgetsService = getBudgetsService(c.env)
      const month = c.req.query('month')
      
      const analytics = await budgetsService.getBudgetAnalytics(auth.user.email, month || undefined)
      
      return c.json({
        success: true,
        data: analytics
      })
    })

    // Budgets endpoint for expenses (legacy)
    app.get('/api/expenses/budgets', authMiddleware, requireAuth, async (c) => {
      const auth = c.get('auth')
      const budgetsService = getBudgetsService(c.env)
      const budgets = await budgetsService.getBudgets(auth.user.email)
      
      return c.json({ 
        success: true,
        data: budgets.budgets
      })
    })

// ---- Analytics Endpoints ----

// Get analytics summary
app.get('/api/analytics/summary', authMiddleware, requireAuth, async (c) => {
  try {
    const auth = c.get('auth')
    const analyticsService = getAnalyticsService(c.env)
    
    const filters = {
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      category_id: c.req.query('category_id'),
      month: c.req.query('month')
    }
    
    const summary = await analyticsService.getSummary(auth.user.email, filters)
    
    return c.json({
      success: true,
      data: summary
    })
  } catch (error) {
    console.error('[ANALYTICS] Error getting summary:', error)
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get summary' }, 500)
  }
})

// Get category breakdown
app.get('/api/analytics/category-breakdown', authMiddleware, requireAuth, async (c) => {
  try {
    const auth = c.get('auth')
    const analyticsService = getAnalyticsService(c.env)
    
    const filters = {
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      month: c.req.query('month')
    }
    
    const breakdown = await analyticsService.getCategoryBreakdown(auth.user.email, filters)
    
    return c.json({
      success: true,
      data: breakdown
    })
  } catch (error) {
    console.error('[ANALYTICS] Error getting category breakdown:', error)
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get category breakdown' }, 500)
  }
})

// Get monthly comparison
app.get('/api/analytics/monthly-comparison', authMiddleware, requireAuth, async (c) => {
  try {
    const auth = c.get('auth')
    const analyticsService = getAnalyticsService(c.env)
    
    const months = parseInt(c.req.query('months') || '6')
    const comparison = await analyticsService.getMonthlyComparison(auth.user.email, months)
    
    return c.json({
      success: true,
      data: comparison
    })
  } catch (error) {
    console.error('[ANALYTICS] Error getting monthly comparison:', error)
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get monthly comparison' }, 500)
  }
})

// Get budget performance
app.get('/api/analytics/budget-performance', authMiddleware, requireAuth, async (c) => {
  try {
    const auth = c.get('auth')
    const analyticsService = getAnalyticsService(c.env)
    
    const month = c.req.query('month')
    const performance = await analyticsService.getBudgetPerformance(auth.user.email, month)
    
    return c.json({
      success: true,
      data: performance
    })
  } catch (error) {
    console.error('[ANALYTICS] Error getting budget performance:', error)
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get budget performance' }, 500)
  }
})

// Get top expenses
app.get('/api/analytics/top-expenses', authMiddleware, requireAuth, async (c) => {
  try {
    const auth = c.get('auth')
    const analyticsService = getAnalyticsService(c.env)
    
    const limit = parseInt(c.req.query('limit') || '10')
    const filters = {
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      category_id: c.req.query('category_id')
    }
    
    const topExpenses = await analyticsService.getTopExpenses(auth.user.email, limit, filters)
    
    return c.json({
      success: true,
      data: topExpenses
    })
  } catch (error) {
    console.error('[ANALYTICS] Error getting top expenses:', error)
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get top expenses' }, 500)
  }
})

// Get daily spending trend
app.get('/api/analytics/daily-trend', authMiddleware, requireAuth, async (c) => {
  try {
  const auth = c.get('auth')
  const analyticsService = getAnalyticsService(c.env)
    
    const filters = {
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date')
    }
    
    const trend = await analyticsService.getDailyTrend(auth.user.email, filters)
  
  return c.json({ 
      success: true,
      data: trend
  })
  } catch (error) {
    console.error('[ANALYTICS] Error getting daily trend:', error)
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get daily trend' }, 500)
  }
})

// Get budget utilization over time
app.get('/api/analytics/budget-utilization', authMiddleware, requireAuth, async (c) => {
  try {
  const auth = c.get('auth')
  const analyticsService = getAnalyticsService(c.env)
    
    const months = parseInt(c.req.query('months') || '6')
    const utilization = await analyticsService.getBudgetUtilization(auth.user.email, months)
  
  return c.json({ 
      success: true,
      data: utilization
  })
  } catch (error) {
    console.error('[ANALYTICS] Error getting budget utilization:', error)
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get budget utilization' }, 500)
  }
})

    // Access request endpoint (no auth required)
    app.post('/api/access-request', async (c) => {
      try {
        const { email, name, picture, google_id } = await c.req.json()
        
        if (!email || !name || !google_id) {
          return c.json({ success: false, error: 'Missing required fields' }, 400)
        }
        
        const authService = getAuthService(c.env)
        const result = await authService.submitAccessRequest({
          email,
          name,
          picture,
          google_id
        })
        
        if (result.success) {
          return c.json({ 
            success: true, 
            message: 'Access request submitted successfully. You will be notified when your request is reviewed.' 
          })
        } else {
          return c.json({ success: false, error: result.error }, 500)
        }
        
      } catch (error) {
        console.error('Access request error:', error)
        return c.json({ success: false, error: 'Failed to submit access request' }, 500)
      }
    })

    // Public health check (no auth required)
    app.get('/api/health', (c) => {
      return c.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

export default app