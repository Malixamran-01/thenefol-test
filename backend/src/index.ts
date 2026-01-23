// Optimized main server file with centralized routes and utilities
import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import { Pool } from 'pg'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { ensureSchema } from './utils/schema'
import { authenticateToken, requireRole, requirePermission, sendError, sendSuccess } from './utils/apiHelpers'
import { createUserActivityTables } from './utils/userActivitySchema'
import * as productRoutes from './routes/products'
import * as variantRoutes from './routes/variants'
import * as inventoryRoutes from './routes/inventory'
import * as shiprocketRoutes from './routes/shiprocket'
import * as amazonRoutes from './routes/amazon'
import * as flipkartRoutes from './routes/flipkart'
import * as facebookRoutes from './routes/facebook'
import * as metaAdsRoutes from './routes/metaAds'
import * as bulkRoutes from './routes/bulk'
import * as staffRoutes from './routes/staff'
import * as warehouseRoutes from './routes/warehouses'
import * as returnRoutes from './routes/returns'
import * as supplierRoutes from './routes/suppliers'
import * as posRoutes from './routes/pos'
import * as cartRoutes from './routes/cart'
import createCMSRouter from './routes/cms'
import blogRouter, { initBlogRouter } from './routes/blog'
import * as affiliateRoutes from './routes/affiliate'
import * as searchRoutes from './routes/search'
import * as marketingRoutes from './routes/marketing'
import * as whatsappWebhookRoutes from './routes/whatsappWebhook'
import * as paymentRoutes from './routes/payment'
import * as otpRoutes from './routes/otp'
import * as notificationRoutes from './routes/notifications'
import * as userRoutes from './routes/users'
import * as authRoutes from './routes/auth'
import * as cancellationRoutes from './routes/cancellations'
import { seedCMSContent } from './utils/seedCMS'
import { updateAllProductsWithPricing } from './utils/updateAllProducts'
import cron from 'node-cron'
import { registerExtendedRoutes } from './routes/extended'
import { registerDashboardAnalyticsRoutes } from './routes/dashboardAnalytics'
import { registerCommunicationsRoutes } from './routes/communications'
import { registerIntegrationsRoutes } from './routes/integrations'
import { registerLiveChatRoutes } from './routes/liveChat'
import * as recommendationRoutes from './routes/recommendations'
import * as subscriptionRoutes from './routes/subscriptions'
import * as productCollectionRoutes from './routes/productCollections'
import { createAPIManagerRouter } from './routes/apiManager'
import { processScheduledWhatsAppMessages } from './utils/whatsappScheduler'
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail, sendOrderShippedEmail, sendOrderDeliveredEmail, sendInvoicePDFEmail } from './services/emailService'
import { startCartAbandonmentCron } from './cron/cartAbandonment'
import { startCartEmailSchedulerCron } from './cron/cartEmailScheduler'
import rateLimit from 'express-rate-limit'

// Extend Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: string
      userPermissions?: string[]
      io?: any
      staffId?: number
      staffSessionId?: number
      staffSessionToken?: string
      staffContext?: any
    }
  }
}

const app = express()

// Trust proxy for accurate IP detection behind reverse proxy (Nginx)
// Required for express-rate-limit to work correctly with X-Forwarded-For header
app.set('trust proxy', 1)

// Register GET webhook route early (doesn't need pool, and must be before express.json())
// This handles Meta's webhook verification
app.get('/api/whatsapp/webhook', whatsappWebhookRoutes.verifyWebhook)

// Apply JSON parsing for all routes EXCEPT the WhatsApp webhook POST route
// The webhook needs raw body for signature verification
app.use((req, res, next) => {
  // Skip JSON parsing for WhatsApp webhook POST route (needs raw body for signature verification)
  if (req.path === '/api/whatsapp/webhook' && req.method === 'POST') {
    return next()
  }
  // Apply JSON parsing for all other routes
  express.json()(req, res, next)
})

// Serve uploaded files with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
}, express.static('uploads'))

// Serve panel images with CORS headers from multiple possible locations
// Priority: explicit env override -> built dist assets -> public fallbacks
const imageSourceCandidates = [
  process.env.IMAGES_PATH,
  path.join(__dirname, '../../user-panel/dist/IMAGES'),
  path.join(__dirname, '../../admin-panel/dist/IMAGES'),
  path.join(__dirname, '../../user-panel/public/IMAGES'),
  path.join(__dirname, '../../admin-panel/public/IMAGES')
].filter((candidate): candidate is string => Boolean(candidate && candidate.trim()))

const imageSources = imageSourceCandidates.filter((candidate, idx, arr) => {
  const resolved = path.resolve(candidate)
  const exists = fs.existsSync(resolved)
  if (!exists) {
    return false
  }
  // Deduplicate identical resolved paths
  return arr.findIndex((original) => path.resolve(original || '') === resolved) === idx
})

const imageCorsMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
}

app.use('/IMAGES', imageCorsMiddleware)

if (imageSources.length === 0) {
  const fallback = path.join(__dirname, '../../user-panel/dist/IMAGES')
  console.warn('[IMAGES] No image directories found. Requests will 404 unless assets exist at', fallback)
  app.use('/IMAGES', express.static(fallback))
} else {
  imageSources.forEach((source) => {
    const resolved = path.resolve(source)
    console.log('[IMAGES] Serving static assets from:', resolved)
    app.use('/IMAGES', express.static(resolved))
  })
}

// Always default to production - no localhost fallbacks
const clientOrigin = process.env.CLIENT_ORIGIN || 'https://thenefol.com'
app.use(cors({ origin: true, credentials: true }))

// Basic in-memory rate limiting (IP-based)
// Default: 100,000 requests per minute. Set env to override, e.g. RATE_LIMIT_MAX_REQUESTS=1000
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000) // 1 minute default
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100000) // Very high default to avoid 429 errors
const ipToHits: Map<string, { count: number; resetAt: number }> = new Map()

// Cleanup expired rate limit entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of ipToHits.entries()) {
    if (now > entry.resetAt) {
      ipToHits.delete(ip)
    }
  }
}, 5 * 60 * 1000)

// Exclude static files and socket.io from rate limiting
app.use((req, res, next) => {
  // If disabled, skip rate limiting entirely
  if (!Number.isFinite(RATE_LIMIT_MAX_REQUESTS) || RATE_LIMIT_MAX_REQUESTS <= 0) {
    return next()
  }
  // Skip rate limiting for static files, socket.io, and uploads
  if (
    req.path.startsWith('/uploads/') ||
    req.path.startsWith('/IMAGES/') ||
    req.path.startsWith('/socket.io/') ||
    req.path.match(/\.(css|js|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot)$/i)
  ) {
    return next()
  }

  try {
    // Try multiple methods to get the client IP
    const forwardedFor = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    const ip = forwardedFor || (req as any).ip || req.socket.remoteAddress || req.connection?.remoteAddress || 'unknown'
    const now = Date.now()
    const entry = ipToHits.get(ip)
    if (!entry || now > entry.resetAt) {
      ipToHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
      return next()
    }
    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000))
      return res.status(429).json({ error: 'Too many requests. Please try again later.' })
    }
    entry.count += 1
    return next()
  } catch {
    return next()
  }
})

// Basic admin audit log middleware (logs method, path, userId if present)
app.use(async (req, _res, next) => {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id SERIAL PRIMARY KEY,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        user_id TEXT,
        ip TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    )
    // Only log admin and API routes to reduce noise
    if (req.path.startsWith('/api/')) {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null
      await pool.query(
        `INSERT INTO admin_audit_logs (method, path, user_id, ip) VALUES ($1, $2, $3, $4)`,
        [req.method, req.path, req.userId || null, ip]
      )
    }
  } catch (e) {
    console.error('Audit log error:', e)
  } finally {
    next()
  }
})

// RBAC context attach middleware creator
async function attachRBACContext(req: express.Request) {
  try {
    if (!req.userId) return
    // Fetch roles and permissions for staff user
    const rolesRes = await pool.query(
      `select r.name as role_name, r.id as role_id
       from staff_users su
       left join staff_roles sr on sr.staff_id = su.id
       left join roles r on r.id = sr.role_id
       where su.id = $1`,
      [req.userId]
    )
    const roleNames = rolesRes.rows.map((r: any) => r.role_name).filter(Boolean)
    const roleIds = rolesRes.rows.map((r: any) => r.role_id).filter(Boolean)
    let perms: string[] = []
    if (roleIds.length > 0) {
      const permsRes = await pool.query(
        `select distinct p.code as code
         from role_permissions rp
         join permissions p on p.id = rp.permission_id
         where rp.role_id = any($1::int[])`,
        [roleIds]
      )
      perms = permsRes.rows.map((p: any) => p.code)
    }
    ;(req as any).userRole = roleNames.includes('admin') ? 'admin' : (roleNames[0] || undefined)
    ;(req as any).userPermissions = perms
  } catch (e) {
    console.error('RBAC attach failed:', e)
  }
}

// Combined authenticate + RBAC attach middleware
const authenticateAndAttach = (req: express.Request, res: express.Response, next: Function) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '').trim()

  if (token && token.startsWith('staff_')) {
    staffRoutes.getStaffContextByToken(pool, token)
      .then((context) => {
        if (!context) {
          return sendError(res, 401, 'Invalid admin session')
        }
        ;(req as any).staffId = context.staffId
        ;(req as any).staffSessionId = context.sessionId
        ;(req as any).staffSessionToken = context.token
        ;(req as any).userRole = context.primaryRole
        ;(req as any).userPermissions = context.permissions
        ;(req as any).staffContext = context
        next()
      })
      .catch((err) => {
        console.error('Staff session validation failed:', err)
        sendError(res, 401, 'Invalid admin session')
      })
    return
  }

  authenticateToken(req, res, async () => {
    await attachRBACContext(req)
    next()
  })
}

// Create HTTP server and Socket.IO
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling']
})

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol'

// Check if this is a Supabase connection (requires SSL)
const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com')
const poolConfig = isSupabase 
  ? { 
      connectionString,
      ssl: { rejectUnauthorized: false } // Supabase requires SSL
    }
  : { connectionString }

const pool = new Pool(poolConfig)
const staffAuthMiddleware = staffRoutes.createStaffAuthMiddleware(pool)

// Register POST webhook route after pool is defined (must use raw body, not express.json())
// This route must be registered before other routes to ensure raw body middleware is used
app.post('/api/whatsapp/webhook', 
  express.raw({ 
    type: 'application/json',
    limit: '10mb' // Allow larger payloads if needed
  }), 
  whatsappWebhookRoutes.handleWebhook.bind(null, pool)
)

// Middleware to allow staff with permissions OR regular authenticated users to create orders
function allowOrderCreation(req: express.Request, res: express.Response, next: Function) {
  // First check if admin/staff user via headers (admin panel sends these)
  const role = req.headers['x-user-role'] as string
  const permissionsHeader = req.headers['x-user-permissions'] as string
  const userPerms = permissionsHeader ? permissionsHeader.split(',').map(s => s.trim()).filter(Boolean) : []
  
  // If admin/staff user with permissions, check directly
  if (role && userPerms.length > 0) {
    if (userPerms.includes('orders:create')) {
      // Admin/staff with permission - allow
      return next()
    }
  }
  
  // Otherwise, try regular authentication (skip if no auth token to avoid 401)
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return sendError(res, 401, 'No token provided')
  }
  
  authenticateToken(req, res, async () => {
    await attachRBACContext(req)
    
    // Check if user is staff with orders:create permission
    const attached = (req as any).userPermissions as string[] | undefined
    const attachedPerms = attached && Array.isArray(attached)
      ? attached
      : []
    
    const hasPermission = attachedPerms.includes('orders:create') || userPerms.includes('orders:create')
    
    if (hasPermission) {
      // Staff user with permission - allow
      return next()
    }
    
    // Check if user is a regular user from users table
    if (req.userId) {
      try {
        const userResult = await pool.query(
          'SELECT id, email FROM users WHERE id = $1',
          [req.userId]
        )
        
        if (userResult.rows.length > 0) {
          // Regular user - allow them to create orders (for themselves)
          return next()
        }
      } catch (e) {
        console.error('Error checking regular user:', e)
      }
    }
    
    // Neither staff with permission nor regular user - deny
    return sendError(res, 403, 'Forbidden')
  })
}

// Middleware to allow staff with permissions OR regular authenticated users to view their own orders
function allowOrderView(req: express.Request, res: express.Response, next: Function) {
  // First check if admin/staff user via headers (admin panel sends these)
  const role = req.headers['x-user-role'] as string
  const permissionsHeader = req.headers['x-user-permissions'] as string
  const userPerms = permissionsHeader ? permissionsHeader.split(',').map(s => s.trim()).filter(Boolean) : []
  
  // If admin/staff user with permissions, check directly
  if (role && userPerms.length > 0) {
    if (userPerms.includes('orders:read')) {
      // Admin/staff with permission - allow viewing any order
      return next()
    }
  }
  
  // Otherwise, try regular authentication (skip if no auth token to avoid 401)
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return sendError(res, 401, 'No token provided')
  }
  
  authenticateToken(req, res, async () => {
    await attachRBACContext(req)
    
    // Check if user is staff with orders:read permission
    const attached = (req as any).userPermissions as string[] | undefined
    const attachedPerms = attached && Array.isArray(attached)
      ? attached
      : []
    
    const hasPermission = attachedPerms.includes('orders:read') || userPerms.includes('orders:read')
    
    if (hasPermission) {
      // Staff user with permission - allow viewing any order
      return next()
    }
    
    // Check if user is a regular user viewing their own order
    if (req.userId) {
      try {
        // Get user's email
        const userResult = await pool.query(
          'SELECT id, email FROM users WHERE id = $1',
          [req.userId]
        )
        
        if (userResult.rows.length > 0) {
          const userEmail = userResult.rows[0].email
          const { orderNumber } = req.params
          
          // Check if the order belongs to this user
          let orderResult = await pool.query(
            'SELECT customer_email FROM orders WHERE order_number = $1',
            [orderNumber]
          )
          
          // Also check by ID if orderNumber is numeric
          if (orderResult.rows.length === 0 && /^\d+$/.test(orderNumber)) {
            orderResult = await pool.query(
              'SELECT customer_email FROM orders WHERE id = $1',
              [orderNumber]
            )
          }
          
          if (orderResult.rows.length > 0 && orderResult.rows[0].customer_email === userEmail) {
            // Regular user viewing their own order - allow
            return next()
          }
        }
      } catch (e) {
        console.error('Error checking order ownership:', e)
      }
    }
    
    // Neither staff with permission nor regular user viewing own order - deny
    return sendError(res, 403, 'Forbidden')
  })
}

// Create a simple db object for compatibility
const db = {
  query: async (text: string, params?: any[]) => {
    try {
      const result = await pool.query(text, params)
      return result
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    }
  }
}

// File upload configuration with preserved extensions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadDir = path.resolve(process.cwd(), 'uploads')
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
        console.log('Created uploads directory:', uploadDir)
      }
      cb(null, uploadDir)
    } catch (error) {
      console.error('Error setting upload destination:', error)
      cb(error as Error, '')
    }
  },
  filename: (req, file, cb) => {
    try {
      // Preserve original filename with extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const ext = path.extname(file.originalname)
      const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_')
      cb(null, `${name}-${uniqueSuffix}${ext}`)
    } catch (error) {
      console.error('Error generating filename:', error)
      cb(error as Error, '')
    }
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for videos (unlimited videos supported)
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'
    ]
    if (allowedMimes.includes(file.mimetype) || 
        /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|ogg|mov|avi)(\?|$)/i.test(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'))
    }
  }
})

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true })
    console.log('Created uploads directory on startup:', uploadsDir)
  } catch (error) {
    console.error('Failed to create uploads directory:', error)
  }
} else {
  console.log('Uploads directory exists:', uploadsDir)
}

// Helper function to broadcast updates to admin
function broadcastUpdate(type: string, data: any) {
  io.to('admin-panel').emit('update', { type, data })
}

// Helper function to broadcast updates to all users
function broadcastToUsers(event: string, data: any) {
  io.to('all-users').emit(event, data)
}

// Helper function to broadcast to specific user
function broadcastToUser(userId: string, event: string, data: any) {
  io.to(`user-${userId}`).emit(event, data)
}

// Track active sessions
const activeSessions = new Map<string, { userId?: string, connectedAt: number, lastActivity: number }>()

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id, 'from:', socket.handshake.address)
  
  // Track this session
  activeSessions.set(socket.id, {
    connectedAt: Date.now(),
    lastActivity: Date.now()
  })
  
  // Broadcast live users count to admin
  io.to('admin-panel').emit('update', { 
    type: 'live-users-count', 
    data: { count: activeSessions.size } 
  })
  
  // Admin joins admin room
  socket.on('join-admin', () => {
    socket.join('admin-panel')
    console.log('👨‍💼 Admin panel joined:', socket.id)
    
    // Send current live users count
    socket.emit('update', { 
      type: 'live-users-count', 
      data: { count: activeSessions.size } 
    })
  })
  
  // User joins user room
  socket.on('join-user', (data: any) => {
    const { userId } = data || {}
    
    // Join general users room
    socket.join('all-users')
    
    // Join user-specific room if userId provided
    if (userId) {
      socket.join(`user-${userId}`)
      const session = activeSessions.get(socket.id)
      if (session) {
        session.userId = userId
      }
      console.log('👤 User joined:', socket.id, 'userId:', userId)
    }
    
    // Broadcast updated count to admin
    io.to('admin-panel').emit('update', { 
      type: 'live-users-count', 
      data: { count: activeSessions.size } 
    })
  })
  
  // User joins general users room
  socket.on('join-users-room', () => {
    socket.join('all-users')
    console.log('👥 User joined all-users room:', socket.id)
  })

  // Live chat: join a specific session room so both panels receive realtime events
  socket.on('live-chat:join-session', (data: any) => {
    const { sessionId } = data || {}
    if (!sessionId) return
    const room = `live-chat-session-${sessionId}`
    socket.join(room)
    console.log('💬 Joined live chat session room:', room, 'socket:', socket.id)
  })
  
  // Page view tracking
  socket.on('page-view', (data: any) => {
    console.log('📄 Page view:', data.page, 'by:', socket.id)
    
    // Update last activity
    const session = activeSessions.get(socket.id)
    if (session) {
      session.lastActivity = Date.now()
    }
    
    // Save to database
    pool.query(`
      INSERT INTO page_views (user_id, session_id, page, user_agent, referrer)
      VALUES ($1, $2, $3, $4, $5)
    `, [data.userId || null, data.sessionId, data.page, data.userAgent, data.referrer])
      .catch((err: Error) => console.error('Failed to save page view:', err))
    
    // Broadcast to admin
    io.to('admin-panel').emit('update', { 
      type: 'page-view-update', 
      data 
    })
  })
  
  // Cart update tracking
  socket.on('cart-update', (data: any) => {
    console.log('🛒 Cart update:', data.action, 'by:', socket.id)
    
    // Update last activity
    const session = activeSessions.get(socket.id)
    if (session) {
      session.lastActivity = Date.now()
    }
    
    // Save to database
    pool.query(`
      INSERT INTO cart_events (user_id, session_id, action, product_id, product_name, quantity, price)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      data.userId || null, 
      data.sessionId, 
      data.action, 
      data.data?.productId,
      data.data?.productName,
      data.data?.quantity,
      data.data?.price
    ])
      .catch((err: Error) => console.error('Failed to save cart event:', err))
    
    // Broadcast to admin
    io.to('admin-panel').emit('update', { 
      type: 'cart-update', 
      data 
    })
  })
  
  // User action tracking
  socket.on('user-action', (data: any) => {
    console.log('⚡ User action:', data.action, 'by:', socket.id)
    
    // Update last activity
    const session = activeSessions.get(socket.id)
    if (session) {
      session.lastActivity = Date.now()
    }
    
    // Save to database
    pool.query(`
      INSERT INTO user_actions (user_id, session_id, action, action_data, page)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      data.userId || null,
      data.sessionId,
      data.action,
      JSON.stringify(data.data),
      data.page
    ])
      .catch((err: Error) => console.error('Failed to save user action:', err))
    
    // Broadcast to admin
    io.to('admin-panel').emit('update', { 
      type: 'user-action-update', 
      data 
    })
  })

  socket.on('live-chat:typing', (data: any) => {
    const { sessionId, sender, isTyping } = data || {}
    if (sessionId) {
      io.to(`live-chat-session-${sessionId}`).emit('live-chat:typing', { sessionId, sender, isTyping: !!isTyping })
    }
  })
  
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log('❌ Client disconnected:', socket.id, 'reason:', reason)
    
    // Remove from active sessions
    activeSessions.delete(socket.id)
    
    // Broadcast updated count to admin
    io.to('admin-panel').emit('update', { 
      type: 'live-users-count', 
      data: { count: activeSessions.size } 
    })
  })
  
  socket.on('error', (error) => {
    console.error('Socket error:', socket.id, error)
  })
})

// ==================== CMS API (with real-time updates) ====================
app.use('/api/cms', createCMSRouter(pool, io))

// ==================== BLOG API ====================
// Initialize blog router with database pool
initBlogRouter(pool)
app.use('/api/blog', blogRouter)

// ==================== AFFILIATE PROGRAM API ====================
// Affiliate application submission
app.post('/api/admin/affiliate-applications', affiliateRoutes.submitAffiliateApplication.bind(null, pool))

// Admin affiliate management
app.get('/api/admin/affiliate-applications', affiliateRoutes.getAffiliateApplications.bind(null, pool))
app.get('/api/admin/affiliate-applications/:id', affiliateRoutes.getAffiliateApplication.bind(null, pool))
app.put('/api/admin/affiliate-applications/:id/approve', affiliateRoutes.approveAffiliateApplication.bind(null, pool))
app.put('/api/admin/affiliate-applications/:id/reject', affiliateRoutes.rejectAffiliateApplication.bind(null, pool))

// Affiliate partner management
app.get('/api/affiliate/application-status', authenticateToken, affiliateRoutes.getAffiliateApplicationStatus.bind(null, pool))
app.post('/api/affiliate/application', affiliateRoutes.submitAffiliateApplication.bind(null, pool))
app.post('/api/affiliate/verify', authenticateToken, affiliateRoutes.verifyAffiliateCode.bind(null, pool))
app.get('/api/affiliate/dashboard', authenticateToken, affiliateRoutes.getAffiliateDashboard.bind(null, pool))
app.get('/api/affiliate/referrals', authenticateToken, affiliateRoutes.getAffiliateReferrals.bind(null, pool))
app.get('/api/admin/affiliate-partners', affiliateRoutes.getAffiliatePartners.bind(null, pool))
app.get('/api/admin/affiliate-referral-analytics', affiliateRoutes.getAffiliateReferralAnalytics.bind(null, pool))
app.post('/api/admin/affiliate-partners/:id/regenerate-code', affiliateRoutes.regenerateVerificationCode.bind(null, pool))

// Affiliate commission management
app.get('/api/admin/affiliate-commission-settings', affiliateRoutes.getAffiliateCommissionSettings.bind(null, pool))
app.put('/api/admin/affiliate-commission-settings', (req: any, res) => {
  req.io = io
  affiliateRoutes.updateAffiliateCommissionSettings(pool, req, res)
})
app.get('/api/affiliate/commission-settings', affiliateRoutes.getAffiliateCommissionForUsers.bind(null, pool))
app.get('/api/affiliate/marketing-materials', affiliateRoutes.getAffiliateMarketingMaterials.bind(null, pool))

// ==================== COMMUNITY MANAGEMENT (ADMIN) ====================
// Frontend expects these endpoints; return empty lists for now so UI works without errors
app.get('/api/admin/community/posts', authenticateToken, (_req, res) => {
  sendSuccess(res, [])
})

app.get('/api/admin/community/comments', authenticateToken, (_req, res) => {
  sendSuccess(res, [])
})

// ==================== OPTIMIZED PRODUCTS API ====================
app.get('/api/products', (req, res) => productRoutes.getProducts(pool, res))
// Specific routes must come before generic :id route
app.post('/api/products/:productId/view', (req, res) => recommendationRoutes.trackProductView(pool, req, res))
app.get('/api/products/slug/:slug', (req, res) => productRoutes.getProductBySlug(pool, req, res))
app.get('/api/products/:id', (req, res) => productRoutes.getProductById(pool, req, res))
app.post('/api/products', (req, res) => productRoutes.createProduct(pool, req, res))
app.put('/api/products/:id', (req, res) => productRoutes.updateProduct(pool, req, res, io))
app.delete('/api/products/:id', (req, res) => productRoutes.deleteProduct(pool, req, res))
app.post('/api/products/bulk-delete', (req, res) => productRoutes.bulkDeleteProducts(pool, req, res))

// Product images endpoints
app.post('/api/products/:id/images', (req, res) => {
  // Check if it's multipart form data
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    upload.array('images', 10)(req, res, (err) => {
      if (err) return sendError(res, 400, 'File upload error', err)
      productRoutes.uploadProductImages(pool, req, res)
    })
  } else {
    // Handle JSON data
    productRoutes.uploadProductImages(pool, req, res)
  }
})
app.get('/api/products/:id/images', (req, res) => productRoutes.getProductImages(pool, req, res))
app.put('/api/products/:id/images/reorder', authenticateAndAttach as any, requirePermission(['products:update']), (req, res) => productRoutes.reorderProductImages(pool, req, res))
app.delete('/api/products/:id/images/:imageId', (req, res) => productRoutes.deleteProductImage(pool, req, res))

// ==================== VARIANTS & INVENTORY ====================
app.post('/api/products/:id/variant-options', (req, res) => variantRoutes.setVariantOptions(pool, req, res))
app.get('/api/products/:id/variant-options', (req, res) => variantRoutes.getVariantOptions(pool, req, res))
app.post('/api/products/:id/variants/generate', (req, res) => variantRoutes.generateVariants(pool, req, res))
app.get('/api/products/:id/variants', (req, res) => variantRoutes.listVariants(pool, req, res))
app.post('/api/products/:id/variants', (req, res) => variantRoutes.createVariant(pool, req, res))
app.put('/api/variants/:variantId', (req, res) => variantRoutes.updateVariant(pool, req, res))
app.delete('/api/variants/:variantId', (req, res) => variantRoutes.deleteVariant(pool, req, res))

app.get('/api/inventory/:productId/summary', (req, res) => inventoryRoutes.getInventorySummary(pool, req, res))
app.post('/api/inventory/:productId/:variantId/adjust', (req, res) => inventoryRoutes.adjustStock(pool, req, res))
app.post('/api/inventory/:productId/:variantId/low-threshold', (req, res) => inventoryRoutes.setLowStockThreshold(pool, req, res))
app.get('/api/inventory/low-stock', (req, res) => inventoryRoutes.listLowStock(pool, req, res))
app.get('/api/inventory/all', (req, res) => inventoryRoutes.getAllProductsWithInventory(pool, req, res))
app.put('/api/inventory/:productId/:variantId/quantity', (req, res) => inventoryRoutes.setStockQuantity(pool, req, res))

// ==================== SHIPROCKET ====================
app.get('/api/shiprocket/config', authenticateAndAttach as any, requireRole(['admin']), (req, res) => shiprocketRoutes.getShiprocketConfig(pool, req, res))
app.post('/api/shiprocket/config', authenticateAndAttach as any, requireRole(['admin']), (req, res) => shiprocketRoutes.saveShiprocketConfig(pool, req, res))
app.post('/api/shiprocket/orders/:orderId/shipment', authenticateAndAttach as any, requirePermission(['orders:update']), (req, res) => shiprocketRoutes.createShipment(pool, req, res))
app.post('/api/shiprocket/orders/:orderId/awb', authenticateAndAttach as any, requirePermission(['orders:update']), (req, res) => shiprocketRoutes.createAwbAndLabel(pool, req, res))
app.get('/api/shiprocket/orders/:orderId/track', authenticateAndAttach as any, requirePermission(['orders:read']), (req, res) => shiprocketRoutes.trackShipment(pool, req, res))
// Public endpoint for checking delivery serviceability (for product pages)
app.get('/api/public/shiprocket/serviceability', async (req, res) => {
  try {
    const { delivery_postcode, cod = '0', weight = '0.5' } = (req.query || {}) as any
    if (!delivery_postcode) return sendError(res, 400, 'delivery_postcode is required')
    
    const { getToken, getPickupLocations } = await import('./routes/shiprocket')
    const token = await getToken(pool)
    if (!token) return sendError(res, 400, 'Invalid Shiprocket credentials')
    
    // Use fixed pickup postcode: 226002 (Lucknow - 703, BCC Tower, Sultanpur Road, Arjunganj, Ahmamau)
    const pickupPostcode = '226002'
    
    const base = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external'
    const url = `${base}/courier/serviceability?pickup_postcode=${encodeURIComponent(pickupPostcode)}&delivery_postcode=${encodeURIComponent(delivery_postcode)}&cod=${encodeURIComponent(cod)}&weight=${encodeURIComponent(weight)}`
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const data = await resp.json()
    if (!resp.ok) return sendError(res, 400, 'Failed to check serviceability', data)
    sendSuccess(res, data)
  } catch (err) {
    sendError(res, 500, 'Failed to check pincode serviceability', err)
  }
})

app.get('/api/shiprocket/serviceability', authenticateAndAttach as any, requirePermission(['shipping:read']), (req, res) => shiprocketRoutes.checkPincodeServiceability(pool, req, res))
app.post('/api/shiprocket/manifest', authenticateAndAttach as any, requirePermission(['shipping:update']), (req, res) => shiprocketRoutes.createManifest(pool, req, res))
app.post('/api/shiprocket/pickup', authenticateAndAttach as any, requirePermission(['shipping:update']), (req, res) => shiprocketRoutes.schedulePickup(pool, req, res))
app.get('/api/shiprocket/ndr', authenticateAndAttach as any, requirePermission(['shipping:read']), (req, res) => shiprocketRoutes.listNdr(pool, req, res))
app.post('/api/shiprocket/ndr/:awb/action', authenticateAndAttach as any, requirePermission(['shipping:update']), (req, res) => shiprocketRoutes.actOnNdr(pool, req, res))
app.post('/api/shiprocket/rto/:orderId', authenticateAndAttach as any, requirePermission(['shipping:update']), (req, res) => shiprocketRoutes.markRto(pool, req, res))

// ==================== AMAZON ====================
app.post('/api/marketplaces/amazon/accounts', (req, res) => amazonRoutes.saveAmazonAccount(pool, req, res))
app.get('/api/marketplaces/amazon/accounts', (req, res) => amazonRoutes.listAmazonAccounts(pool, req, res))
app.post('/api/marketplaces/amazon/sync-products', (req, res) => amazonRoutes.syncProductsToAmazon(pool, req, res))
app.get('/api/marketplaces/amazon/import-orders', (req, res) => amazonRoutes.importAmazonOrders(pool, req, res))

// ==================== FLIPKART ====================
app.post('/api/marketplaces/flipkart/accounts', (req, res) => flipkartRoutes.saveFlipkartAccount(pool, req, res))
app.get('/api/marketplaces/flipkart/accounts', (req, res) => flipkartRoutes.listFlipkartAccounts(pool, req, res))
app.post('/api/marketplaces/flipkart/sync-products', (req, res) => flipkartRoutes.syncProductsToFlipkart(pool, req, res))
app.get('/api/marketplaces/flipkart/import-orders', (req, res) => flipkartRoutes.importFlipkartOrders(pool, req, res))

// ==================== BULK OPS ====================
app.post('/api/bulk/orders/status', authenticateAndAttach as any, requirePermission(['orders:update']), (req, res) => bulkRoutes.bulkUpdateOrderStatus(pool, req, res))
app.post('/api/bulk/shipping/labels', authenticateAndAttach as any, requirePermission(['shipping:update']), (req, res) => bulkRoutes.bulkGenerateShippingLabels(pool, req, res))
app.post('/api/bulk/invoices/download', authenticateAndAttach as any, requirePermission(['invoices:read']), (req, res) => bulkRoutes.bulkDownloadInvoices(pool, req, res))
app.post('/api/bulk/products/prices', authenticateAndAttach as any, requirePermission(['products:update']), (req, res) => bulkRoutes.bulkUpdateProductPrices(pool, req, res))

// ==================== STAFF & PERMISSIONS ====================
// ==================== RETURNS & REFUNDS ====================
// ==================== FACEBOOK / INSTAGRAM SHOP ====================
app.post('/api/fb-shop/config', (req, res) => facebookRoutes.saveConfig(pool, req, res))
app.get('/api/facebook/catalog.csv', (req, res) => facebookRoutes.catalogCSV(pool, req, res))
app.post('/api/facebook/sync-products', (req, res) => facebookRoutes.syncAllProducts(pool, req, res))
app.post('/api/facebook/sync-stock-price', (req, res) => facebookRoutes.syncStockPrice(pool, req, res))
app.get('/api/facebook/sync/status/:id', (req, res) => facebookRoutes.jobStatus(pool, req, res))
app.get('/api/facebook/sync-errors', (req, res) => facebookRoutes.listErrors(pool, req, res))
app.post('/api/facebook/sync-errors/clear', (req, res) => facebookRoutes.clearErrors(pool, req, res))
app.post('/api/facebook/field-mapping', (req, res) => facebookRoutes.saveFieldMapping(pool, req, res))
app.get('/api/facebook/field-mapping', (req, res) => facebookRoutes.getFieldMapping(pool, req, res))
app.post('/api/facebook/webhook', (req, res) => facebookRoutes.webhook(pool, req, res))

// ==================== META ADS ====================
// Configuration
app.post('/api/meta-ads/config', (req, res) => metaAdsRoutes.saveAdsConfig(pool, req, res))
app.get('/api/meta-ads/config', (req, res) => metaAdsRoutes.getAdsConfig(pool, req, res))

// Campaigns
app.get('/api/meta-ads/campaigns', (req, res) => metaAdsRoutes.getCampaigns(pool, req, res))
app.post('/api/meta-ads/campaigns', (req, res) => metaAdsRoutes.createCampaign(pool, req, res))
app.put('/api/meta-ads/campaigns/:id', (req, res) => metaAdsRoutes.updateCampaign(pool, req, res))
app.delete('/api/meta-ads/campaigns/:id', (req, res) => metaAdsRoutes.deleteCampaign(pool, req, res))

// Ad Sets
app.get('/api/meta-ads/adsets', (req, res) => metaAdsRoutes.getAdSets(pool, req, res))
app.post('/api/meta-ads/adsets', (req, res) => metaAdsRoutes.createAdSet(pool, req, res))
app.put('/api/meta-ads/adsets/:id', (req, res) => metaAdsRoutes.updateAdSet(pool, req, res))
app.delete('/api/meta-ads/adsets/:id', (req, res) => metaAdsRoutes.deleteAdSet(pool, req, res))

// Ads
app.get('/api/meta-ads/ads', (req, res) => metaAdsRoutes.getAds(pool, req, res))
app.post('/api/meta-ads/ads', (req, res) => metaAdsRoutes.createAd(pool, req, res))
app.put('/api/meta-ads/ads/:id', (req, res) => metaAdsRoutes.updateAd(pool, req, res))
app.delete('/api/meta-ads/ads/:id', (req, res) => metaAdsRoutes.deleteAd(pool, req, res))

// Ad Creatives
app.post('/api/meta-ads/creatives', (req, res) => metaAdsRoutes.createAdCreative(pool, req, res))

// Insights/Performance
app.get('/api/meta-ads/insights', (req, res) => metaAdsRoutes.getInsights(pool, req, res))
app.post('/api/meta-ads/insights/sync', (req, res) => metaAdsRoutes.syncInsights(pool, req, res))

// Pixel Events
app.post('/api/meta-ads/pixel/events', (req, res) => metaAdsRoutes.trackPixelEvent(pool, req, res))
app.get('/api/meta-ads/pixel/events', (req, res) => metaAdsRoutes.getPixelEvents(pool, req, res))

// Custom Audiences
app.get('/api/meta-ads/audiences', (req, res) => metaAdsRoutes.getAudiences(pool, req, res))
app.post('/api/meta-ads/audiences/sync', (req, res) => metaAdsRoutes.syncCustomAudience(pool, req, res))

// ==================== NOTIFICATIONS (WhatsApp + SMTP) ====================
app.get('/api/alerts/config', (req, res) => notificationRoutes.getConfig(pool, req, res))
app.post('/api/alerts/config', (req, res) => notificationRoutes.saveConfig(pool, req, res))
app.post('/api/alerts/test/whatsapp', (req, res) => notificationRoutes.testWhatsApp(pool, req, res))
app.post('/api/alerts/test/email', (req, res) => notificationRoutes.testEmail(pool, req, res))

// Order Notification Route (WhatsApp) - New modular endpoint
app.post('/api/notifications/order', (req, res) => notificationRoutes.sendOrderNotification(pool, req, res))
app.get('/api/returns', authenticateAndAttach as any, requirePermission(['returns:read']), (req, res) => returnRoutes.listReturns(pool, req, res))
app.post('/api/returns', authenticateAndAttach as any, requirePermission(['returns:create']), (req, res) => returnRoutes.createReturn(pool, req, res))
app.put('/api/returns/:id/status', authenticateAndAttach as any, requirePermission(['returns:update']), (req, res) => returnRoutes.updateReturnStatus(pool, req, res))
app.post('/api/returns/:id/label', authenticateAndAttach as any, requirePermission(['returns:update']), (req, res) => returnRoutes.generateReturnLabel(pool, req, res))

app.post('/api/staff/roles', (req, res) => staffRoutes.createRole(pool, req, res))
app.get('/api/staff/roles', (req, res) => staffRoutes.listRoles(pool, req, res))
app.post('/api/staff/permissions', (req, res) => staffRoutes.createPermission(pool, req, res))
app.post('/api/staff/role-permissions', (req, res) => staffRoutes.assignPermissionToRole(pool, req, res))
app.post('/api/staff/users', (req, res) => staffRoutes.createStaff(pool, req, res))
app.post('/api/staff/user-roles', (req, res) => staffRoutes.assignRoleToStaff(pool, req, res))
app.get('/api/staff/users', (req, res) => staffRoutes.listStaff(pool, req, res))
app.get('/api/staff/permissions', (req, res) => staffRoutes.listPermissions(pool, req, res))
app.get('/api/staff/role-permissions', (req, res) => staffRoutes.getRolePermissions(pool, req, res))
app.post('/api/staff/role-permissions/set', (req, res) => staffRoutes.setRolePermissions(pool, req, res))
app.get('/api/staff/activity', (req, res) => staffRoutes.listStaffActivity(pool, req, res))
app.post('/api/staff/auth/login', (req, res) => staffRoutes.staffLogin(pool, req, res))
app.post('/api/staff/auth/logout', staffAuthMiddleware as any, (req, res) => staffRoutes.staffLogout(pool, req, res))
app.get('/api/staff/auth/me', staffAuthMiddleware as any, (req, res) => staffRoutes.staffMe(pool, req, res))
app.post('/api/staff/auth/change-password', staffAuthMiddleware as any, (req, res) => staffRoutes.staffChangePassword(pool, req, res))
app.post('/api/staff/users/reset-password', (req, res) => staffRoutes.resetPassword(pool, req, res))
app.post('/api/staff/users/disable', (req, res) => staffRoutes.disableStaff(pool, req, res))
app.post('/api/staff/seed-standard', (req, res) => staffRoutes.seedStandardRolesAndPermissions(pool, req, res))
app.post('/api/staff/users/bulk-create', (req, res) => staffRoutes.bulkCreateStaff(pool, req, res))
app.get('/api/staff/layout-pages', (req, res) => staffRoutes.listLayoutPages(pool, req, res))
app.post('/api/staff/layout-permissions', (req, res) => staffRoutes.assignLayoutPermissions(pool, req, res))
app.get('/api/staff/:staffId/layout-permissions', (req, res) => staffRoutes.getStaffLayoutPermissions(pool, req, res))
app.get('/api/staff/users/with-layouts', (req, res) => staffRoutes.listStaffWithLayoutPermissions(pool, req, res))
app.get('/api/staff/admin-pages', (req, res) => staffRoutes.listAdminPanelPages(pool, req, res))
app.post('/api/staff/page-permissions', (req, res) => staffRoutes.assignPagePermissions(pool, req, res))
app.get('/api/staff/:staffId/page-permissions', (req, res) => staffRoutes.getStaffPagePermissions(pool, req, res))

// ==================== WAREHOUSES ====================
app.post('/api/warehouses', (req, res) => warehouseRoutes.createWarehouse(pool, req, res))
app.get('/api/warehouses', (req, res) => warehouseRoutes.listWarehouses(pool, req, res))
app.post('/api/warehouses/transfers', (req, res) => warehouseRoutes.createStockTransfer(pool, req, res))
app.get('/api/warehouses/transfers', (req, res) => warehouseRoutes.listStockTransfers(pool, req, res))

// ==================== SUPPLIERS & PURCHASE ORDERS ====================
app.post('/api/suppliers', (req, res) => supplierRoutes.createSupplier(pool, req, res))
app.get('/api/suppliers', (req, res) => supplierRoutes.listSuppliers(pool, req, res))
app.post('/api/purchase-orders', (req, res) => supplierRoutes.createPurchaseOrder(pool, req, res))
app.get('/api/purchase-orders', (req, res) => supplierRoutes.listPurchaseOrders(pool, req, res))

// ==================== POS SYSTEM ====================
app.post('/api/pos/transactions', (req, res) => posRoutes.createPOSTransaction(pool, req, res))
app.get('/api/pos/transactions', (req, res) => posRoutes.listPOSTransactions(pool, req, res))
app.post('/api/pos/sessions/open', (req, res) => posRoutes.openPOSSession(pool, req, res))
app.post('/api/pos/sessions/close', (req, res) => posRoutes.closePOSSession(pool, req, res))
app.post('/api/barcodes/generate', (req, res) => posRoutes.generateBarcode(pool, req, res))
app.get('/api/barcodes/scan', (req, res) => posRoutes.scanBarcode(pool, req, res))

// ==================== SEARCH API ====================
app.get('/api/search', (req, res) => searchRoutes.searchProducts(pool, req, res))
app.get('/api/search/filters', (req, res) => searchRoutes.getSearchFilters(pool, req, res))
app.post('/api/search/log', (req, res) => searchRoutes.logSearchQuery(pool, req, res))
app.post('/api/search/track', (req, res) => recommendationRoutes.trackSearch(pool, req, res))
app.get('/api/search/popular', (req, res) => recommendationRoutes.getPopularSearches(pool, req, res))

// ==================== RECOMMENDATIONS & RECENTLY VIEWED ====================
// Note: /api/products/:productId/view is defined above in PRODUCTS API section
app.get('/api/recommendations/recently-viewed', (req, res) => recommendationRoutes.getRecentlyViewed(pool, req, res))
app.get('/api/recommendations/related/:productId', (req, res) => recommendationRoutes.getRelatedProducts(pool, req, res))
app.get('/api/recommendations', (req, res) => recommendationRoutes.getRecommendedProducts(pool, req, res))

// ==================== PRODUCT COLLECTIONS (Offers, New Arrivals, Best Sellers) ====================
app.get('/api/collections', (req, res) => productCollectionRoutes.getCollections(pool, req, res))
app.get('/api/collections/:id', (req, res) => productCollectionRoutes.getCollectionById(pool, req, res))
app.post('/api/collections', authenticateAndAttach as any, requireRole(['admin']), (req, res) => productCollectionRoutes.createCollection(pool, req, res))
app.put('/api/collections/:id', authenticateAndAttach as any, requireRole(['admin']), (req, res) => productCollectionRoutes.updateCollection(pool, req, res))
app.delete('/api/collections/:id', authenticateAndAttach as any, requireRole(['admin']), (req, res) => productCollectionRoutes.deleteCollection(pool, req, res))

// ==================== RECOMMENDATION POSTS ====================
app.get('/api/recommendation-posts', (req, res) => productCollectionRoutes.getRecommendationPosts(pool, req, res))
app.get('/api/recommendation-posts/:id', (req, res) => productCollectionRoutes.getRecommendationPostById(pool, req, res))
app.post('/api/recommendation-posts', authenticateAndAttach as any, requireRole(['admin']), (req, res) => productCollectionRoutes.createRecommendationPost(pool, req, res))
app.put('/api/recommendation-posts/:id', authenticateAndAttach as any, requireRole(['admin']), (req, res) => productCollectionRoutes.updateRecommendationPost(pool, req, res))
app.delete('/api/recommendation-posts/:id', authenticateAndAttach as any, requireRole(['admin']), (req, res) => productCollectionRoutes.deleteRecommendationPost(pool, req, res))

// ==================== SUBSCRIPTIONS (WhatsApp) ====================
app.post('/api/whatsapp/subscribe', (req, res) => {
  (req as any).io = io
  subscriptionRoutes.subscribeWhatsApp(pool, req, res)
})
app.post('/api/whatsapp/unsubscribe', (req, res) => subscriptionRoutes.unsubscribeWhatsApp(pool, req, res))
app.get('/api/whatsapp/subscriptions', authenticateAndAttach as any, requireRole(['admin']), (req, res) => subscriptionRoutes.getWhatsAppSubscriptions(pool, req, res))
app.get('/api/whatsapp/stats', authenticateAndAttach as any, requireRole(['admin']), (req, res) => subscriptionRoutes.getWhatsAppStats(pool, req, res))

// Register extended modular routes (extracted from this file)
registerExtendedRoutes(app, pool, io)
registerDashboardAnalyticsRoutes(app, pool)
registerCommunicationsRoutes(app, pool, io)
registerIntegrationsRoutes(app, pool)
registerLiveChatRoutes(app, pool, io)

// ==================== API MANAGER ROUTES ====================
app.use(createAPIManagerRouter(pool))

// ==================== OPTIMIZED CART API ====================
app.get('/api/cart', authenticateToken, (req, res) => cartRoutes.getCart(pool, req, res))
app.post('/api/cart', authenticateToken, (req, res) => cartRoutes.addToCart(pool, req, res))
app.put('/api/cart/:cartItemId', authenticateToken, (req, res) => cartRoutes.updateCartItem(pool, req, res))
app.delete('/api/cart/:cartItemId', authenticateToken, (req, res) => cartRoutes.removeFromCart(pool, req, res))
app.delete('/api/cart', authenticateToken, (req, res) => cartRoutes.clearCart(pool, req, res))

// ==================== OPTIMIZED AUTHENTICATION API ====================
app.post('/api/auth/login', (req, res) => cartRoutes.login(pool, req, res))
app.post('/api/auth/register', (req, res) => cartRoutes.register(pool, req, res))
app.post('/api/auth/signup', (req, res) => cartRoutes.register(pool, req, res))

// Rate limiting for OTP and password reset endpoints
const otpRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_OTP_PER_HOUR || '5'),
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for internal/admin requests (optional)
    return false
  }
})

// Password Reset Routes (with rate limiting)
app.post('/api/auth/request-reset', otpRateLimit, (req, res) => authRoutes.forgotPassword(pool, req, res))
app.post('/api/auth/forgot-password', otpRateLimit, (req, res) => authRoutes.forgotPassword(pool, req, res)) // Legacy route
app.post('/api/auth/reset-password', (req, res) => authRoutes.resetPassword(pool, req, res))

// Google OAuth route
import * as googleAuthRoutes from './routes/googleAuth'
app.post('/api/auth/google', (req, res) => googleAuthRoutes.googleAuth(pool, req, res))

// OTP Routes (WhatsApp + Email) with rate limiting
app.post('/api/auth/send-otp', otpRateLimit, (req, res) => otpRoutes.sendOTP(pool, req, res))
app.post('/api/auth/verify-otp', (req, res) => otpRoutes.verifyOTP(pool, req, res))
app.post('/api/otp/send', otpRateLimit, (req, res) => otpRoutes.sendOTP(pool, req, res)) // Legacy route
app.post('/api/otp/verify', (req, res) => otpRoutes.verifyOTP(pool, req, res)) // Legacy route

// Legacy OTP routes (backward compatibility - using cart routes)
app.post('/api/auth/send-otp', (req, res) => cartRoutes.sendOTP(pool, req, res))
app.post('/api/auth/verify-otp-signup', (req, res) => cartRoutes.verifyOTPSignup(pool, req, res))
app.post('/api/auth/send-otp-login', (req, res) => cartRoutes.sendOTPLogin(pool, req, res))
app.post('/api/auth/verify-otp-login', (req, res) => cartRoutes.verifyOTPLogin(pool, req, res))

// ==================== OPTIMIZED USER PROFILE API ====================
app.get('/api/user/profile', authenticateToken, (req, res) => cartRoutes.getUserProfile(pool, req, res))
app.put('/api/user/profile', authenticateToken, (req, res) => cartRoutes.updateUserProfile(pool, req, res))

// Backward-compatible aliases for clients calling /api/users/profile
app.get('/api/users/profile', authenticateToken, (req, res) => cartRoutes.getUserProfile(pool, req, res))
app.put('/api/users/profile', authenticateToken, (req, res) => cartRoutes.updateUserProfile(pool, req, res))

// User Addresses Management
app.get('/api/users/addresses', authenticateToken, (req, res) => cartRoutes.getUserAddresses(pool, req, res))
app.post('/api/users/addresses', authenticateToken, (req, res) => cartRoutes.createUserAddress(pool, req, res))
app.put('/api/users/addresses/:id', authenticateToken, (req, res) => cartRoutes.updateUserAddress(pool, req, res))
app.delete('/api/users/addresses/:id', authenticateToken, (req, res) => cartRoutes.deleteUserAddress(pool, req, res))
app.put('/api/users/addresses/:id/default', authenticateToken, (req, res) => cartRoutes.setDefaultAddress(pool, req, res))

// Saved cards endpoint
app.get('/api/users/saved-cards', authenticateToken, (req, res) => {
  res.json({ success: true, data: [] })
})

// ==================== USER MANAGEMENT & ACTIVITY TRACKING API ====================
// Get all users (admin)
app.get('/api/users', (req, res) => userRoutes.getAllUsers(pool, req, res))

// Search users (admin)
app.get('/api/users/search', (req, res) => userRoutes.searchUsers(pool, req, res))

// Get user segments (admin)
app.get('/api/users/segments', (req, res) => userRoutes.getUserSegments(pool, req, res))

// Get detailed user profile with activities (admin)
app.get('/api/users/:id', (req, res) => userRoutes.getUserDetails(pool, req, res))

// Get user activity timeline (admin)
app.get('/api/users/:id/activity', (req, res) => userRoutes.getUserActivityTimeline(pool, req, res))

// Add note to user (admin)
app.post('/api/users/:id/notes', authenticateToken, (req, res) => userRoutes.addUserNote(pool, req, res))

// Add tag to user (admin)
app.post('/api/users/:id/tags', authenticateToken, (req, res) => userRoutes.addUserTag(pool, req, res))

// Remove tag from user (admin)
app.delete('/api/users/:id/tags', authenticateToken, (req, res) => userRoutes.removeUserTag(pool, req, res))

// Track page view
app.post('/api/track/page-view', (req, res) => userRoutes.trackPageView(pool, req, res))

// Track form submission
app.post('/api/track/form-submit', (req, res) => userRoutes.trackFormSubmission(pool, req, res))

// Track cart event
app.post('/api/track/cart-event', (req, res) => userRoutes.trackCartEvent(pool, req, res))

// ==================== AI PERSONALIZATION API ====================
app.get('/api/ai-personalization/content', async (req, res) => {
  try {
    // Return personalized content based on user preferences
    const personalizedContent = {
      featured_products: [],
      recommendations: [],
      personalized_offers: [],
      content_sections: [
        {
          type: 'banner',
          title: 'Welcome to Nefol',
          subtitle: 'Discover our premium skincare collection',
          image: '/images/welcome-banner.jpg'
        },
        {
          type: 'products',
          title: 'Featured Products',
          products: []
        }
      ]
    }
    
    sendSuccess(res, personalizedContent)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch personalized content', err)
  }
})

// ==================== ANALYTICS API ====================
app.get('/api/analytics-data', async (req, res) => {
  try {
    // Return sample analytics data
    const analyticsData = [
      { metric_name: 'total_users', metric_value: 150, date_recorded: new Date().toISOString().split('T')[0] },
      { metric_name: 'total_orders', metric_value: 45, date_recorded: new Date().toISOString().split('T')[0] },
      { metric_name: 'total_revenue', metric_value: 12500, date_recorded: new Date().toISOString().split('T')[0] },
      { metric_name: 'conversion_rate', metric_value: 3.2, date_recorded: new Date().toISOString().split('T')[0] }
    ]
    
    sendSuccess(res, analyticsData)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch analytics data', err)
  }
})

// Cashback balance endpoint
// moved to routes/extended.ts: /api/cashback/balance

// Helper function to record coin transactions
async function recordCoinTransaction(
  pool: Pool,
  userId: string | number,
  amount: number,
  type: string,
  description: string,
  status: string = 'completed',
  orderId?: number | null,
  withdrawalId?: number | null,
  metadata?: any
) {
  try {
    await pool.query(`
      INSERT INTO coin_transactions (
        user_id, amount, type, description, status, order_id, withdrawal_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [userId, amount, type, description, status, orderId || null, withdrawalId || null, metadata ? JSON.stringify(metadata) : null])
  } catch (err) {
    console.error('Error recording coin transaction:', err)
  }
}

// Nefol coins (loyalty points) endpoint
// moved to routes/extended.ts: /api/nefol-coins

// Get user's coin transaction history
// moved to routes/extended.ts: /api/coin-transactions

// ==================== COIN WITHDRAWAL API ====================
// Get user's withdrawal history
// moved to routes/extended.ts: /api/coin-withdrawals (GET, POST) and admin processing

// Create withdrawal request

// Get all withdrawal requests (admin only)

// Process withdrawal (admin only)
 

// ==================== PAYMENT API ====================
app.get('/api/payment-gateways', async (req, res) => {
  try {
    // Return sample payment gateways
    const paymentGateways = [
      {
        id: 1,
        name: 'Razorpay',
        type: 'online',
        is_active: true,
        config: {
          key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_RigxrHNSReeV37',
          key_secret: process.env.RAZORPAY_KEY_SECRET || 'F9PT2uJbFVQUedEXI3iL59N9'
        }
      },
      {
        id: 2,
        name: 'Cash on Delivery',
        type: 'cod',
        is_active: true,
        config: {}
      },
      {
        id: 3,
        name: 'UPI',
        type: 'upi',
        is_active: true,
        config: {}
      }
    ]
    
    sendSuccess(res, paymentGateways)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch payment gateways', err)
  }
})

// Razorpay Payment Routes
app.post('/api/payment/razorpay/create-order', paymentRoutes.createRazorpayOrder(pool))
app.post('/api/payment/razorpay/verify', paymentRoutes.verifyRazorpayPayment(pool))
app.post('/api/payment/razorpay/webhook', express.raw({ type: 'application/json' }), paymentRoutes.razorpayWebhook(pool))

// ==================== MARKETING CAMPAIGNS API ====================
app.get('/api/email-campaigns', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM email_campaigns ORDER BY created_at DESC')
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch email campaigns', err)
  }
})

app.get('/api/sms-campaigns', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sms_campaigns ORDER BY created_at DESC')
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch SMS campaigns', err)
  }
})

app.get('/api/push-notifications', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM push_notifications ORDER BY created_at DESC')
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch push notifications', err)
  }
})

// ==================== MARKETING API ENDPOINTS ====================

// Cashback APIs
app.get('/api/cashback/wallet', authenticateToken, marketingRoutes.getCashbackWallet.bind(null, pool))
app.get('/api/cashback/offers', marketingRoutes.getCashbackOffers.bind(null, pool))
app.get('/api/cashback/transactions', authenticateToken, marketingRoutes.getCashbackTransactions.bind(null, pool))
app.post('/api/cashback/redeem', marketingRoutes.redeemCashback.bind(null, pool))

// Email Marketing APIs
app.get('/api/email-marketing/campaigns', marketingRoutes.getEmailCampaigns.bind(null, pool))
app.post('/api/email-marketing/campaigns', marketingRoutes.createEmailCampaign.bind(null, pool))
app.put('/api/email-marketing/campaigns/:id', marketingRoutes.updateEmailCampaign.bind(null, pool))
app.delete('/api/email-marketing/campaigns/:id', marketingRoutes.deleteEmailCampaign.bind(null, pool))
app.post('/api/email-marketing/campaigns/send', marketingRoutes.sendEmailCampaign.bind(null, pool))
app.get('/api/email-marketing/templates', marketingRoutes.getEmailTemplates.bind(null, pool))
app.post('/api/email-marketing/templates', marketingRoutes.createEmailTemplate.bind(null, pool))
app.put('/api/email-marketing/templates/:id', marketingRoutes.updateEmailTemplate.bind(null, pool))
app.delete('/api/email-marketing/templates/:id', marketingRoutes.deleteEmailTemplate.bind(null, pool))
app.get('/api/email-marketing/lists', marketingRoutes.getEmailLists.bind(null, pool))
app.post('/api/email-marketing/lists', marketingRoutes.createEmailList.bind(null, pool))
app.post('/api/email-marketing/lists/subscribers', marketingRoutes.addEmailSubscribers.bind(null, pool))
app.get('/api/email-marketing/logs', marketingRoutes.getEmailSendingLogs.bind(null, pool))
app.get('/api/email-marketing/automations', marketingRoutes.getEmailAutomations.bind(null, pool))
app.post('/api/email-marketing/automations', marketingRoutes.createEmailAutomation.bind(null, pool))
app.put('/api/email-marketing/automations/:id', marketingRoutes.updateEmailAutomation.bind(null, pool))

// SMS Marketing APIs
app.get('/api/sms-marketing/campaigns', marketingRoutes.getSMSCampaigns.bind(null, pool))
app.post('/api/sms-marketing/campaigns', marketingRoutes.createSMSCampaign.bind(null, pool))
app.put('/api/sms-marketing/campaigns/:id', marketingRoutes.updateSMSCampaign.bind(null, pool))
app.delete('/api/sms-marketing/campaigns/:id', marketingRoutes.deleteSMSCampaign.bind(null, pool))
app.get('/api/sms-marketing/templates', marketingRoutes.getSMSTemplates.bind(null, pool))
app.get('/api/sms-marketing/automations', marketingRoutes.getSMSAutomations.bind(null, pool))
app.post('/api/sms-marketing/automations', marketingRoutes.createSMSAutomation.bind(null, pool))
app.put('/api/sms-marketing/automations/:id', marketingRoutes.updateSMSAutomation.bind(null, pool))

// Push Notifications APIs
app.get('/api/push-notifications', marketingRoutes.getPushNotifications.bind(null, pool))
app.get('/api/push-notifications/templates', marketingRoutes.getPushTemplates.bind(null, pool))
app.get('/api/push-notifications/automations', marketingRoutes.getPushAutomations.bind(null, pool))

// WhatsApp Chat APIs
app.get('/api/whatsapp-chat/sessions', marketingRoutes.getWhatsAppChats.bind(null, pool))
app.get('/api/whatsapp-chat/templates', marketingRoutes.getWhatsAppTemplates.bind(null, pool))
app.get('/api/whatsapp-chat/automations', marketingRoutes.getWhatsAppAutomations.bind(null, pool))
app.post('/api/whatsapp-chat/send', marketingRoutes.sendWhatsAppMessage.bind(null, pool))

// WhatsApp Configuration & Management APIs
app.get('/api/whatsapp/config', marketingRoutes.getWhatsAppConfig.bind(null, pool))
app.post('/api/whatsapp/config', marketingRoutes.saveWhatsAppConfig.bind(null, pool))
app.post('/api/whatsapp/templates', marketingRoutes.createWhatsAppTemplate.bind(null, pool))
app.post('/api/whatsapp/templates/sync', marketingRoutes.syncWhatsAppTemplates.bind(null, pool))
app.delete('/api/whatsapp/templates/:id', marketingRoutes.deleteWhatsAppTemplate.bind(null, pool))
app.post('/api/whatsapp/automations', marketingRoutes.createWhatsAppAutomation.bind(null, pool))
app.get('/api/whatsapp/scheduled-messages', marketingRoutes.getScheduledWhatsAppMessages.bind(null, pool))
app.post('/api/whatsapp/scheduled-messages', marketingRoutes.createScheduledWhatsAppMessage.bind(null, pool))

// Live Chat APIs
app.get('/api/live-chat/sessions', marketingRoutes.getLiveChatSessions.bind(null, pool))
app.get('/api/live-chat/agents', marketingRoutes.getLiveChatAgents.bind(null, pool))
app.get('/api/live-chat/widgets', marketingRoutes.getLiveChatWidgets.bind(null, pool))

// ==================== GENERIC CRUD ROUTES ====================
// These replace the duplicate code patterns found in the original file

// Generic CRUD handler
function createCRUDHandler(tableName: string, requiredFields: string[] = []) {
  return {
    // GET all
    getAll: async (req: any, res: any) => {
      try {
        // Support query parameters for filtering
        const queryParams = req.query || {}
        const conditions: string[] = []
        const values: any[] = []
        let paramIndex = 1

        // Build WHERE clause from query parameters
        // Note: In production, validate column names against schema for security
        for (const [key, value] of Object.entries(queryParams)) {
          if (value !== undefined && value !== null && value !== '') {
            // Convert numeric strings to numbers for id fields
            let processedValue: any = value
            if (key.endsWith('_id') || key === 'id') {
              const numValue = Number(value)
              if (!isNaN(numValue)) {
                processedValue = numValue
              }
            }
            conditions.push(`${key} = $${paramIndex}`)
            values.push(processedValue)
            paramIndex++
          }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
        const query = `SELECT * FROM ${tableName} ${whereClause} ORDER BY created_at DESC`
        
        const { rows } = await pool.query(query, values)
        sendSuccess(res, rows)
      } catch (err) {
        sendError(res, 500, `Failed to fetch ${tableName}`, err)
      }
    },
    
    // GET by ID
    getById: async (req: any, res: any) => {
      try {
        const { rows } = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id])
        if (rows.length === 0) {
          return sendError(res, 404, `${tableName} not found`)
        }
        sendSuccess(res, rows[0])
      } catch (err) {
        sendError(res, 500, `Failed to fetch ${tableName}`, err)
      }
    },
    
    // POST create
    create: async (req: any, res: any) => {
      try {
        const body = req.body || {}
        
        // Validate required fields
        for (const field of requiredFields) {
          if (!body[field]) {
            return sendError(res, 400, `${field} is required`)
          }
        }
        
        const fields = Object.keys(body)
        const values = fields.map(field => body[field])
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ')
        
        const { rows } = await pool.query(
          `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
          values
        )
        
        // Broadcast to admin
        broadcastUpdate(`${tableName}_created`, rows[0])
        
        // Broadcast to users for relevant tables
        if (['products', 'orders', 'discounts', 'announcements'].includes(tableName)) {
          broadcastToUsers(`${tableName}-created`, rows[0])
        }
        
        sendSuccess(res, rows[0], 201)
      } catch (err: any) {
        if (err?.code === '23505') {
          sendError(res, 409, `${tableName} already exists`)
        } else {
          sendError(res, 500, `Failed to create ${tableName}`, err)
        }
      }
    },
    
    // PUT update
    update: async (req: any, res: any) => {
      try {
        const body = req.body || {}
        const fields = Object.keys(body).filter(key => body[key] !== undefined)
        
        if (fields.length === 0) {
          return sendError(res, 400, 'No fields to update')
        }
        
        const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ')
        const values = [req.params.id, ...fields.map(field => body[field])]
        
        const { rows } = await pool.query(
          `UPDATE ${tableName} SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
          values
        )
        
        if (rows.length === 0) {
          return sendError(res, 404, `${tableName} not found`)
        }
        
        // Broadcast to admin
        broadcastUpdate(`${tableName}_updated`, rows[0])
        
        // Broadcast to users for relevant tables
        if (['products', 'orders', 'discounts', 'announcements'].includes(tableName)) {
          broadcastToUsers(`${tableName}-updated`, rows[0])
        }
        
        sendSuccess(res, rows[0])
      } catch (err) {
        sendError(res, 500, `Failed to update ${tableName}`, err)
      }
    },
    
    // DELETE
    delete: async (req: any, res: any) => {
      try {
        const { rows } = await pool.query(
          `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`,
          [req.params.id]
        )
        
        if (rows.length === 0) {
          return sendError(res, 404, `${tableName} not found`)
        }
        
        // Broadcast to admin
        broadcastUpdate(`${tableName}_deleted`, rows[0])
        
        // Broadcast to users for relevant tables
        if (['products', 'orders', 'discounts', 'announcements'].includes(tableName)) {
          broadcastToUsers(`${tableName}-deleted`, rows[0])
        }
        
        sendSuccess(res, { message: `${tableName} deleted successfully` })
      } catch (err) {
        sendError(res, 500, `Failed to delete ${tableName}`, err)
      }
    }
  }
}

// Apply CRUD routes to all tables
const tables = [
  { name: 'videos', required: ['title', 'description', 'video_url', 'redirect_url', 'price', 'size', 'thumbnail_url'] },
  { name: 'users', required: ['name', 'email', 'password'] },
  { name: 'email_campaigns', required: ['name', 'subject'] },
  { name: 'sms_campaigns', required: ['name', 'message'] },
  { name: 'push_notifications', required: ['title', 'message'] },
  { name: 'whatsapp_chat', required: ['phone_number'] },
  { name: 'live_chat', required: ['customer_name'] },
  { name: 'analytics_data', required: ['metric_name'] },
  { name: 'forms', required: ['name'] },
  { name: 'workflows', required: ['name'] },
  { name: 'customer_segments', required: ['name'] },
  { name: 'customer_journeys', required: ['customer_id', 'journey_step'] },
  { name: 'actionable_insights', required: ['insight_type'] },
  { name: 'ai_features', required: ['feature_name'] },
  { name: 'journey_funnels', required: ['funnel_name'] },
  { name: 'personalization_rules', required: ['rule_name'] },
  { name: 'custom_audiences', required: ['audience_name'] },
  { name: 'omni_channel_campaigns', required: ['campaign_name'] },
  { name: 'api_configurations', required: ['name', 'category'] },
  { name: 'invoices', required: ['invoice_number', 'customer_name', 'customer_email', 'order_id', 'amount', 'due_date'] },
  { name: 'tax_rates', required: ['name', 'rate', 'type', 'region'] },
  { name: 'tax_rules', required: ['name', 'conditions', 'tax_rate_ids'] },
  { name: 'returns', required: ['return_number', 'order_id', 'customer_name', 'customer_email', 'reason', 'total_amount', 'refund_amount'] },
  { name: 'payment_methods', required: ['name', 'type'] },
  { name: 'payment_gateways', required: ['name', 'type', 'api_key', 'secret_key', 'webhook_url'] },
  { name: 'payment_transactions', required: ['transaction_id', 'order_id', 'customer_name', 'amount', 'method', 'gateway'] },
  { name: 'loyalty_program', required: ['name'] },
  { name: 'affiliate_program', required: ['name'] },
  { name: 'cashback_system', required: ['name'] },
  { name: 'order_delivery_status', required: ['order_id', 'status'] },
  { name: 'product_reviews', required: ['product_id', 'customer_email', 'customer_name', 'rating'] },
  { name: 'product_questions', required: ['product_id', 'customer_name', 'customer_email', 'question'] },
  { name: 'delivery_notifications', required: ['order_id', 'customer_email', 'notification_type'] },
  { name: 'shiprocket_config', required: ['api_key', 'api_secret'] },
  { name: 'shiprocket_shipments', required: ['order_id'] },
  { name: 'discounts', required: ['name', 'code', 'type', 'value'] },
  { name: 'discount_usage', required: ['discount_id', 'order_id', 'customer_email'] }
]

// ==================== SPECIALIZED ENDPOINTS ====================
// These must come BEFORE generic CRUD routes to avoid conflicts

// Get testimonials for homepage (reviews with rating >= 4 and profile photos)
app.get('/api/testimonials', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (pr.customer_email)
        pr.id,
        pr.customer_name,
        pr.customer_email,
        pr.rating,
        pr.review_text,
        pr.comment,
        pr.created_at,
        u.profile_photo
      FROM product_reviews pr
      INNER JOIN users u ON pr.customer_email = u.email
      WHERE pr.rating >= 4 
        AND pr.is_approved = true 
        AND (pr.status = 'approved' OR pr.status IS NULL)
        AND u.profile_photo IS NOT NULL 
        AND u.profile_photo != ''
      ORDER BY pr.customer_email, pr.rating DESC, pr.created_at DESC
      LIMIT 20
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch testimonials', err)
  }
})

// Get product reviews by product_id (must come before /api/product-reviews/:id)
app.get('/api/product-reviews/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params
    
    // Validate productId parameter
    if (!productId || productId === 'undefined' || productId === 'null') {
      return sendError(res, 400, 'Invalid product ID')
    }
    
    const productIdNum = parseInt(productId, 10)
    if (isNaN(productIdNum) || productIdNum <= 0) {
      return sendError(res, 400, 'Invalid product ID')
    }
    
    const { rows } = await pool.query(`
      SELECT 
        id,
        product_id,
        customer_name,
        customer_email,
        rating,
        title,
        review_text,
        comment,
        images,
        is_verified,
        is_featured,
        created_at,
        updated_at
      FROM product_reviews 
      WHERE product_id = $1 AND is_approved = true AND (status = 'approved' OR status IS NULL)
      ORDER BY 
        is_featured DESC,
        created_at DESC
    `, [productIdNum])
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch product reviews', err)
  }
})

// Get review stats (rating and count) by product slug
app.get('/api/product-reviews/stats/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const { rows } = await pool.query(`
      SELECT 
        p.id as product_id,
        p.slug,
        COALESCE(AVG(pr.rating), 0) as average_rating,
        COUNT(pr.id) as review_count,
        COUNT(CASE WHEN pr.is_verified = true THEN 1 END) as verified_count
      FROM products p
      LEFT JOIN product_reviews pr ON p.id = pr.product_id 
        AND pr.is_approved = true 
        AND (pr.status = 'approved' OR pr.status IS NULL)
      WHERE p.slug = $1
      GROUP BY p.id, p.slug
    `, [slug])
    
    if (rows.length === 0) {
      return sendSuccess(res, { product_id: null, slug, average_rating: 0, review_count: 0, verified_count: 0 })
    }
    
    const stats = {
      product_id: rows[0].product_id,
      slug: rows[0].slug,
      average_rating: parseFloat(parseFloat(rows[0].average_rating).toFixed(2)),
      review_count: parseInt(rows[0].review_count),
      verified_count: parseInt(rows[0].verified_count)
    }
    
    sendSuccess(res, stats)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch review stats', err)
  }
})

// Get review stats for multiple products by slugs (batch endpoint)
app.post('/api/product-reviews/stats/batch', async (req, res) => {
  try {
    const { slugs } = req.body
    
    if (!Array.isArray(slugs) || slugs.length === 0) {
      return sendError(res, 400, 'slugs must be a non-empty array')
    }
    
    const { rows } = await pool.query(`
      SELECT 
        p.id as product_id,
        p.slug,
        COALESCE(AVG(pr.rating), 0) as average_rating,
        COUNT(pr.id) as review_count,
        COUNT(CASE WHEN pr.is_verified = true THEN 1 END) as verified_count
      FROM products p
      LEFT JOIN product_reviews pr ON p.id = pr.product_id 
        AND pr.is_approved = true 
        AND (pr.status = 'approved' OR pr.status IS NULL)
      WHERE p.slug = ANY($1)
      GROUP BY p.id, p.slug
    `, [slugs])
    
    // Create a map of slug -> stats
    const statsMap: Record<string, any> = {}
    rows.forEach((row: any) => {
      statsMap[row.slug] = {
        product_id: row.product_id,
        slug: row.slug,
        average_rating: parseFloat(parseFloat(row.average_rating).toFixed(2)),
        review_count: parseInt(row.review_count),
        verified_count: parseInt(row.verified_count)
      }
    })
    
    // Include entries for slugs that don't have reviews
    slugs.forEach((slug: string) => {
      if (!statsMap[slug]) {
        statsMap[slug] = {
          product_id: null,
          slug,
          average_rating: 0,
          review_count: 0,
          verified_count: 0
        }
      }
    })
    
    sendSuccess(res, statsMap)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch review stats', err)
  }
})

// Create product review endpoint (custom handler to support title and review_text)
app.post('/api/product-reviews', async (req, res) => {
  try {
    const { 
      order_id, 
      product_id, 
      customer_email, 
      customer_name, 
      rating, 
      title,
      review_text,
      comment,
      images
    } = req.body || {}
    
    // Validate required fields
    if (!product_id || !customer_email || !customer_name || !rating) {
      return sendError(res, 400, 'product_id, customer_email, customer_name, and rating are required')
    }
    
    if (rating < 1 || rating > 5) {
      return sendError(res, 400, 'Rating must be between 1 and 5')
    }
    
    // Use review_text if provided, otherwise fall back to comment
    const reviewContent = review_text || comment || ''
    
    const { rows } = await pool.query(`
      INSERT INTO product_reviews (
        order_id, 
        product_id, 
        customer_email, 
        customer_name, 
        rating, 
        title,
        review_text,
        comment,
        images,
        is_approved,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, 'approved')
      RETURNING *
    `, [
      order_id || null,
      product_id,
      customer_email,
      customer_name,
      rating,
      title || null,
      reviewContent,
      comment || reviewContent,
      images ? JSON.stringify(images) : null
    ])
    
    // Broadcast to admin
    broadcastUpdate('product_reviews_created', rows[0])
    
    // Broadcast to users
    broadcastToUsers('product-reviews-created', rows[0])
    
    sendSuccess(res, rows[0], 201)
  } catch (err: any) {
    console.error('Failed to create product review:', err)
    if (err?.code === '23503') {
      sendError(res, 400, 'Invalid product_id or order_id')
    } else {
      sendError(res, 500, 'Failed to create product review', err)
    }
  }
})

// Product Questions endpoints
app.get('/api/product-questions/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params
    const { rows } = await pool.query(`
      SELECT 
        pq.*,
        u.name as answered_by_name
      FROM product_questions pq
      LEFT JOIN users u ON pq.answered_by = u.id
      WHERE pq.product_id = $1
      ORDER BY 
        CASE WHEN pq.answer IS NOT NULL THEN 0 ELSE 1 END,
        pq.created_at DESC
    `, [productId])
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch product questions', err)
  }
})

app.post('/api/product-questions', async (req, res) => {
  try {
    const { 
      product_id, 
      customer_name, 
      customer_email, 
      customer_phone,
      question 
    } = req.body || {}
    
    if (!product_id || !customer_name || !customer_email || !question) {
      return sendError(res, 400, 'product_id, customer_name, customer_email, and question are required')
    }
    
    const { rows } = await pool.query(`
      INSERT INTO product_questions (
        product_id,
        customer_name,
        customer_email,
        customer_phone,
        question,
        status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [
      product_id,
      customer_name,
      customer_email,
      customer_phone || null,
      question
    ])
    
    // Broadcast to admin
    broadcastUpdate('product_questions_created', rows[0])
    
    // Create admin notification
    try {
      await createAdminNotification(
        pool,
        'product_question',
        'New Product Question',
        `Question from ${customer_name} (${customer_email})`,
        `/admin/product-questions`,
        '❓',
        'medium',
        { question_id: rows[0].id, product_id, customer_name, customer_email }
      )
    } catch (notifErr) {
      console.error('Error creating admin notification:', notifErr)
    }
    
    sendSuccess(res, rows[0], 201)
  } catch (err: any) {
    console.error('Failed to create product question:', err)
    if (err?.code === '23503') {
      sendError(res, 400, 'Invalid product_id')
    } else {
      sendError(res, 500, 'Failed to create product question', err)
    }
  }
})

// Discount usage endpoint (must come before /api/discounts/:id)
app.get('/api/discounts/usage', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT du.*, d.name as discount_name, d.code as discount_code
      FROM discount_usage du
      JOIN discounts d ON du.discount_id = d.id
      ORDER BY du.created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch discount usage', err)
  }
})

// Apply discount code endpoint
app.post('/api/discounts/apply', async (req, res) => {
  try {
    const { code, amount, customer_email, product_id, product_ids } = req.body || {}
    
    // Validate input
    if (!code || typeof code !== 'string' || code.trim() === '') {
      console.error('Invalid discount code input:', { code, type: typeof code })
      return sendError(res, 400, 'Discount code is required and must be a non-empty string')
    }
    
    if (amount === undefined || amount === null) {
      console.error('Missing order amount:', { amount })
      return sendError(res, 400, 'Order amount is required')
    }
    
    const orderAmount = parseFloat(String(amount))
    if (isNaN(orderAmount) || orderAmount < 0) {
      console.error('Invalid order amount:', { amount, parsed: orderAmount })
      return sendError(res, 400, 'Order amount must be a valid positive number')
    }

    const codeUpper = code.trim().toUpperCase()
    console.log('Applying discount code:', { 
      code: codeUpper, 
      amount: orderAmount, 
      customer_email, 
      product_id,
      product_ids,
      hasProductIds: Array.isArray(product_ids) && product_ids.length > 0
    })

    // Find the discount by code
    const discountResult = await pool.query(
      `SELECT * FROM discounts WHERE code = $1 AND is_active = true`,
      [codeUpper]
    )

    if (discountResult.rows.length === 0) {
      console.log('Discount code not found or inactive:', codeUpper)
      return sendError(res, 404, 'Invalid or inactive discount code')
    }

    const discount = discountResult.rows[0]
    const now = new Date()

    // Check if discount is within validity period
    if (discount.valid_from && new Date(discount.valid_from) > now) {
      console.log('Discount code not yet valid:', { code: codeUpper, valid_from: discount.valid_from })
      return sendError(res, 400, `Discount code is not yet valid. Valid from ${new Date(discount.valid_from).toLocaleDateString()}`)
    }

    if (discount.valid_until && new Date(discount.valid_until) < now) {
      console.log('Discount code expired:', { code: codeUpper, valid_until: discount.valid_until })
      return sendError(res, 400, `Discount code has expired. Expired on ${new Date(discount.valid_until).toLocaleDateString()}`)
    }

    // Check if discount is product-specific and product matches
    if (discount.product_id) {
      const discountProductId = parseInt(String(discount.product_id))
      
      // Get product IDs from request (support both single product_id and array product_ids)
      const cartProductIds: number[] = []
      if (product_ids && Array.isArray(product_ids)) {
        cartProductIds.push(...product_ids.map((id: any) => parseInt(String(id))).filter((id: number) => !isNaN(id)))
      } else if (product_id) {
        cartProductIds.push(parseInt(String(product_id)))
      }
      
      // Check if discount's product_id is in the cart
      if (cartProductIds.length === 0 || !cartProductIds.includes(discountProductId)) {
        console.log('Discount is product-specific and product does not match:', { 
          code: codeUpper, 
          discountProductId, 
          cartProductIds,
          hasMatchingProduct: cartProductIds.includes(discountProductId)
        })
        return sendError(res, 400, 'This discount code is only valid for a specific product')
      }
      
      console.log('✅ Product-specific discount validated:', { code: codeUpper, discountProductId, cartProductIds })
    }

    // Check minimum purchase amount
    if (discount.min_purchase) {
      const minPurchase = parseFloat(String(discount.min_purchase))
      if (orderAmount < minPurchase) {
        console.log('Minimum purchase not met:', { code: codeUpper, orderAmount, minPurchase })
        return sendError(res, 400, `Minimum purchase amount of ₹${minPurchase} required. Current order amount: ₹${orderAmount}`)
      }
    }

    // Check usage limit
    if (discount.usage_limit) {
      const usageCount = parseInt(String(discount.usage_count || 0))
      const usageLimit = parseInt(String(discount.usage_limit))
      if (usageCount >= usageLimit) {
        console.log('Discount usage limit reached:', { code: codeUpper, usageCount, usageLimit })
        return sendError(res, 400, `Discount code usage limit reached (${usageCount}/${usageLimit} uses)`)
      }
    }

    // Check per-user usage limit
    if (discount.usage_limit_per_user && customer_email) {
      const userUsageResult = await pool.query(
        `SELECT COUNT(*) as usage_count FROM discount_usage 
         WHERE discount_id = $1 AND customer_email = $2`,
        [discount.id, customer_email]
      )
      const userUsageCount = parseInt(String(userUsageResult.rows[0]?.usage_count || 0))
      const userUsageLimit = parseInt(String(discount.usage_limit_per_user))
      if (userUsageCount >= userUsageLimit) {
        console.log('Per-user usage limit reached:', { code: codeUpper, customer_email, userUsageCount, userUsageLimit })
        return sendError(res, 400, `You have reached the maximum usage limit for this discount code (${userUsageCount}/${userUsageLimit} uses)`)
      }
    }

    // Check if one-time use and already used by this customer
    if (discount.is_one_time_use && customer_email) {
      const existingUsage = await pool.query(
        `SELECT COUNT(*) as usage_count FROM discount_usage 
         WHERE discount_id = $1 AND customer_email = $2`,
        [discount.id, customer_email]
      )
      const hasUsed = parseInt(String(existingUsage.rows[0]?.usage_count || 0)) > 0
      if (hasUsed) {
        console.log('One-time use discount already used:', { code: codeUpper, customer_email })
        return sendError(res, 400, 'This discount code can only be used once and has already been used')
      }
    }

    // Calculate discount amount
    let discountAmount = 0
    const discountValue = parseFloat(String(discount.value || 0))
    
    if (discount.type === 'percentage') {
      discountAmount = (orderAmount * discountValue) / 100
      // Apply max discount limit if set
      if (discount.max_discount) {
        const maxDiscount = parseFloat(String(discount.max_discount))
        if (discountAmount > maxDiscount) {
          discountAmount = maxDiscount
        }
      }
    } else if (discount.type === 'fixed') {
      discountAmount = discountValue
      // Don't allow discount to exceed order amount
      if (discountAmount > orderAmount) {
        discountAmount = orderAmount
      }
    } else if (discount.type === 'fixed_price') {
      // For fixed_price, the discount is the difference between order amount and fixed price
      discountAmount = Math.max(0, orderAmount - discountValue)
      // The final price will be the fixed price
    } else {
      console.error('Invalid discount type:', { code: codeUpper, type: discount.type })
      return sendError(res, 400, `Invalid discount type: ${discount.type}`)
    }

    const response = {
      id: discount.id,
      code: discount.code,
      name: discount.name,
      type: discount.type,
      value: parseFloat(discount.value),
      discountAmount: Math.round(discountAmount * 100) / 100,
      maxDiscount: discount.max_discount ? parseFloat(discount.max_discount) : null,
      finalPrice: discount.type === 'fixed_price' ? discountValue : (orderAmount - Math.round(discountAmount * 100) / 100)
    }

    console.log('✅ Discount applied successfully:', { code: codeUpper, discountAmount: response.discountAmount })
    
    // Return discount details
    sendSuccess(res, response)
  } catch (err: any) {
    console.error('Error applying discount:', {
      error: err.message,
      stack: err.stack,
      body: req.body
    })
    sendError(res, 500, 'Failed to apply discount code', err)
  }
})

// Marketing campaigns endpoint
app.get('/api/marketing/campaigns', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM email_campaigns
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch campaigns', err)
  }
})

// Marketing templates endpoint
app.get('/api/marketing/templates', async (req, res) => {
  try {
    // Return empty array for now - templates can be added to a new table if needed
    sendSuccess(res, [])
  } catch (err) {
    sendError(res, 500, 'Failed to fetch templates', err)
  }
})

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
  try {
    const range = req.query.range || '30d'
    
    // Calculate date range
    const days = parseInt(range.toString().replace('d', '')) || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Get analytics data
    const ordersQuery = await pool.query(`
      SELECT 
        COUNT(*)::int as total_orders,
        COALESCE(SUM(total), 0)::numeric as total_revenue,
        COUNT(DISTINCT customer_email)::int as unique_customers
      FROM orders
      WHERE created_at >= $1
    `, [startDate])
    
    // Safely query analytics_data table (might not exist)
    let pageViews = 0
    try {
      const pageViewsQuery = await pool.query(`
        SELECT COUNT(*)::int as page_views
        FROM analytics_data
        WHERE metric_name = 'page_view' AND created_at >= $1
      `, [startDate])
      pageViews = Number(pageViewsQuery.rows[0]?.page_views) || 0
    } catch (analyticsErr) {
      // analytics_data table might not exist, use 0
      console.warn('analytics_data table query failed, using default:', analyticsErr)
      pageViews = 0
    }
    
    // Get chart data grouped by date
    const chartDataQuery = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::int as orders,
        COALESCE(SUM(total), 0)::numeric as revenue
      FROM orders
      WHERE created_at >= $1
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [startDate])
    
    const orders = ordersQuery.rows[0] || {}
    const totalOrders = Number(orders.total_orders) || 0
    const totalRevenue = Number(orders.total_revenue) || 0
    const uniqueCustomers = Number(orders.unique_customers) || 0
    
    sendSuccess(res, {
      overview: {
        sessions: Math.floor(pageViews * 0.6),
        pageViews: pageViews,
        bounceRate: 45.2,
        avgSessionDuration: '2:34',
        conversionRate: 3.2,
        revenue: totalRevenue,
        orders: totalOrders,
        customers: uniqueCustomers,
        sessionsChange: 0,
        pageViewsChange: 0,
        bounceRateChange: 0,
        avgSessionDurationChange: 0,
        conversionRateChange: 0,
        revenueChange: 0,
        ordersChange: 0,
        customersChange: 0
      },
      chartData: chartDataQuery.rows.map((row: any) => ({
        date: row.date,
        sessions: Math.floor(Math.random() * 200) + 100,
        revenue: Number(row.revenue) || 0,
        orders: Number(row.orders) || 0
      }))
    })
  } catch (err) {
    console.error('Analytics endpoint error:', err)
    sendError(res, 500, 'Failed to fetch analytics', err)
  }
})

// Shiprocket shipments endpoint (must come before generic CRUD)
app.get('/api/shiprocket/shipments', async (req, res) => {
  try {
    // Get the most recent shipment for each order to avoid duplicates
    const { rows } = await pool.query(`
      SELECT 
        ss.id,
        ss.order_id,
        ss.shipment_id,
        ss.tracking_url,
        ss.status,
        ss.awb_code,
        ss.label_url,
        ss.created_at,
        ss.updated_at,
        o.order_number,
        o.customer_name,
        o.customer_email,
        o.total,
        o.status as order_status,
        o.payment_method,
        o.payment_status
      FROM shiprocket_shipments ss
      LEFT JOIN orders o ON ss.order_id = o.id
      WHERE ss.id IN (
        SELECT MAX(id) 
        FROM shiprocket_shipments 
        GROUP BY order_id
      )
      ORDER BY ss.created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch shipments', err)
  }
})

// Create Shiprocket shipment endpoint
app.post('/api/shiprocket/create-shipment', async (req, res) => {
  try {
    const { order_id } = req.body
    
    if (!order_id) {
      return sendError(res, 400, 'order_id is required')
    }
    
    // Get order details
    const orderResult = await pool.query('SELECT * FROM orders WHERE order_number = $1', [order_id])
    
    if (orderResult.rows.length === 0) {
      return sendError(res, 404, 'Order not found')
    }
    
    const order = orderResult.rows[0]
    
    // Create shipment record
    const { rows } = await pool.query(`
      INSERT INTO shiprocket_shipments (order_id, status, customer_name, customer_email, total, order_status)
      VALUES ($1, 'created', $2, $3, $4, $5)
      RETURNING *
    `, [order_id, order.customer_name, order.customer_email, order.total, order.status])
    
    // Broadcast to admin
    broadcastUpdate('shipment_created', rows[0])
    
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create shipment', err)
  }
})

// Loyalty program endpoint (alias for consistency)
app.get('/api/loyalty-program', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM loyalty_program
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch loyalty programs', err)
  }
})

// Create loyalty program
app.post('/api/loyalty-program', async (req, res) => {
  try {
    const { name, description, points_per_rupee, referral_bonus, vip_threshold, status } = req.body || {}
    if (!name) {
      return sendError(res, 400, 'name is required')
    }
    const { rows } = await pool.query(
      `INSERT INTO loyalty_program (name, description, points_per_rupee, referral_bonus, vip_threshold, status)
       VALUES ($1, $2, COALESCE($3, 1), COALESCE($4, 0), COALESCE($5, 0), COALESCE($6, 'active'))
       RETURNING *`,
      [name, description || null, points_per_rupee, referral_bonus, vip_threshold, status]
    )
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create loyalty program', err)
  }
})

// Update loyalty program
app.put('/api/loyalty-program/:id', async (req, res) => {
  try {
    const { id } = req.params as any
    const { name, description, points_per_rupee, referral_bonus, vip_threshold, status } = req.body || {}
    const { rows } = await pool.query(
      `UPDATE loyalty_program
       SET 
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         points_per_rupee = COALESCE($4, points_per_rupee),
         referral_bonus = COALESCE($5, referral_bonus),
         vip_threshold = COALESCE($6, vip_threshold),
         status = COALESCE($7, status),
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, name, description, points_per_rupee, referral_bonus, vip_threshold, status]
    )
    if (!rows[0]) return sendError(res, 404, 'Loyalty program not found')
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to update loyalty program', err)
  }
})

// Register all CRUD routes
tables.forEach(({ name, required }) => {
  const handler = createCRUDHandler(name, required)
  app.get(`/api/${name}`, handler.getAll)
  // Constrain numeric IDs for users to avoid conflict with /api/users/profile
  if (name === 'users') {
    app.get(`/api/${name}/:id(\\d+)`, handler.getById)
    app.put(`/api/${name}/:id(\\d+)`, handler.update)
    app.delete(`/api/${name}/:id(\\d+)`, handler.delete)
  } else {
    app.get(`/api/${name}/:id`, handler.getById)
    app.put(`/api/${name}/:id`, handler.update)
    app.delete(`/api/${name}/:id`, handler.delete)
  }
  app.post(`/api/${name}`, handler.create)
})

// ==================== SPECIALIZED ENDPOINTS ====================
// These require custom logic beyond basic CRUD

// File upload endpoint with error handling for multer
app.post('/api/upload', (req, res, next) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, 400, 'File too large. Maximum size is 500MB.')
        }
        return sendError(res, 400, `Upload error: ${err.message}`)
      }
      // Handle other errors (like fileFilter errors)
      if (err.message && err.message.includes('Invalid file type')) {
        return sendError(res, 400, err.message)
      }
      console.error('Upload error:', err)
      return sendError(res, 500, 'Failed to upload file', err)
    }
    next()
  })
}, (req, res) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) return sendError(res, 400, 'No file uploaded')
    
    const url = `/uploads/${file.filename}`
    const isVideo = file.mimetype.startsWith('video/') || 
                    /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(file.originalname)
    
    sendSuccess(res, { 
      url, 
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      isVideo: isVideo
    })
  } catch (err: any) {
    console.error('Upload processing error:', err)
    sendError(res, 500, 'Failed to process uploaded file', err)
  }
})

// Carousel Settings endpoints
app.get('/api/carousel-settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM carousel_settings ORDER BY id DESC LIMIT 1')
    if (result.rows.length > 0) {
      sendSuccess(res, result.rows)
    } else {
      // Return default settings if none exist
      sendSuccess(res, [{
        id: 0,
        settings: {
          autoAdvanceInterval: 3000,
          videoPlayDuration: 3000,
          animationDuration: 700,
          animationEasing: 'ease-in-out',
          autoPlay: true,
          radius: 500,
          blurAmount: 12,
          minOpacity: 0.6,
          minScale: 0.85
        },
        created_at: new Date().toISOString()
      }])
    }
  } catch (error: any) {
    // If table doesn't exist, create it and return defaults
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS carousel_settings (
          id SERIAL PRIMARY KEY,
          settings JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      sendSuccess(res, [{
        id: 0,
        settings: {
          autoAdvanceInterval: 3000,
          videoPlayDuration: 3000,
          animationDuration: 700,
          animationEasing: 'ease-in-out',
          autoPlay: true,
          radius: 500,
          blurAmount: 12,
          minOpacity: 0.6,
          minScale: 0.85
        },
        created_at: new Date().toISOString()
      }])
    } catch (createError: any) {
      sendError(res, 500, 'Failed to load carousel settings', createError)
    }
  }
})

app.post('/api/carousel-settings', async (req, res) => {
  try {
    const { settings } = req.body
    if (!settings) {
      return sendError(res, 400, 'Settings are required')
    }

    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS carousel_settings (
        id SERIAL PRIMARY KEY,
        settings JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Check if settings exist
    const existing = await pool.query('SELECT * FROM carousel_settings ORDER BY id DESC LIMIT 1')
    
    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        'UPDATE carousel_settings SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(settings), existing.rows[0].id]
      )
    } else {
      // Insert new
      await pool.query(
        'INSERT INTO carousel_settings (settings) VALUES ($1)',
        [JSON.stringify(settings)]
      )
    }

    sendSuccess(res, { message: 'Settings saved successfully', settings })
  } catch (error: any) {
    sendError(res, 500, 'Failed to save carousel settings', error)
  }
})

// Video view and like endpoints
app.post('/api/videos/:id/view', async (req, res) => {
  try {
    const { id } = req.params
    const { user_id, session_id } = req.body
    
    // Check if video exists
    const videoCheck = await pool.query('SELECT id, views FROM videos WHERE id = $1', [id])
    if (videoCheck.rows.length === 0) {
      return sendError(res, 404, 'Video not found')
    }
    
    // Check if user/session has already viewed this video
    let alreadyViewed = false
    if (user_id) {
      const userViewCheck = await pool.query(
        'SELECT id FROM video_views WHERE video_id = $1 AND user_id = $2',
        [id, user_id]
      )
      alreadyViewed = userViewCheck.rows.length > 0
    } else if (session_id) {
      const sessionViewCheck = await pool.query(
        'SELECT id FROM video_views WHERE video_id = $1 AND session_id = $2',
        [id, session_id]
      )
      alreadyViewed = sessionViewCheck.rows.length > 0
    }
    
    // If already viewed, return current view count without incrementing
    if (alreadyViewed) {
      return sendSuccess(res, { views: videoCheck.rows[0].views, already_viewed: true })
    }
    
    // Record the view in video_views table
    await pool.query(
      'INSERT INTO video_views (video_id, user_id, session_id) VALUES ($1, $2, $3)',
      [id, user_id || null, session_id || null]
    )
    
    // Increment view count only if this is a new view
    const result = await pool.query(
      'UPDATE videos SET views = COALESCE(views, 0) + 1 WHERE id = $1 RETURNING views',
      [id]
    )
    
    sendSuccess(res, { views: result.rows[0].views, already_viewed: false })
  } catch (error: any) {
    // Handle unique constraint violation (race condition)
    if (error.code === '23505') {
      // View was already recorded, just return current count
      const result = await pool.query('SELECT views FROM videos WHERE id = $1', [req.params.id])
      if (result.rows.length > 0) {
        return sendSuccess(res, { views: result.rows[0].views, already_viewed: true })
      }
    }
    sendError(res, 500, 'Failed to track video view', error)
  }
})

app.post('/api/videos/:id/like', async (req, res) => {
  try {
    const { id } = req.params
    
    // Increment like count
    const result = await pool.query(
      'UPDATE videos SET likes = COALESCE(likes, 0) + 1 WHERE id = $1 RETURNING likes',
      [id]
    )
    
    if (result.rows.length === 0) {
      return sendError(res, 404, 'Video not found')
    }
    
    sendSuccess(res, { likes: result.rows[0].likes })
  } catch (error: any) {
    sendError(res, 500, 'Failed to like video', error)
  }
})

app.post('/api/videos/:id/unlike', async (req, res) => {
  try {
    const { id } = req.params
    
    // Decrement like count (minimum 0)
    const result = await pool.query(
      'UPDATE videos SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = $1 RETURNING likes',
      [id]
    )
    
    if (result.rows.length === 0) {
      return sendError(res, 404, 'Video not found')
    }
    
    sendSuccess(res, { likes: result.rows[0].likes })
  } catch (error: any) {
    sendError(res, 500, 'Failed to unlike video', error)
  }
})

// CSV upload endpoint (FIXED PATH)
// CSV upload endpoint (FIXED PATH)
app.post('/api/products-csv/upload', upload.single('file'), async (req, res) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) return sendError(res, 400, 'No file uploaded')
    const destPath = path.resolve(process.cwd(), '..', 'product description page.csv')
    fs.copyFileSync(file.path, destPath)
    sendSuccess(res, { ok: true })
  } catch (err) {
    console.error('Failed to upload CSV:', err)
    sendError(res, 500, 'Failed to upload CSV', err)
  }
})

// Wishlist endpoints
app.get('/api/wishlist', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return sendError(res, 401, 'No token provided')
    
    const tokenParts = token.split('_')
    if (tokenParts.length < 3) return sendError(res, 401, 'Invalid token format')
    
    const userId = tokenParts[2]
    const { rows } = await pool.query(`
      SELECT w.*, p.title, p.price, p.list_image, p.slug, p.description
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `, [userId])
    
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch wishlist', err)
  }
})

app.post('/api/wishlist', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return sendError(res, 401, 'No token provided')
    
    const tokenParts = token.split('_')
    if (tokenParts.length < 3) return sendError(res, 401, 'Invalid token format')
    
    const userId = tokenParts[2]
    const { product_id } = req.body
    
    if (!product_id) return sendError(res, 400, 'product_id is required')
    
    const { rows } = await pool.query(`
      INSERT INTO wishlist (user_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, product_id) DO NOTHING
      RETURNING *
    `, [userId, product_id])
    
    if (rows.length === 0) {
      return sendSuccess(res, { message: 'Item already in wishlist' })
    }
    
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to add to wishlist', err)
  }
})

app.delete('/api/wishlist/:productId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return sendError(res, 401, 'No token provided')
    
    const tokenParts = token.split('_')
    if (tokenParts.length < 3) return sendError(res, 401, 'Invalid token format')
    
    const userId = tokenParts[2]
    const { productId } = req.params
    
    const { rows } = await pool.query(`
      DELETE FROM wishlist 
      WHERE user_id = $1 AND product_id = $2
      RETURNING *
    `, [userId, productId])
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Wishlist item not found')
    }
    
    sendSuccess(res, { message: 'Item removed from wishlist' })
  } catch (err) {
    sendError(res, 500, 'Failed to remove from wishlist', err)
  }
})

// Orders endpoints (simplified)
app.get('/api/orders', authenticateAndAttach as any, requirePermission(['orders:read']), async (req, res) => {
  try {
    const { status, q, from, to, customer, page = '1', limit = '50', payment_status, cod } = req.query as Record<string, string>
    const where: string[] = []
    const params: any[] = []
    if (status) {
      params.push(status)
      where.push(`status = $${params.length}`)
    }
    if (payment_status) {
      params.push(payment_status)
      where.push(`payment_status = $${params.length}`)
    }
    if (typeof cod !== 'undefined') {
      params.push(cod === 'true')
      where.push(`coalesce(cod, false) = $${params.length}`)
    }
    if (customer) {
      params.push(`%${customer}%`)
      where.push(`(customer_name ILIKE $${params.length} OR customer_email ILIKE $${params.length})`)
    }
    if (q) {
      params.push(`%${q}%`)
      where.push(`(order_number ILIKE $${params.length})`)
    }
    if (from) {
      params.push(from)
      where.push(`created_at >= $${params.length}`)
    }
    if (to) {
      params.push(to)
      where.push(`created_at <= $${params.length}`)
    }
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50))
    const offset = (pageNum - 1) * limitNum
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const { rows } = await pool.query(
      `SELECT * FROM orders ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    )
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch orders', err)
  }
})

// Orders CSV export
app.get('/api/orders/export', authenticateAndAttach as any, requirePermission(['orders:read']), async (req, res) => {
  try {
    const { status, q, from, to, customer } = req.query as Record<string, string>
    const where: string[] = []
    const params: any[] = []
    if (status) { params.push(status); where.push(`status = $${params.length}`) }
    if (customer) { params.push(`%${customer}%`); where.push(`(customer_name ILIKE $${params.length} OR customer_email ILIKE $${params.length})`) }
    if (q) { params.push(`%${q}%`); where.push(`(order_number ILIKE $${params.length})`) }
    if (from) { params.push(from); where.push(`created_at >= $${params.length}`) }
    if (to) { params.push(to); where.push(`created_at <= $${params.length}`) }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const { rows } = await pool.query(`SELECT * FROM orders ${whereSql} ORDER BY created_at DESC`, params)
    const headers = ['order_number','customer_name','customer_email','status','subtotal','shipping','tax','total','created_at']
    const csv = [headers.join(',')].concat(
      rows.map(r => headers.map(h => {
        const v = r[h]
        if (v == null) return ''
        const s = String(v).replace(/"/g, '""')
        return /[,"]/.test(s) ? `"${s}"` : s
      }).join(','))
    ).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"')
    res.send(csv)
  } catch (err) {
    sendError(res, 500, 'Failed to export orders', err)
  }
})

app.get('/api/orders/:orderNumber', allowOrderView as any, async (req, res) => {
  try {
    const { orderNumber } = req.params
    let rowsRes = await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber])
    if (rowsRes.rows.length === 0 && /^\d+$/.test(orderNumber)) {
      rowsRes = await pool.query('SELECT * FROM orders WHERE id = $1', [orderNumber])
    }
    const rows = rowsRes.rows
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Order not found')
    }
    // Include items and status history if available
    let history: any[] = []
    try {
      const h = await pool.query('SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC', [rows[0].id])
      history = h.rows
    } catch (_) {}
    sendSuccess(res, { ...rows[0], history })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch order details', err)
  }
})

// Order tags/labels
app.post('/api/orders/:id/tags', authenticateAndAttach as any, requirePermission(['orders:update']), async (req, res) => {
  try {
    const { id } = req.params
    const { tags } = req.body || {}
    if (!Array.isArray(tags)) return sendError(res, 400, 'tags must be an array')
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tags TEXT[]`)
    const { rows } = await pool.query(`UPDATE orders SET tags = $2, updated_at = NOW() WHERE id = $1 RETURNING id, tags`, [id, tags])
    if (rows.length === 0) return sendError(res, 404, 'Order not found')
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to update tags', err)
  }
})

// Split order (basic): split by item indexes into a new order
app.post('/api/orders/:id/split', authenticateAndAttach as any, requirePermission(['orders:update']), async (req, res) => {
  try {
    const { id } = req.params
    const { itemIndexes = [] } = req.body || {}
    if (!Array.isArray(itemIndexes) || itemIndexes.length === 0) return sendError(res, 400, 'itemIndexes required')
    const oRes = await pool.query('SELECT * FROM orders WHERE id = $1', [id])
    if (oRes.rows.length === 0) return sendError(res, 404, 'Order not found')
    const order = oRes.rows[0]
    const items: any[] = Array.isArray(order.items) ? order.items : (order.items ? JSON.parse(order.items) : [])
    const keep: any[] = []
    const move: any[] = []
    items.forEach((it, idx) => (itemIndexes.includes(idx) ? move : keep).push(it))
    if (move.length === 0) return sendError(res, 400, 'No items to move')
    const calcTotal = (arr: any[]) => arr.reduce((sum, it) => sum + (Number(it.price||0) * Number(it.qty||1)), 0)
    const subtotalNew = calcTotal(move)
    const subtotalOld = calcTotal(keep)
    const shippingSplit = Number(order.shipping||0) * (subtotalNew / Math.max(1,(subtotalNew + subtotalOld)))
    const taxSplit = Number(order.tax||0) * (subtotalNew / Math.max(1,(subtotalNew + subtotalOld)))
    const totalNew = subtotalNew + shippingSplit + taxSplit
    const totalOld = subtotalOld + (Number(order.shipping||0) - shippingSplit) + (Number(order.tax||0) - taxSplit)

    // Update original order
    await pool.query(
      `UPDATE orders SET items = $2::jsonb, subtotal = $3, total = $4, updated_at = NOW() WHERE id = $1`,
      [id, JSON.stringify(keep), subtotalOld, totalOld]
    )

    // Create new order number
    const newOrderNumber = `${order.order_number}-S${Date.now().toString().slice(-4)}`
    const ins = await pool.query(
      `INSERT INTO orders (order_number, customer_name, customer_email, shipping_address, items, subtotal, shipping, tax, total, payment_method, payment_type, payment_status, cod, status)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        newOrderNumber,
        order.customer_name,
        order.customer_email,
        order.shipping_address,
        JSON.stringify(move),
        subtotalNew,
        shippingSplit,
        taxSplit,
        totalNew,
        order.payment_method,
        order.payment_type,
        order.payment_status || 'unpaid',
        order.cod || false,
        order.status || 'pending'
      ]
    )
    sendSuccess(res, { original: { id, items: keep, total: totalOld }, split: ins.rows[0] }, 201)
  } catch (err) {
    sendError(res, 500, 'Failed to split order', err)
  }
})

app.post('/api/orders', allowOrderCreation as any, async (req, res) => {
  try {
    const {
      order_number,
      customer_name,
      customer_email,
      shipping_address,
      billing_address,
      items,
      subtotal,
      shipping = 0,
      tax = 0,
      total,
      payment_method,
      payment_type,
      payment_status = 'unpaid',
      cod = false,
      affiliate_id, // Add affiliate tracking
      discount_code, // Discount code if applied
      discount_amount = 0, // Discount amount applied
      coins_used = 0 // Coins used for payment
    } = req.body || {}
    
    // Validate required fields - allow total to be 0 when coins cover full amount
    if (!customer_name || !customer_email || !shipping_address || !items || total === undefined || total === null) {
      return sendError(res, 400, 'Missing required fields')
    }
    
    // Validate total is a valid number (can be 0 if fully paid with coins)
    if (typeof total !== 'number' || total < 0 || isNaN(total)) {
      return sendError(res, 400, 'Invalid total amount')
    }
    
    // Ensure columns exist
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT`)
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod BOOLEAN DEFAULT false`)
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tags TEXT[]`)
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code TEXT`)
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0`)
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address JSONB`)
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coins_used INTEGER DEFAULT 0`)
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number TEXT`)

    // Import order number generation utilities
    const { generateOrderNumber, generateNewInvoiceNumber } = await import('./utils/invoiceUtils')
    
    // Auto-generate order number in new format (N-093011251001)
    // If order_number is provided, use it; otherwise generate new format
    const generatedOrderNumber = order_number || await generateOrderNumber(pool, items)
    
    // Generate invoice number in new format (N09LKO3011251001)
    const invoiceNumber = await generateNewInvoiceNumber(pool, shipping_address)

    const { rows } = await pool.query(`
      INSERT INTO orders (order_number, invoice_number, customer_name, customer_email, shipping_address, billing_address, items, subtotal, shipping, tax, total, payment_method, payment_type, payment_status, cod, affiliate_id, discount_code, discount_amount, coins_used)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      generatedOrderNumber, 
      invoiceNumber,
      customer_name, 
      customer_email, 
      JSON.stringify(shipping_address), 
      billing_address ? JSON.stringify(billing_address) : null,
      JSON.stringify(items), 
      subtotal, 
      shipping, 
      tax, 
      total, 
      payment_method, 
      payment_type, 
      payment_status, 
      cod,
      affiliate_id || null,
      discount_code || null,
      discount_amount || 0,
      coins_used || 0
    ])
    
    const order = rows[0]

    // Track discount usage if discount code was applied
    if (discount_code && discount_amount > 0) {
      try {
        const discountResult = await pool.query(
          `SELECT id FROM discounts WHERE code = $1`,
          [discount_code.toUpperCase()]
        )
        
        if (discountResult.rows.length > 0) {
          const discountId = discountResult.rows[0].id
          
          // Record discount usage
          await pool.query(`
            INSERT INTO discount_usage (discount_id, order_id, customer_email, discount_amount)
            VALUES ($1, $2, $3, $4)
          `, [discountId, order.id, customer_email, discount_amount])
          
          // Increment usage count
          await pool.query(`
            UPDATE discounts 
            SET usage_count = usage_count + 1,
                updated_at = NOW()
            WHERE id = $1
          `, [discountId])
          
          console.log(`✅ Discount usage tracked: ${discount_code} for order ${order_number}`)
        }
      } catch (discountErr) {
        console.error('Error tracking discount usage:', discountErr)
        // Don't fail the order if discount tracking fails
      }
    }
    
    // Process affiliate commission if this is a referral
    if (affiliate_id) {
      console.log(`🎯 Processing affiliate commission for affiliate_id: ${affiliate_id}, order: ${order_number}`)
      try {
        // Get affiliate details
        const affiliateResult = await pool.query(
          'SELECT * FROM affiliate_partners WHERE id = $1 AND status = $2',
          [affiliate_id, 'active']
        )
        
        console.log(`🔍 Found ${affiliateResult.rows.length} active affiliate(s) for ID: ${affiliate_id}`)
        
        if (affiliateResult.rows.length > 0) {
          const affiliate = affiliateResult.rows[0]
          
          // Get current commission rate
          const commissionSettingsResult = await pool.query(`
            SELECT commission_percentage FROM affiliate_commission_settings 
            WHERE is_active = true
            ORDER BY created_at DESC 
            LIMIT 1
          `)
          
          const commissionRate = commissionSettingsResult.rows.length > 0 
            ? commissionSettingsResult.rows[0].commission_percentage 
            : 10.0 // Default 10%
          
          // Calculate commission
          const commissionEarned = (total * commissionRate) / 100
          
          // Create affiliate referral record
          await pool.query(`
            INSERT INTO affiliate_referrals (
              affiliate_id, order_id, customer_email, customer_name, 
              order_total, commission_earned, commission_rate, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [affiliate_id, order.id, customer_email, customer_name, total, commissionEarned, commissionRate, 'confirmed'])
          
          // Update affiliate partner stats
          await pool.query(`
            UPDATE affiliate_partners 
            SET total_referrals = total_referrals + 1,
                total_earnings = total_earnings + $1,
                pending_earnings = pending_earnings + $1
            WHERE id = $2
          `, [commissionEarned, affiliate_id])
          
          // Add commission as Nefol coins to affiliate's loyalty points (1 rupee = 10 coins)
          if (affiliate.user_id) {
            const coinsToAdd = Math.floor(commissionEarned * 10)
            await pool.query(`
              UPDATE users 
              SET loyalty_points = loyalty_points + $1
              WHERE id = $2
            `, [coinsToAdd, affiliate.user_id])
            
            // Record referral coins transaction for tracking withdrawal eligibility (8 days rule)
            await recordCoinTransaction(
              pool,
              affiliate.user_id,
              coinsToAdd,
              'referral_commission',
              `Referral commission: ${coinsToAdd} coins (₹${commissionEarned.toFixed(2)}) from order ${order_number}`,
              'completed',
              order.id,
              null,
              { source: 'referral', order_number, commission_earned: commissionEarned }
            )
            
            console.log(`Added ${coinsToAdd} Nefol coins to affiliate ${affiliate.email} for order ${order_number} (₹${commissionEarned})`)
          }
          
          console.log(`Affiliate commission processed: ${commissionEarned} for affiliate ${affiliate.email}`)
        } else {
          console.log(`❌ No active affiliate found for ID: ${affiliate_id}`)
        }
      } catch (affiliateErr) {
        console.error('Error processing affiliate commission:', affiliateErr)
        // Don't fail the order if affiliate processing fails
      }
    } else {
      console.log(`ℹ️ No affiliate_id provided for order: ${order_number}`)
    }
    
    // Deduct coins if coins were used for payment
    if (coins_used && coins_used > 0) {
      try {
        // Get user by email
        const userResult = await pool.query('SELECT id, loyalty_points FROM users WHERE email = $1', [customer_email])
        const userId = userResult.rows[0]?.id
        const currentCoins = userResult.rows[0]?.loyalty_points || 0
        
        if (userId && currentCoins >= coins_used) {
          // EXPLOIT PREVENTION: Track which source orders generated the coins being used (FIFO - First In First Out)
          // This prevents the exploit where:
          // 1. User places Order A → gets coins
          // 2. User places Order B → gets coins
          // 3. User uses coins to place Order C
          // 4. User cancels Order A & B → coins deducted, but Order C was already paid with those coins
          // Solution: Track source orders in metadata, so when Order A/B is cancelled, we can deduct coins from Order C
          const sourceOrdersResult = await pool.query(`
            SELECT ct.id, ct.order_id, ct.amount, o.order_number
            FROM coin_transactions ct
            LEFT JOIN orders o ON ct.order_id = o.id
            WHERE ct.user_id = $1
              AND ct.amount > 0
              AND ct.type IN ('earned', 'referral_commission')
              AND ct.status = 'completed'
              AND (o.status IS NULL OR o.status NOT IN ('cancelled'))
            ORDER BY ct.created_at ASC
            LIMIT $2
          `, [userId, Math.ceil(coins_used / 10) * 10]) // Get enough transactions to cover coins_used
          
          // Track source orders in metadata
          const sourceOrders: Array<{ transaction_id: number, order_id: number | null, order_number: string | null, amount: number }> = []
          let remainingCoins = coins_used
          
          for (const sourceTx of sourceOrdersResult.rows) {
            if (remainingCoins <= 0) break
            
            const availableFromThisSource = Math.min(sourceTx.amount, remainingCoins)
            sourceOrders.push({
              transaction_id: sourceTx.id,
              order_id: sourceTx.order_id,
              order_number: sourceTx.order_number,
              amount: availableFromThisSource
            })
            remainingCoins -= availableFromThisSource
          }
          
          // Deduct coins from user's loyalty_points
          await pool.query(`
            UPDATE users 
            SET loyalty_points = loyalty_points - $1
            WHERE id = $2
          `, [coins_used, userId])
          
          // Record coin transaction with source order tracking
          // 1 rupee = 10 coins, so coins value = coins_used / 10 (in rupees)
          await pool.query(`
            INSERT INTO coin_transactions (user_id, amount, type, description, status, order_id, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            userId,
            -coins_used, // Negative amount for deduction
            'redeemed',
            `Used ${coins_used} coins (₹${(coins_used / 10).toFixed(2)}) for order ${order_number}`,
            'completed',
            order.id,
            JSON.stringify({
              source_orders: sourceOrders,
              coins_used: coins_used,
              order_number: order_number
            }),
            new Date()
          ])
          
          console.log(`✅ Deducted ${coins_used} coins from user ${customer_email} for order ${order_number}. Source orders tracked: ${sourceOrders.length}`)
        } else if (userId) {
          console.error(`❌ Insufficient coins for user ${customer_email}. Has ${currentCoins}, tried to use ${coins_used}`)
          // Note: Order already created, but coins weren't deducted. This should be handled by validation on frontend.
        }
      } catch (coinsErr) {
        console.error('Error deducting coins:', coinsErr)
        // Don't fail the order if coins deduction fails - but log it
      }
    }
    
    // Add 5% cashback as Nefol coins for the purchase
    // 1 rupee = 10 coins, so 5% cashback = (total * 0.05) * 10 = total * 0.5 coins
    try {
      // Get user by email
      const userResult = await pool.query('SELECT id, loyalty_points FROM users WHERE email = $1', [customer_email])
      const userId = userResult.rows[0]?.id
      
      if (userId) {
        // Check if cashback was already added for this order (to avoid duplicates)
        const existingCashback = await pool.query(`
          SELECT id FROM coin_transactions 
          WHERE user_id = $1 AND order_id = $2 AND type = 'earned' 
          AND description LIKE '%cashback%'
        `, [userId, order.id])
        
        if (existingCashback.rows.length === 0) {
          // Calculate 5% cashback amount
          const cashbackAmount = total * 0.05
          // Convert cashback to coins (1 rupee = 10 coins)
          const coinsToAdd = Math.floor(cashbackAmount * 10)
          
          if (coinsToAdd > 0) {
            // Add coins to user's loyalty_points
            await pool.query(`
              UPDATE users 
              SET loyalty_points = loyalty_points + $1
              WHERE id = $2
            `, [coinsToAdd, userId])
            
            // Record coin transaction with type 'earned' (not 'cashback' - for consistency)
            await pool.query(`
              INSERT INTO coin_transactions (user_id, amount, type, description, status, order_id, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
              userId,
              coinsToAdd, // Positive amount for earning
              'earned',
              `5% cashback earned: ${coinsToAdd} coins (₹${cashbackAmount.toFixed(2)}) on order ${order_number}`,
              'completed',
              order.id,
              new Date()
            ])
            
            console.log(`✅ Added ${coinsToAdd} coins (₹${cashbackAmount.toFixed(2)} cashback) to user ${customer_email} for order ${order_number}`)
          }
        } else {
          console.log(`ℹ️ Cashback already added for order ${order_number}, skipping`)
        }
      } else {
        console.log(`ℹ️ User not found for email ${customer_email}, skipping cashback`)
      }
    } catch (cashbackErr) {
      console.error('Error adding cashback coins:', cashbackErr)
      // Don't fail the order if cashback fails - but log it
    }
    
    // Broadcast to admin
    broadcastUpdate('order_created', order)
    
    // Track order placement in user activities
    try {
      const { logUserActivity } = require('./utils/userActivitySchema')
      const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [customer_email])
      const userId = userResult.rows.length > 0 ? userResult.rows[0].id : null
      
      await logUserActivity(pool, {
        user_id: userId,
        activity_type: 'order',
        activity_subtype: 'placed',
        order_id: order.id,
        payment_amount: total,
        payment_method: payment_method || 'cod',
        payment_status: 'pending',
        metadata: {
          order_number,
          items_count: items.length,
          affiliate_id: affiliate_id || null,
          customer_name,
          customer_email
        },
        user_agent: req.headers['user-agent'],
        ip_address: req.ip || req.connection.remoteAddress
      })
      
      console.log(`✅ Order activity tracked for user: ${userId || 'guest'}`)
    } catch (trackErr) {
      console.error('❌ Error tracking order placement:', trackErr)
    }
    
    // Create admin notification for new order
    try {
      await createAdminNotification(
        pool,
        'order',
        'New Order Received',
        `Order ${order_number} from ${customer_name} (₹${total.toFixed(2)})`,
        `/admin/orders`,
        '📦',
        'high',
        { order_id: order.id, order_number, customer_name, total }
      )
    } catch (notifErr) {
      console.error('Error creating admin notification:', notifErr)
      // Don't fail the order if notification fails
    }
    
    // Create user notification for order placement
    // Try to get userId from token first, then fallback to email lookup
    let userId: string | number | null = null
    
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (token) {
        const tokenParts = token.split('_')
        if (tokenParts.length >= 3) {
          userId = tokenParts[2]
          console.log(`📬 Creating notification for user from token: ${userId}`)
        }
      }
      
      // If no userId from token, try email lookup
      if (!userId) {
        const userResult = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [customer_email])
        userId = userResult.rows.length > 0 ? userResult.rows[0].id : null
        if (userId) {
          console.log(`📬 Creating notification for user from email lookup: ${userId} (${customer_email})`)
        } else {
          console.log(`⚠️ User not found for email: ${customer_email}, skipping notification`)
        }
      }
      
      if (userId) {
        await createUserNotification(
          pool,
          userId,
          'order_placed',
          'Order Placed Successfully!',
          `Your order ${order_number} has been placed successfully. Total: ₹${total.toFixed(2)}`,
          `/user/orders/${order.id}`,
          '📦',
          'high',
          { order_id: order.id, order_number, total }
        )
        console.log(`✅ User notification created for order ${order_number}, user: ${userId}`)
      } else {
        console.log(`⚠️ No userId found for order ${order_number}, notification not created`)
      }
    } catch (userNotifErr) {
      console.error('❌ Error creating user notification:', userNotifErr)
      // Don't fail the order if notification fails
    }
    
    // Broadcast to the specific user about their order
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (token) {
      const tokenParts = token.split('_')
      if (tokenParts.length >= 3) {
        const userId = tokenParts[2]
        broadcastToUser(userId, 'order-update', {
          type: 'created',
          order: order
        })
      }
    }
    
    // Automatically create Shiprocket shipment if shipping address is complete
    // Creates shipment regardless of payment status (for both paid and unpaid orders)
    if (shipping_address?.address && shipping_address?.city && shipping_address?.pincode) {
      try {
        const { autoCreateShiprocketShipment } = await import('./routes/shiprocket')
        autoCreateShiprocketShipment(pool, order).catch((shiprocketErr: any) => {
        console.error('❌ Error auto-creating Shiprocket shipment:', shiprocketErr)
        // Don't fail the order if Shiprocket fails - just log it
        })
      } catch (importErr: any) {
        console.error('❌ Error importing Shiprocket module:', importErr)
        // Don't fail the order if import fails
      }
    } else {
      console.log(`ℹ️ Skipping auto-shipment creation for order ${order_number} - incomplete shipping address (address: ${!!shipping_address?.address}, city: ${!!shipping_address?.city}, pincode: ${!!shipping_address?.pincode})`)
    }
    
    // Send order confirmation email (async, don't wait)
    // Send to customer
    sendOrderConfirmationEmail(order, false).catch(err => {
      console.error('Failed to send order confirmation email to customer:', err)
    })
    // Also send copy to admin
    sendOrderConfirmationEmail(order, true).catch(err => {
      console.error('Failed to send order confirmation email to admin:', err)
    })
    
    // Send invoice PDF email automatically (async, don't wait)
    sendInvoicePDFEmail(pool, order, req.protocol && req.get('host') ? `${req.protocol}://${req.get('host')}` : 'https://thenefol.com').catch(err => {
      console.error('Failed to send invoice PDF email:', err)
    })
    
    sendSuccess(res, order, 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create order', err)
  }
})

// Order Cancellations
app.post('/api/cancellations/request', authenticateToken, (req, res) => cancellationRoutes.requestCancellation(pool, req, res))
app.post('/api/cancellations/cancel', authenticateToken, (req, res) => cancellationRoutes.cancelOrderImmediate(pool, req, res, io))
app.get('/api/cancellations', authenticateToken, (req, res) => cancellationRoutes.getUserCancellations(pool, req, res))
app.get('/api/cancellations/:id', authenticateToken, (req, res) => cancellationRoutes.getCancellationDetails(pool, req, res))
app.get('/api/cancellations/admin/all', authenticateAndAttach as any, requirePermission(['orders:read']), (req, res) => cancellationRoutes.getAllCancellations(pool, req, res))
app.put('/api/cancellations/:id/approve', authenticateAndAttach as any, requirePermission(['orders:update']), (req, res) => cancellationRoutes.approveCancellation(pool, req, res))
app.put('/api/cancellations/:id/reject', authenticateAndAttach as any, requirePermission(['orders:update']), (req, res) => cancellationRoutes.rejectCancellation(pool, req, res))

// PUT update order by ID
app.put('/api/orders/:id', authenticateAndAttach as any, requirePermission(['orders:update']), async (req, res) => {
  try {
    const { id } = req.params
    const body = req.body || {}
    
    // Extract note separately (not a column in orders table, only stored in history)
    const { note, ...updateFields } = body
    const fields = Object.keys(updateFields).filter(key => updateFields[key] !== undefined)
    
    if (fields.length === 0 && !note) {
      return sendError(res, 400, 'No fields to update')
    }
    
    // Get current order details first to check old status
    const { rows: currentOrderRows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id])
    if (currentOrderRows.length === 0) {
      return sendError(res, 404, 'Order not found')
    }
    const currentOrder = currentOrderRows[0]
    const isCancelling = body.status === 'cancelled' && currentOrder.status !== 'cancelled'
    
    // Handle Shiprocket cancellation if status is being changed to 'cancelled'
    let shiprocketCancelled = false
    if (isCancelling) {
      try {
        const { rows: shipments } = await pool.query(
          'SELECT * FROM shiprocket_shipments WHERE order_id = $1 ORDER BY id DESC LIMIT 1',
          [id]
        )

        if (shipments.length > 0 && shipments[0].shipment_id) {
          // Import Shiprocket functions
          const { getToken } = await import('./routes/shiprocket')
          const token = await getToken(pool)
          
          if (token) {
            const baseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external'
            const cancelResp = await fetch(`${baseUrl}/orders/cancel/shipment/${shipments[0].shipment_id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            })

            if (cancelResp.ok) {
              shiprocketCancelled = true
              console.log(`✅ Order ${currentOrder.order_number} cancelled in Shiprocket by admin`)
            } else {
              const errorData = await cancelResp.json().catch(() => ({}))
              console.error('Failed to cancel in Shiprocket:', errorData)
            }
          }
        }
      } catch (shiprocketErr: any) {
        console.error('Error cancelling in Shiprocket:', shiprocketErr)
        // Continue with cancellation even if Shiprocket fails
      }

      // Create cancellation record if it doesn't exist
      try {
        const { rows: existingCancellation } = await pool.query(
          'SELECT * FROM order_cancellations WHERE order_id = $1 AND status IN ($2, $3)',
          [id, 'pending', 'approved']
        )

        if (existingCancellation.length === 0) {
          const cancellationReason = note || 'Cancelled by admin'
          const refundAmount = parseFloat(currentOrder.total || '0')
          
          await pool.query(
            `INSERT INTO order_cancellations 
            (order_id, order_number, user_id, cancellation_reason, cancellation_type, refund_amount, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              id,
              currentOrder.order_number,
              null, // Admin cancellation, no user_id
              cancellationReason,
              'full',
              refundAmount,
              'approved' // Auto-approve admin cancellations
            ]
          )
        }
      } catch (cancellationErr: any) {
        console.error('Error creating cancellation record:', cancellationErr)
        // Continue even if cancellation record creation fails
      }
    }
    
    // Only update orders table if there are fields to update (excluding note)
    let rows
    if (fields.length > 0) {
      const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ')
      const values = [id, ...fields.map(field => updateFields[field])]
      
      // Ensure columns exist for updates
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT`)
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod BOOLEAN DEFAULT false`)
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tags TEXT[]`)

      const result = await pool.query(
        `UPDATE orders SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        values
      )
      rows = result.rows
    } else {
      rows = currentOrderRows
    }
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Order not found')
    }
    
    // Record status change history (including note)
    try {
      if (Object.prototype.hasOwnProperty.call(body, 'status') || note) {
        await pool.query(
          `CREATE TABLE IF NOT EXISTS order_status_history (
            id SERIAL PRIMARY KEY,
            order_id INT NOT NULL,
            old_status TEXT,
            new_status TEXT NOT NULL,
            note TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          )`
        )
        const newStatus = body.status || rows[0].status
        const oldStatus = rows[0].status === newStatus ? null : rows[0].status
        await pool.query(
          `INSERT INTO order_status_history (order_id, old_status, new_status, note)
           VALUES ($1, $2, $3, $4)`,
          [rows[0].id, oldStatus, newStatus, note || null]
        )
      }
    } catch (e) {
      console.error('Failed to write order status history:', e)
    }

    // Send order status update email and WhatsApp if status changed to shipped/out_for_delivery/delivered
    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const newStatus = body.status?.toLowerCase()
      if (['shipped', 'out_for_delivery', 'delivered'].includes(newStatus)) {
        // For backward compatibility, keep using the generic status update email
        sendOrderStatusUpdateEmail(rows[0]).catch(err => {
          console.error('Failed to send order status update email:', err)
        })

        // Also call more specific shipped/delivered helpers for clearer email copy
        if (newStatus === 'shipped' || newStatus === 'out_for_delivery') {
          sendOrderShippedEmail(rows[0]).catch(err => {
            console.error('Failed to send order shipped email:', err)
          })
        } else if (newStatus === 'delivered') {
          sendOrderDeliveredEmail(rows[0]).catch(err => {
            console.error('Failed to send order delivered email:', err)
          })
        }
        
        // Send WhatsApp notification
        try {
          const { WhatsAppService } = await import('./services/whatsappService')
          const whatsappService = new WhatsAppService(pool)
          
          // Get user phone from order
          const userResult = await pool.query(
            'SELECT name, phone FROM users WHERE id = $1 OR email = $2',
            [rows[0].user_id, rows[0].customer_email]
          )
          
          if (userResult.rows.length > 0 && userResult.rows[0].phone) {
            const user = userResult.rows[0]
            const orderId = rows[0].order_number || rows[0].order_id || rows[0].id.toString()
            const tracking = rows[0].tracking || rows[0].tracking_url || 'N/A'
            
            if (newStatus === 'shipped' || newStatus === 'out_for_delivery') {
              whatsappService.sendOrderShippedWhatsApp(user, orderId, tracking).catch(err => {
                console.error('Failed to send WhatsApp order shipped notification:', err)
              })
            } else if (newStatus === 'delivered') {
              whatsappService.sendOrderDeliveredWhatsApp(user, orderId).catch(err => {
                console.error('Failed to send WhatsApp order delivered notification:', err)
              })
            }
          }
        } catch (waErr: any) {
          console.error('Error sending WhatsApp order notification:', waErr)
        }
      }
    }

    // Broadcast to admin
    broadcastUpdate('order_updated', rows[0])
    
    // Broadcast to users
    broadcastToUsers('order-updated', rows[0])
    
    // Include Shiprocket cancellation status in response if order was cancelled
    const response = { ...rows[0] }
    if (isCancelling) {
      (response as any).shiprocket_cancelled = shiprocketCancelled
    }
    
    sendSuccess(res, response)
  } catch (err) {
    sendError(res, 500, 'Failed to update order', err)
  }
})


// ==================== CUSTOMER SEGMENTS AGGREGATOR ====================

// Dashboard action items endpoint

// Dashboard live visitors endpoint

// ==================== JOURNEY TRACKING API ENDPOINTS ====================
app.get('/api/journey-tracking', async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '7d'
    const eventFilter = req.query.eventFilter || 'all'
    
    // Calculate date filter based on timeRange
    const now = new Date()
    let dateFilter = new Date()
    switch (timeRange) {
      case '1d':
        dateFilter.setDate(dateFilter.getDate() - 1)
        break
      case '7d':
        dateFilter.setDate(dateFilter.getDate() - 7)
        break
      case '30d':
        dateFilter.setDate(dateFilter.getDate() - 30)
        break
      case '90d':
        dateFilter.setDate(dateFilter.getDate() - 90)
        break
      default:
        dateFilter.setDate(dateFilter.getDate() - 7)
    }
    
    // Get all customers with activities in the time range
    const { rows: customerRows } = await pool.query(`
      SELECT DISTINCT u.id, u.name, u.email, u.created_at
      FROM users u
      INNER JOIN user_activities ua ON u.id = ua.user_id
      WHERE ua.created_at >= $1
      UNION
      SELECT DISTINCT u.id, u.name, u.email, u.created_at
      FROM users u
      INNER JOIN orders o ON o.customer_email = u.email
      WHERE o.created_at >= $1
    `, [dateFilter])
    
    const journeys = await Promise.all(customerRows.map(async (customer: any) => {
      // Get all activities for this customer
      let activityQuery = `
        SELECT 
          ua.*,
          ua.created_at as timestamp
        FROM user_activities ua
        WHERE ua.user_id = $1 AND ua.created_at >= $2
      `
      const params: any[] = [customer.id, dateFilter]
      
      if (eventFilter !== 'all') {
        if (eventFilter === 'purchase') {
          activityQuery += ` AND (ua.activity_type = 'order_placed' OR ua.activity_subtype = 'order_placed')`
        } else {
          activityQuery += ` AND ua.activity_type = $${params.length + 1}`
          params.push(eventFilter)
        }
      }
      
      activityQuery += ` ORDER BY ua.created_at DESC`
      
      const { rows: activities } = await pool.query(activityQuery, params).catch(() => ({ rows: [] }))
      
      // Get orders for this customer
      const { rows: orders } = await pool.query(`
        SELECT * FROM orders
        WHERE customer_email = $1 AND created_at >= $2
        ORDER BY created_at DESC
      `, [customer.email, dateFilter]).catch(() => ({ rows: [] }))
      
      // Map activities to journey events
      const events: any[] = activities.map((act: any) => {
        let eventType = act.activity_type
        let eventName = act.activity_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        
        // Map activity types to journey event types
        if (eventType === 'page_view') {
          eventName = 'Page View'
          if (act.page_title) eventName = act.page_title
        } else if (eventType === 'cart' && act.activity_subtype === 'add') {
          eventType = 'add_to_cart'
          eventName = 'Added to Cart'
        } else if (eventType === 'order_placed' || act.activity_subtype === 'order_placed') {
          eventType = 'purchase'
          eventName = 'Order Completed'
        } else if (eventType === 'product_view' || act.product_name) {
          eventType = 'product_view'
          eventName = 'Product Viewed'
        }
        
        return {
          id: `act_${act.id}`,
          customerId: String(customer.id),
          customerName: customer.name,
          eventType,
          eventName,
          timestamp: act.timestamp || act.created_at,
          details: {
            page: act.page_url,
            product: act.product_name,
            value: act.payment_amount || act.product_price,
            source: act.referrer || 'direct',
            device: act.metadata?.device || 'unknown'
          },
          sessionId: act.session_id || 'unknown'
        }
      })
      
      // Add purchase events from orders
      orders.forEach((order: any) => {
        events.push({
          id: `order_${order.id}`,
          customerId: String(customer.id),
          customerName: customer.name,
          eventType: 'purchase',
          eventName: 'Order Completed',
          timestamp: order.created_at,
          details: {
            value: parseFloat(order.total || 0),
            product: `Order #${order.id}`,
            orderId: order.id
          },
          sessionId: 'order'
        })
      })
      
      // Sort events by timestamp
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      
      // Calculate stats
      const firstSeen = events.length > 0 ? events[0].timestamp : customer.created_at
      const lastSeen = events.length > 0 ? events[events.length - 1].timestamp : customer.created_at
      const totalValue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0)
      
      // Determine status
      const daysSinceLastSeen = (new Date().getTime() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24)
      let status: 'active' | 'inactive' | 'at-risk' | 'churned' = 'active'
      if (daysSinceLastSeen > 90) status = 'churned'
      else if (daysSinceLastSeen > 60) status = 'at-risk'
      else if (daysSinceLastSeen > 30) status = 'inactive'
      
      // Calculate touchpoints
      const touchpoints = {
        website: activities.filter((a: any) => a.activity_type === 'page_view').length,
        email: 0, // Can be added if email tracking exists
        sms: 0, // Can be added if SMS tracking exists
        push: 0, // Can be added if push tracking exists
        chat: activities.filter((a: any) => a.activity_type === 'chat' || a.activity_subtype === 'chat').length
      }
      
      return {
        customerId: String(customer.id),
        customerName: customer.name,
        email: customer.email,
        totalEvents: events.length,
        firstSeen,
        lastSeen,
        totalValue,
        status,
        events,
        touchpoints
      }
    }))
    
    sendSuccess(res, journeys)
  } catch (err) {
    console.error('Journey tracking error:', err)
    sendError(res, 500, 'Failed to fetch journey tracking data', err)
  }
})

// moved to routes/communications.ts: forms endpoints

// moved to routes/communications.ts: contact endpoints

// moved to routes/integrations.ts: google & social endpoints

// moved to routes/integrations.ts: settings & themes

// ==================== AI API ENDPOINTS ====================

// AI features
app.get('/api/ai/features', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM ai_features
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch AI features', err)
  }
})

// AI tasks
app.get('/api/ai/tasks', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM ai_tasks
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    // Return empty array if table doesn't exist yet
    sendSuccess(res, [])
  }
})

// ==================== MISSING API ENDPOINTS ====================

// Marketing endpoints
app.get('/api/marketing/campaigns', async (req, res) => {
  try {
    // Return mock data for now
    const campaigns = [
      {
        id: 1,
        name: 'Summer Sale 2024',
        type: 'email',
        status: 'active',
        audience: 'All customers',
        sent: 1250,
        opened: 890,
        clicked: 234,
        converted: 45,
        createdAt: '2024-01-15'
      },
      {
        id: 2,
        name: 'New Product Launch',
        type: 'social',
        status: 'paused',
        audience: 'Premium customers',
        sent: 500,
        opened: 320,
        clicked: 89,
        converted: 12,
        createdAt: '2024-01-10'
      }
    ]
    res.json(campaigns)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch campaigns', err)
  }
})

app.get('/api/marketing/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 1,
        name: 'Welcome Email',
        subject: 'Welcome to Nefol!',
        preview: 'Thank you for joining us...',
        createdAt: '2024-01-01'
      },
      {
        id: 2,
        name: 'Order Confirmation',
        subject: 'Your order has been confirmed',
        preview: 'Thank you for your purchase...',
        createdAt: '2024-01-02'
      }
    ]
    res.json(templates)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch templates', err)
  }
})

// Duplicate endpoint removed - using the one at line 1862 that joins with orders table

// Invoices endpoints
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = [
      {
        id: 1,
        invoice_number: 'INV-001',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        amount: 1299,
        status: 'paid',
        created_at: '2024-01-15T10:30:00Z',
        due_date: '2024-01-22T10:30:00Z'
      },
      {
        id: 2,
        invoice_number: 'INV-002',
        customer_name: 'Jane Smith',
        customer_email: 'jane@example.com',
        amount: 899,
        status: 'pending',
        created_at: '2024-01-16T14:20:00Z',
        due_date: '2024-01-23T14:20:00Z'
      }
    ]
    res.json(invoices)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch invoices', err)
  }
})

// Invoice Settings endpoints
// moved to routes/extended.ts: /api/invoice-settings/company-details

// moved to routes/extended.ts: /api/invoice-settings/company-details (PUT)

// Get all invoice settings
// moved to routes/extended.ts: /api/invoice-settings/all

// Save all invoice settings
// moved to routes/extended.ts: /api/invoice-settings/all (PUT)

// Invoice download endpoint with Arctic Blue gradient
// moved to routes/extended.ts: /api/invoices/:id/download

// Helper function to generate invoice HTML with Arctic Blue gradient
function generateInvoiceHTML(order: any, companyDetails: any, colors: any, taxSettings: any, terms: string, signature: string, currency: string): string {
  try {
    const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]')
    
    // Calculate totals
    let subtotal = 0
    let totalDiscount = 0
    let totalTax = 0
    
    const invoiceItems = items.map((item: any, index: number) => {
    const unitPrice = parseFloat(item.price || item.unitPrice || item.mrp || 0)
    const quantity = parseInt(item.quantity || 1)
    const discount = parseFloat(item.discount || 0)
    
    // Fetch tax rate from CSV product data (GST %)
    const gstFromCSV = item.csvProduct?.['GST %']
    const taxRate = gstFromCSV ? parseFloat(gstFromCSV) : parseFloat(item.taxRate || taxSettings.rate)
    
    const itemSubtotal = unitPrice * quantity
    const itemDiscount = discount
    const taxableAmount = itemSubtotal - itemDiscount
    const itemTax = (taxableAmount * taxRate) / 100
    const itemTotal = taxableAmount + itemTax
    
    subtotal += itemSubtotal
    totalDiscount += itemDiscount
    totalTax += itemTax
    
    // Determine state (simplified - you may want to add actual state logic)
    const isInterState = true // Assume inter-state for IGST
    const gstType = isInterState ? 'IGST' : 'CGST+SGST'
    
    // Get HSN Code from CSV product data if available
    const hsnCode = item.csvProduct?.['HSN Code'] || item.hsn || '-'
    const sku = item.csvProduct?.['SKU'] || item.code || item.sku || item.id || 'N/A'
    const brand = item.csvProduct?.['Brand Name'] || 'NEFOL'
    const netQuantity = item.csvProduct?.['Net Quantity (Content)'] || ''
    const netWeight = item.csvProduct?.['Net Weight (Product Only)'] || ''
    const countryOfOrigin = item.csvProduct?.['Country of Origin'] || ''
    const manufacturer = item.csvProduct?.['Manufacturer / Packer / Importer'] || ''
    
    // Get GST % from CSV if available
    const gstPercent = gstFromCSV || taxRate
    
    // Debug logging for HSN codes
    if (index === 0) {
      console.log('🔍 Invoice Generation Debug:')
      console.log('Product:', item.name || item.productName || item.title)
      console.log('CSV Product data:', item.csvProduct)
      console.log('HSN Code found:', hsnCode)
      console.log('SKU found:', sku)
      console.log('GST % found:', gstPercent)
    }
    
    // Calculate discount percentage
    const discountPercent = itemSubtotal > 0 ? ((itemDiscount / itemSubtotal) * 100).toFixed(0) : 0
    
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${index + 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="margin-bottom: 4px;">
            <strong>${item.name || item.productName || item.title || 'Product'}</strong>
          </div>
          <div style="font-size: 11px; color: #6b7280;">
            Code: ${sku}
          </div>
          ${brand !== 'NEFOL' ? `<div style="font-size: 11px; color: #6b7280;">Brand: ${brand}</div>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px;">
          <strong>${hsnCode}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 14px;">
          <strong>${quantity}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px;">
          <div>${currency}${unitPrice.toFixed(2)}</div>
          ${itemDiscount > 0 ? `<div style="color: #dc2626; font-size: 11px; margin-top: 2px;">Discount: ${discountPercent}% (${currency}${itemDiscount.toFixed(2)})</div>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px;">
          <strong>${currency}${itemTotal.toFixed(2)}</strong>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
            <div>GST ${gstPercent}%: ${currency}${itemTax.toFixed(2)}</div>
            <div style="font-size: 10px; margin-top: 2px;">HSN: ${hsnCode}</div>
          </div>
        </td>
      </tr>
    `
    }).join('')
    
    const finalSubtotal = subtotal - totalDiscount
    const finalTotal = finalSubtotal + totalTax
    
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tax Invoice - ${order.order_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif; 
          background: linear-gradient(135deg, ${colors.primaryStart} 0%, ${colors.primaryEnd} 100%);
          padding: 20px;
        }
        .invoice-container {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 30px;
        }
        .header-section { margin-bottom: 30px; position: relative; }
        .logo-box {
          background: linear-gradient(135deg, ${colors.primaryStart} 0%, ${colors.primaryEnd} 100%);
          color: white;
          padding: 20px;
          width: 120px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
          border-radius: 8px;
        }
        .company-name { font-size: 14px; color: #4a5568; font-weight: 600; margin-bottom: 5px; }
        .phone-bar {
          background: linear-gradient(135deg, ${colors.primaryStart} 0%, ${colors.primaryEnd} 100%);
          color: white;
          padding: 8px 15px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 20px;
        }
        .invoice-title { font-size: 32px; font-weight: bold; color: #4a5568; margin: 20px 0 15px 0; }
        .invoice-details { display: flex; justify-content: space-between; color: #4a5568; margin-bottom: 20px; }
        .billing-info { margin-bottom: 30px; color: #4a5568; }
        .table-container { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; }
        thead tr { background: linear-gradient(135deg, ${colors.primaryStart} 0%, ${colors.primaryEnd} 100%); color: white; }
        th { padding: 12px; text-align: left; }
        tbody td { padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568; }
        tfoot tr { background: linear-gradient(135deg, ${colors.primaryStart} 0%, ${colors.primaryEnd} 100%); color: white; font-weight: bold; }
        .bottom-section { display: flex; justify-content: space-between; gap: 40px; margin-top: 30px; }
        .left-section { flex: 1; }
        .amount-in-words, .terms { margin-bottom: 20px; color: #4a5568; }
        .terms-title { font-size: 16px; color: ${colors.primaryStart}; font-weight: bold; margin-bottom: 5px; }
        .signature { margin-top: 40px; color: #4a5568; }
        .right-section { min-width: 200px; }
        .summary-box {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
        }
        .summary-header {
          padding: 15px;
          background: linear-gradient(135deg, ${colors.primaryStart} 0%, ${colors.primaryEnd} 100%);
          color: white;
          font-weight: bold;
          text-align: center;
        }
        .summary-row {
          padding: 12px 15px;
          border-bottom: 1px solid #e2e8f0;
          color: #4a5568;
        }
        @media print {
          body { background: white; padding: 0; }
          .invoice-container { max-width: 100%; padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header-section">
          <div class="logo-box">LOGO</div>
          <div class="company-name">${companyDetails.companyName || 'NEFOL®'}</div>
          <div class="phone-bar">📞 ${companyDetails.companyPhone || '7355384939'}</div>
          <div class="invoice-title">Tax Invoice</div>
          <div class="invoice-details">
            <div>
              <div style="margin-bottom: 5px;">Invoice No.: <strong>${order.order_number || 'N/A'}</strong></div>
              <div>Date: <strong>${formatDate(order.created_at)}</strong></div>
            </div>
          </div>
        </div>
        
        <!-- Seller and Buyer Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
          <!-- Seller (Company) Details -->
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 2px solid ${colors.primaryStart};">
            <h3 style="color: ${colors.primaryStart}; font-size: 16px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">Seller Details</h3>
            <div style="color: #4a5568; font-size: 14px;">
              <div style="margin-bottom: 5px;"><strong>Company:</strong> ${companyDetails.companyName || 'NEFOL®'}</div>
              ${companyDetails.companyAddress ? `<div style="margin-bottom: 5px;"><strong>Address:</strong><br/>${companyDetails.companyAddress.replace(/\n/g, '<br/>')}</div>` : ''}
              <div style="margin-bottom: 5px;"><strong>Phone:</strong> ${companyDetails.companyPhone || '7355384939'}</div>
              <div style="margin-bottom: 5px;"><strong>Email:</strong> ${companyDetails.companyEmail || 'info@nefol.com'}</div>
              ${companyDetails.gstNumber ? `<div style="margin-bottom: 5px;"><strong>GST No:</strong> ${companyDetails.gstNumber}</div>` : ''}
              ${companyDetails.panNumber ? `<div><strong>PAN No:</strong> ${companyDetails.panNumber}</div>` : ''}
            </div>
          </div>
          
          <!-- Buyer (Customer) Details -->
          <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; border: 2px solid ${colors.primaryEnd};">
            <h3 style="color: ${colors.primaryEnd}; font-size: 16px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">Buyer Details</h3>
            <div style="color: #4a5568; font-size: 14px;">
              ${order.shipping_address?.firstName || order.shipping_address?.first_name ? 
                `<div style="margin-bottom: 5px;"><strong>First Name:</strong> ${order.shipping_address.firstName || order.shipping_address.first_name || ''}</div>
                 <div style="margin-bottom: 5px;"><strong>Last Name:</strong> ${order.shipping_address.lastName || order.shipping_address.last_name || ''}</div>` :
                `<div style="margin-bottom: 5px;"><strong>Name:</strong> ${order.customer_name || 'Customer Name'}</div>`
              }
              ${order.shipping_address?.company ? `<div style="margin-bottom: 5px;"><strong>Company:</strong> ${order.shipping_address.company}</div>` : ''}
              <div style="margin-bottom: 5px;"><strong>Email:</strong> ${order.customer_email || 'N/A'}</div>
              <div style="margin-bottom: 5px;"><strong>Phone:</strong> ${order.shipping_address?.phone || order.customer_phone || 'N/A'}</div>
              <div style="margin-bottom: 10px;"><strong>Shipping Address:</strong><br/>
                ${order.shipping_address ? 
                  (typeof order.shipping_address === 'string' ? order.shipping_address : 
                   `${order.shipping_address.address || order.shipping_address.street || ''}<br/>
                    ${order.shipping_address.apartment ? order.shipping_address.apartment + '<br/>' : ''}
                    ${order.shipping_address.city || ''}, ${order.shipping_address.state || ''} ${order.shipping_address.zip || ''}<br/>
                    ${order.shipping_address.country || 'India'}`) 
                  : 'N/A'}
              </div>
              ${order.billing_address ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #d1d5db;"><strong>Billing Address:</strong><br/>
                  ${typeof order.billing_address === 'string' ? order.billing_address : 
                    `${order.billing_address.firstName || order.billing_address.first_name ? (order.billing_address.firstName || order.billing_address.first_name) + ' ' + (order.billing_address.lastName || order.billing_address.last_name || '') + '<br/>' : ''}
                     ${order.billing_address.company ? order.billing_address.company + '<br/>' : ''}
                     ${order.billing_address.address || order.billing_address.street || ''}<br/>
                     ${order.billing_address.apartment ? order.billing_address.apartment + '<br/>' : ''}
                     ${order.billing_address.city || ''}, ${order.billing_address.state || ''} ${order.billing_address.zip || ''}<br/>
                     ${order.billing_address.country || 'India'}`}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="text-align: center; padding: 12px;">S.No.</th>
                <th style="padding: 12px;">Product Name & Code</th>
                <th style="text-align: center; padding: 12px;">HSN/SAC</th>
                <th style="text-align: center; padding: 12px;">Qty</th>
                <th style="text-align: right; padding: 12px;">Price & Discount</th>
                <th style="text-align: right; padding: 12px;">Amount with Tax</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceItems}
            </tbody>
            <tfoot>
              <tr style="border-top: 2px solid ${colors.primaryStart};">
                <td colspan="4" style="text-align: right; padding: 12px;"><strong>Subtotal:</strong></td>
                <td colspan="2" style="text-align: right; padding: 12px;">${currency}${subtotal.toFixed(2)}</td>
              </tr>
              ${totalDiscount > 0 ? `<tr>
                <td colspan="4" style="text-align: right; padding: 12px;"><strong>Discount:</strong></td>
                <td colspan="2" style="text-align: right; padding: 12px;">-${currency}${totalDiscount.toFixed(2)}</td>
              </tr>` : ''}
              <tr>
                <td colspan="4" style="text-align: right; padding: 12px;"><strong>${taxSettings.type} (${taxSettings.rate}%):</strong></td>
                <td colspan="2" style="text-align: right; padding: 12px;">${currency}${totalTax.toFixed(2)}</td>
              </tr>
              <tr style="background: linear-gradient(135deg, ${colors.primaryStart} 0%, ${colors.primaryEnd} 100%); color: white; font-weight: bold;">
                <td colspan="4" style="text-align: right; padding: 12px;"><strong>Total Amount:</strong></td>
                <td colspan="2" style="text-align: right; padding: 12px;">${currency}${finalTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div class="bottom-section">
          <div class="left-section">
            <div class="amount-in-words">
              <div style="font-weight: 600; margin-bottom: 5px;">Invoice Amount In Words</div>
              <div>Five Hundred Rupees only</div>
            </div>
            <div class="terms">
              <div class="terms-title">Terms And Conditions</div>
              <div>${terms}</div>
            </div>
            <div class="signature">
              <div style="margin-bottom: 30px;">For: ${companyDetails.companyName || 'NEFOL®'}</div>
              <div>${signature}</div>
            </div>
          </div>
          
          <div class="right-section">
            <div class="summary-box">
              <div class="summary-header">Payment Summary</div>
              
              <div class="summary-row" style="background: white;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Subtotal:</span>
                  <span>${currency}${subtotal.toFixed(2)}</span>
                </div>
              </div>
              
              ${totalDiscount > 0 ? `<div class="summary-row" style="background: white;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Discount:</span>
                  <span>-${currency}${totalDiscount.toFixed(2)}</span>
                </div>
              </div>` : ''}
              
              <div class="summary-row" style="background: white;">
                <div style="display: flex; justify-content: space-between;">
                  <span>${taxSettings.type} (${taxSettings.rate}%):</span>
                  <span>${currency}${totalTax.toFixed(2)}</span>
                </div>
              </div>
              
              <div class="summary-row" style="background: ${colors.primaryStart}; color: white; font-size: 18px; font-weight: bold; border-bottom: none;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Grand Total:</span>
                  <span>${currency}${finalTotal.toFixed(2)}</span>
                </div>
              </div>
              
              <div class="summary-row" style="border-top: 2px solid ${colors.primaryStart};">
                <div style="display: flex; justify-content: space-between;">
                  <strong>Received:</strong>
                  <span>${currency}0.00</span>
                </div>
              </div>
              
              <div class="summary-row" style="border-bottom: none;">
                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                  <strong>Balance:</strong>
                  <span>${currency}${finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
  } catch (error) {
    console.error('Error generating invoice HTML:', error)
    return `
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body>
        <h1>Invoice Generation Error</h1>
        <p>Failed to generate invoice. Please try again.</p>
        <p>Error: ${error}</p>
      </body>
      </html>
    `
  }
}

// (removed duplicate mock loyalty-program route)

// Analytics endpoints
app.get('/api/analytics', async (req, res) => {
  try {
    const { range = '30d' } = req.query
    const analytics = {
      total_orders: 1250,
      total_revenue: 125000,
      total_customers: 850,
      conversion_rate: 3.2,
      average_order_value: 100,
      top_products: [
        { name: 'Product A', sales: 150 },
        { name: 'Product B', sales: 120 },
        { name: 'Product C', sales: 100 }
      ],
      revenue_by_day: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 5000) + 1000
      }))
    }
    res.json(analytics)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch analytics', err)
  }
})

// Returns endpoints
app.get('/api/returns', async (req, res) => {
  try {
    const returns = [
      {
        id: 1,
        order_id: 'ORD-001',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        product_name: 'Product A',
        reason: 'Defective item',
        status: 'approved',
        amount: 1299,
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        id: 2,
        order_id: 'ORD-002',
        customer_name: 'Jane Smith',
        customer_email: 'jane@example.com',
        product_name: 'Product B',
        reason: 'Wrong size',
        status: 'pending',
        amount: 899,
        created_at: '2024-01-16T14:20:00Z'
      }
    ]
    res.json(returns)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch returns', err)
  }
})

// AI endpoints
app.get('/api/ai/features', async (req, res) => {
  try {
    const features = [
      { id: 1, name: 'Product Recommendations', status: 'active', usage: 85 },
      { id: 2, name: 'Chat Support', status: 'active', usage: 92 },
      { id: 3, name: 'Price Optimization', status: 'beta', usage: 45 }
    ]
    res.json(features)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch AI features', err)
  }
})

app.get('/api/ai/tasks', async (req, res) => {
  try {
    const tasks = [
      { id: 1, name: 'Process customer feedback', status: 'completed', priority: 'high' },
      { id: 2, name: 'Generate product descriptions', status: 'in_progress', priority: 'medium' },
      { id: 3, name: 'Optimize inventory', status: 'pending', priority: 'low' }
    ]
    res.json(tasks)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch AI tasks', err)
  }
})

// --- Cart & Checkout admin endpoints for CartCheckoutManagement page ---

// Helper to safely parse price text (e.g., "₹1,234.00") to number
function parsePriceText(value: any): number {
  if (value === null || value === undefined) return 0
  const cleaned = String(value).replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return Number.isFinite(num) ? num : 0
}

// Admin: Get all cart items with user & product details
app.get('/api/admin/cart/items', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        c.id,
        c.user_id,
        u.name AS user_name,
        u.email AS user_email,
        c.product_id,
        p.title AS product_name,
        p.list_image AS product_image,
        c.quantity,
        COALESCE(p.price, '0') AS price_text,
        c.created_at AS added_at,
        c.updated_at
      FROM cart c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN products p ON c.product_id = p.id
      ORDER BY c.created_at DESC
    `)

    const items = rows.map((row) => {
      const unitPrice = parsePriceText(row.price_text)
      const quantity = row.quantity || 1
      const totalPrice = unitPrice * quantity

      return {
        id: row.id,
        user_id: row.user_id,
        user_name: row.user_name || 'Guest',
        user_email: row.user_email || '',
        product_id: row.product_id,
        product_name: row.product_name || 'Product',
        product_image: row.product_image || '',
        quantity,
        price: unitPrice,
        total_price: totalPrice,
        added_at: row.added_at,
        updated_at: row.updated_at,
      }
    })

    sendSuccess(res, { items })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch cart items', err)
  }
})

// Admin: Update cart item quantity
app.put('/api/admin/cart/items/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { quantity } = req.body || {}

    const qty = Math.max(1, parseInt(quantity, 10) || 1)

    const result = await pool.query(
      'UPDATE cart SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [qty, id]
    )

    if (result.rowCount === 0) {
      return sendError(res, 404, 'Cart item not found')
    }

    sendSuccess(res, result.rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to update cart item', err)
  }
})

// Admin: Remove cart item
app.delete('/api/admin/cart/items/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM cart WHERE id = $1', [id])

    if (result.rowCount === 0) {
      return sendError(res, 404, 'Cart item not found')
    }

    sendSuccess(res, { success: true })
  } catch (err) {
    sendError(res, 500, 'Failed to remove cart item', err)
  }
})

// Map order.status to CheckoutSession status
function mapOrderStatusToSessionStatus(status: string | null | undefined): 'pending' | 'completed' | 'abandoned' | 'expired' {
  const s = (status || '').toLowerCase()
  if (s === 'delivered' || s === 'completed') return 'completed'
  if (s === 'cancelled' || s === 'failed') return 'abandoned'
  if (s === 'expired') return 'expired'
  return 'pending'
}

// Admin: Get checkout sessions (derived from orders table)
app.get('/api/admin/checkout/sessions', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        o.id,
        o.user_id,
        u.name AS user_name,
        u.email AS user_email,
        o.order_number,
        o.total,
        o.items,
        o.status,
        o.created_at,
        o.updated_at,
        o.payment_method,
        o.shipping_address
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `)

    const sessions = rows.map((row) => {
      const itemsArray = Array.isArray(row.items) ? row.items : []
      const totalAmount = parsePriceText(row.total)

      return {
        id: row.id,
        user_id: row.user_id,
        user_name: row.user_name || 'Guest',
        user_email: row.user_email || '',
        session_id: row.order_number,
        status: mapOrderStatusToSessionStatus(row.status),
        total_amount: totalAmount,
        items_count: itemsArray.length,
        created_at: row.created_at,
        updated_at: row.updated_at,
        payment_method: row.payment_method || '',
        shipping_address: row.shipping_address ? JSON.stringify(row.shipping_address) : '',
      }
    })

    sendSuccess(res, { sessions })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch checkout sessions', err)
  }
})

// Admin: Update checkout session status (writes back to orders.status)
app.put('/api/admin/checkout/sessions/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body || {}

    if (!status) {
      return sendError(res, 400, 'Status is required')
    }

    // Write status directly to orders.status; front-end maps this back
    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    )

    if (result.rowCount === 0) {
      return sendError(res, 404, 'Checkout session / order not found')
    }

    sendSuccess(res, result.rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to update checkout session status', err)
  }
})

// Tax endpoints
app.get('/api/tax-rates', async (req, res) => {
  try {
    const taxRates = [
      { id: 1, name: 'GST', rate: 18, type: 'percentage', status: 'active' },
      { id: 2, name: 'CGST', rate: 9, type: 'percentage', status: 'active' },
      { id: 3, name: 'SGST', rate: 9, type: 'percentage', status: 'active' }
    ]
    res.json(taxRates)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch tax rates', err)
  }
})

// Update product GST rate
app.patch('/api/products/:id/gst', async (req, res) => {
  try {
    const { id } = req.params
    const { gstRate } = req.body
    
    if (gstRate === undefined || gstRate === null) {
      return sendError(res, 400, 'GST rate is required')
    }
    
    // Validate GST rate (should be between 0 and 100 for percentage)
    const rate = parseFloat(gstRate)
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return sendError(res, 400, 'GST rate must be between 0 and 100')
    }
    
    // Get current product details
    const { rows: productRows } = await pool.query('SELECT details FROM products WHERE id = $1', [id])
    
    if (productRows.length === 0) {
      return sendError(res, 404, 'Product not found')
    }
    
    // Update details JSONB field to include GST rate
    const currentDetails = productRows[0].details || {}
    const updatedDetails = {
      ...currentDetails,
      gst: rate.toString(),
      gstPercent: rate.toString(),
      'GST %': rate.toString()
    }
    
    // Update product with new GST rate
    const { rows } = await pool.query(
      'UPDATE products SET details = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(updatedDetails), id]
    )
    
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to update product GST rate', err)
  }
})

// Bulk update product GST rates
app.post('/api/products/bulk-update-gst', async (req, res) => {
  try {
    const { updates } = req.body // Array of { productId, gstRate }
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return sendError(res, 400, 'Updates array is required')
    }
    
    const results = []
    
    for (const update of updates) {
      const { productId, gstRate } = update
      
      if (!productId || gstRate === undefined || gstRate === null) {
        results.push({ productId, success: false, error: 'Missing productId or gstRate' })
        continue
      }
      
      const rate = parseFloat(gstRate)
      if (isNaN(rate) || rate < 0 || rate > 100) {
        results.push({ productId, success: false, error: 'Invalid GST rate' })
        continue
      }
      
      try {
        // Get current product details
        const { rows: productRows } = await pool.query('SELECT details FROM products WHERE id = $1', [productId])
        
        if (productRows.length === 0) {
          results.push({ productId, success: false, error: 'Product not found' })
          continue
        }
        
        const currentDetails = productRows[0].details || {}
        const updatedDetails = {
          ...currentDetails,
          gst: rate.toString(),
          gstPercent: rate.toString(),
          'GST %': rate.toString()
        }
        
        await pool.query(
          'UPDATE products SET details = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(updatedDetails), productId]
        )
        
        results.push({ productId, success: true })
      } catch (err: any) {
        results.push({ productId, success: false, error: err.message })
      }
    }
    
    sendSuccess(res, { results, updated: results.filter(r => r.success).length })
  } catch (err) {
    sendError(res, 500, 'Failed to bulk update product GST rates', err)
  }
})

app.get('/api/tax-report', async (req, res) => {
  try {
    const report = {
      total_tax_collected: 22500,
      gst_collected: 18000,
      cgst_collected: 9000,
      sgst_collected: 9000,
      monthly_breakdown: Array.from({ length: 12 }, (_, i) => ({
        month: new Date(2024, i).toLocaleString('default', { month: 'short' }),
        tax_collected: Math.floor(Math.random() * 3000) + 1000
      }))
    }
    res.json(report)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch tax report', err)
  }
})

// Payment endpoints
app.get('/api/payment-methods', async (req, res) => {
  try {
    const methods = [
      { id: 1, name: 'Credit Card', status: 'active', fee: 2.5 },
      { id: 2, name: 'Debit Card', status: 'active', fee: 1.5 },
      { id: 3, name: 'UPI', status: 'active', fee: 0.5 },
      { id: 4, name: 'Net Banking', status: 'active', fee: 1.0 }
    ]
    res.json(methods)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch payment methods', err)
  }
})

app.get('/api/payment-transactions', async (req, res) => {
  try {
    const transactions = [
      {
        id: 1,
        order_id: 'ORD-001',
        amount: 1299,
        method: 'Credit Card',
        status: 'success',
        transaction_id: 'TXN-001',
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        id: 2,
        order_id: 'ORD-002',
        amount: 899,
        method: 'UPI',
        status: 'success',
        transaction_id: 'TXN-002',
        created_at: '2024-01-16T14:20:00Z'
      }
    ]
    res.json(transactions)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch payment transactions', err)
  }
})

app.get('/api/payment-report', async (req, res) => {
  try {
    const report = {
      total_transactions: 1250,
      total_amount: 125000,
      success_rate: 98.5,
      average_transaction_value: 100,
      method_breakdown: [
        { method: 'Credit Card', count: 500, amount: 50000 },
        { method: 'UPI', count: 400, amount: 40000 },
        { method: 'Debit Card', count: 200, amount: 20000 },
        { method: 'Net Banking', count: 150, amount: 15000 }
      ]
    }
    res.json(report)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch payment report', err)
  }
})

// Auth verification endpoint
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    // If we reach here, the token is valid
    res.json({ 
      valid: true, 
      userId: req.userId,
      message: 'Token is valid' 
    })
  } catch (err) {
    sendError(res, 500, 'Failed to verify token', err)
  }
})

// ==================== ADMIN NOTIFICATIONS API ====================
// Helper function to create admin notification
async function createAdminNotification(
  pool: Pool,
  type: string,
  title: string,
  message: string,
  link?: string,
  icon?: string,
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  metadata?: any,
  userId?: string | number
) {
  try {
    const { rows } = await pool.query(`
      INSERT INTO admin_notifications (user_id, notification_type, title, message, link, icon, priority, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [userId || null, type, title, message, link || null, icon || null, priority, metadata ? JSON.stringify(metadata) : '{}'])
    
    // Emit real-time notification to admin panel
    io.to('admin-panel').emit('new-notification', rows[0])
    
    return rows[0]
  } catch (err) {
    console.error('Error creating admin notification:', err)
    throw err
  }
}

// ==================== USER NOTIFICATIONS API ====================
// Helper function to create user notification
async function createUserNotification(
  pool: Pool,
  userId: string | number,
  type: string,
  title: string,
  message: string,
  link?: string,
  icon?: string,
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  metadata?: any
) {
  try {
    if (!userId) {
      console.log('⚠️ Skipping user notification: no user_id provided')
      return null
    }

    console.log(`📝 Attempting to create user notification for userId: ${userId}, type: ${type}`)
    
    // Ensure user_notifications table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id serial primary key,
        user_id integer references users(id) on delete cascade,
        notification_type text not null,
        title text not null,
        message text not null,
        link text,
        icon text,
        priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
        status text default 'unread' check (status in ('unread', 'read', 'archived')),
        metadata jsonb default '{}'::jsonb,
        read_at timestamptz,
        created_at timestamptz default now()
      )
    `)

    const { rows } = await pool.query(`
      INSERT INTO user_notifications (user_id, notification_type, title, message, link, icon, priority, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [userId, type, title, message, link || null, icon || null, priority, metadata ? JSON.stringify(metadata) : '{}'])
    
    console.log(`✅ User notification created successfully: ID ${rows[0].id} for user ${userId}`)
    
    // Emit real-time notification to user
    try {
      broadcastToUser(userId.toString(), 'notification', rows[0])
      console.log(`📡 Real-time notification broadcasted to user ${userId}`)
    } catch (broadcastErr) {
      console.error('⚠️ Error broadcasting notification (non-critical):', broadcastErr)
      // Don't fail if broadcast fails
    }
    
    return rows[0]
  } catch (err: any) {
    console.error('❌ Error creating user notification:', err)
    console.error('Error details:', {
      userId,
      type,
      title,
      message: message.substring(0, 50) + '...',
      error: err.message,
      stack: err.stack
    })
    // Don't throw - let the caller handle it
    return null
  }
}

// Get all admin notifications
// moved to routes/extended.ts: /api/admin/notifications

// Get unread notification count
// moved to routes/extended.ts: /api/admin/notifications/unread-count

// Mark notification as read
// moved to routes/extended.ts: /api/admin/notifications/:id/read

// Mark all notifications as read
// moved to routes/extended.ts: /api/admin/notifications/read-all

// Delete notification
// moved to routes/extended.ts: /api/admin/notifications/:id (DELETE)

// ==================== USER NOTIFICATIONS API ====================
// Get user notifications
app.get('/api/user/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) {
      return sendError(res, 401, 'Unauthorized')
    }

    const { status = 'all', limit = 50 } = req.query as any
    const query = status !== 'all' 
      ? `SELECT * FROM user_notifications WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3`
      : `SELECT * FROM user_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`
    
    const params = status !== 'all' ? [userId, status, limit] : [userId, limit]
    const { rows } = await pool.query(query, params)
    
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch notifications', err)
  }
})

// Get unread notification count
app.get('/api/user/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) {
      return sendError(res, 401, 'Unauthorized')
    }

    const { rows } = await pool.query(
      `SELECT COUNT(*) as count FROM user_notifications WHERE user_id = $1 AND status = 'unread'`,
      [userId]
    )
    sendSuccess(res, { count: parseInt(rows[0].count) })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch unread count', err)
  }
})

// Mark notification as read
app.put('/api/user/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId
    const { id } = req.params
    
    if (!userId) {
      return sendError(res, 401, 'Unauthorized')
    }

    // Verify notification belongs to user
    const { rows } = await pool.query(
      `UPDATE user_notifications 
       SET status = 'read', read_at = now() 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, userId]
    )
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Notification not found')
    }
    
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to mark notification as read', err)
  }
})

// Mark all notifications as read
app.put('/api/user/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) {
      return sendError(res, 401, 'Unauthorized')
    }

    await pool.query(
      `UPDATE user_notifications 
       SET status = 'read', read_at = now() 
       WHERE user_id = $1 AND status = 'unread'`,
      [userId]
    )
    
    sendSuccess(res, { message: 'All notifications marked as read' })
  } catch (err) {
    sendError(res, 500, 'Failed to mark all notifications as read', err)
  }
})

// Delete notification
app.delete('/api/user/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId
    const { id } = req.params
    
    if (!userId) {
      return sendError(res, 401, 'Unauthorized')
    }

    const { rows } = await pool.query(
      `DELETE FROM user_notifications WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    )
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Notification not found')
    }
    
    sendSuccess(res, { message: 'Notification deleted' })
  } catch (err) {
    sendError(res, 500, 'Failed to delete notification', err)
  }
})

// moved to routes/liveChat.ts

// Start server
const port = Number(process.env.PORT || 2000)
ensureSchema(pool)
  .then(async () => {
    // Initialize user activity tracking tables
    await createUserActivityTables(pool)
    console.log('✅ User activity tracking initialized')
    
    // Seed CMS content
    await seedCMSContent(pool)
    
    // Update all products with pricing data
    await updateAllProductsWithPricing(pool)
    
    // Sample products removed - no longer adding sample products on startup
    
    const host = process.env.HOST || '0.0.0.0' // Listen on all network interfaces
    // Start cart abandonment cron job
    startCartAbandonmentCron(pool)
    startCartEmailSchedulerCron(pool)

    server.listen(port, host, () => {
      console.log(`🚀 Nefol API running on http://${host}:${port}`)
      console.log(`📡 WebSocket server ready for real-time updates`)
      const backendHost = process.env.BACKEND_HOST || 'thenefol.com'
      console.log(`🌐 Accessible from network: http://${backendHost}:${port}`)
      console.log(`✅ All routes optimized and centralized`)
      console.log(`🔧 CSV path fixed: ../product description page.csv`)
      console.log(`🌱 CMS content initialized`)
      console.log(`💰 All products updated with MRP and discounted pricing`)
    })
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
  })

let fbSyncLastRun: null | { time: number; result: any } = null

// Schedule Facebook stock/price sync hourly
cron.schedule('0 * * * *', async () => {
  try {
    console.log('[FB] Starting scheduled stock/price sync')
    const result = await facebookRoutes.syncStockPrice(pool, { body: {}, query: {} } as any, {
      json(data: any) { return data },
      status(_s: any) { return this },
      send(_d: any) { }, // dummy
      setHeader(..._args: any[]) { }
    } as any)
    fbSyncLastRun = { time: Date.now(), result }
    console.log('[FB] Stock/price sync complete')
  } catch (err) {
    fbSyncLastRun = { time: Date.now(), result: { error: (err as any)?.message || 'Failed' } }
    console.error('[FB] Scheduled sync failed:', err)
  }
})

app.get('/api/facebook/sync/last', (req, res) => {
  res.json({ lastRun: fbSyncLastRun?.time ? new Date(fbSyncLastRun.time).toISOString() : null, result: fbSyncLastRun?.result })
})

// ... existing code ...
cron.schedule('*/30 * * * *', async () => {
  try {
    const { rows } = await pool.query(`select pv.id as variant_id, pv.product_id, pv.sku, i.quantity, i.reserved, i.low_stock_threshold from product_variants pv join inventory i on i.variant_id = pv.id where (i.quantity - i.reserved) <= coalesce(i.low_stock_threshold, 0) order by (i.quantity - i.reserved) asc limit 20`)
    if (rows.length > 0) {
      const lines = rows.map((r: any)=>`${r.sku || r.variant_id}: qty=${r.quantity - r.reserved} (threshold=${r.low_stock_threshold||0})`).join('\n')
      try { await notificationRoutes.sendAlert(pool as any, { subject: 'Low Stock Alert', text: `Low stock detected for ${rows.length} variants:\n${lines}` }) } catch {}
    }
  } catch (err) {
    console.error('Low stock check failed', err)
  }
})

// Process scheduled WhatsApp messages every minute
cron.schedule('* * * * *', async () => {
  try {
    const result = await processScheduledWhatsAppMessages(pool)
    if (result.processed > 0) {
      console.log(`📅 Processed ${result.processed} scheduled WhatsApp messages: ${result.success} sent, ${result.failed} failed`)
    }
  } catch (err) {
    console.error('Scheduled WhatsApp messages processing failed', err)
  }
})
// ... existing code ...