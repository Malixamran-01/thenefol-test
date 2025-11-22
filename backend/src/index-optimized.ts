// Optimized main server file with centralized routes and utilities
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Pool } from 'pg'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { createRoutes, createCRUDRoutes } from './routes'
import { ensureSchema } from './utils/schema'

const app = express()
app.use(express.json())

const clientOrigin = process.env.CLIENT_ORIGIN || 'https://thenefol.com'
app.use(cors({ origin: (_origin, cb) => cb(null, true), credentials: true }))

// Create HTTP server and Socket.IO
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: (_origin, cb) => cb(null, true),
    methods: ['GET', 'POST']
  }
})

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol'
const pool = new Pool({ connectionString })

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

// File upload configuration
const upload = multer({ dest: 'uploads/' })

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads')
}

// Helper function to broadcast updates
function broadcastUpdate(type: string, data: any) {
  io.to('admin-panel').emit('update', { type, data })
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  
  socket.on('join-admin', () => {
    socket.join('admin-panel')
    console.log('Admin panel joined:', socket.id)
  })
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// ==================== MAIN ROUTES ====================
const mainRoutes = createRoutes(pool)
app.use(mainRoutes)

// ==================== GENERIC CRUD ROUTES ====================
// These replace the duplicate code patterns found in the original file

// Videos CRUD
const videoRoutes = createCRUDRoutes(pool, 'videos', ['title', 'description', 'video_url', 'redirect_url', 'price', 'size', 'thumbnail_url'])
app.use(videoRoutes)

// Users CRUD (admin only)
const userRoutes = createCRUDRoutes(pool, 'users', ['name', 'email', 'password'])
app.use(userRoutes)

// Marketing CRUD routes
const emailRoutes = createCRUDRoutes(pool, 'email_campaigns', ['name', 'subject'])
app.use(emailRoutes)

const smsRoutes = createCRUDRoutes(pool, 'sms_campaigns', ['name', 'message'])
app.use(smsRoutes)

const pushRoutes = createCRUDRoutes(pool, 'push_notifications', ['title', 'message'])
app.use(pushRoutes)

const whatsappRoutes = createCRUDRoutes(pool, 'whatsapp_chat', ['phone_number'])
app.use(whatsappRoutes)

const liveChatRoutes = createCRUDRoutes(pool, 'live_chat', ['customer_name'])
app.use(liveChatRoutes)

// Analytics CRUD routes
const analyticsRoutes = createCRUDRoutes(pool, 'analytics_data', ['metric_name'])
app.use(analyticsRoutes)

const formRoutes = createCRUDRoutes(pool, 'forms', ['name'])
app.use(formRoutes)

const workflowRoutes = createCRUDRoutes(pool, 'workflows', ['name'])
app.use(workflowRoutes)

const segmentRoutes = createCRUDRoutes(pool, 'customer_segments', ['name'])
app.use(segmentRoutes)

const journeyRoutes = createCRUDRoutes(pool, 'customer_journeys', ['customer_id', 'journey_step'])
app.use(journeyRoutes)

const insightRoutes = createCRUDRoutes(pool, 'actionable_insights', ['insight_type'])
app.use(insightRoutes)

const aiRoutes = createCRUDRoutes(pool, 'ai_features', ['feature_name'])
app.use(aiRoutes)

const funnelRoutes = createCRUDRoutes(pool, 'journey_funnels', ['funnel_name'])
app.use(funnelRoutes)

const personalizationRoutes = createCRUDRoutes(pool, 'personalization_rules', ['rule_name'])
app.use(personalizationRoutes)

const audienceRoutes = createCRUDRoutes(pool, 'custom_audiences', ['audience_name'])
app.use(audienceRoutes)

const omniRoutes = createCRUDRoutes(pool, 'omni_channel_campaigns', ['campaign_name'])
app.use(omniRoutes)

const apiConfigRoutes = createCRUDRoutes(pool, 'api_configurations', ['name', 'category'])
app.use(apiConfigRoutes)

// Finance CRUD routes
const invoiceRoutes = createCRUDRoutes(pool, 'invoices', ['invoice_number', 'customer_name', 'customer_email', 'order_id', 'amount', 'due_date'])
app.use(invoiceRoutes)

const taxRateRoutes = createCRUDRoutes(pool, 'tax_rates', ['name', 'rate', 'type', 'region'])
app.use(taxRateRoutes)

const taxRuleRoutes = createCRUDRoutes(pool, 'tax_rules', ['name', 'conditions', 'tax_rate_ids'])
app.use(taxRuleRoutes)

const returnRoutes = createCRUDRoutes(pool, 'returns', ['return_number', 'order_id', 'customer_name', 'customer_email', 'reason', 'total_amount', 'refund_amount'])
app.use(returnRoutes)

const paymentMethodRoutes = createCRUDRoutes(pool, 'payment_methods', ['name', 'type'])
app.use(paymentMethodRoutes)

const paymentGatewayRoutes = createCRUDRoutes(pool, 'payment_gateways', ['name', 'type', 'api_key', 'secret_key', 'webhook_url'])
app.use(paymentGatewayRoutes)

const paymentTransactionRoutes = createCRUDRoutes(pool, 'payment_transactions', ['transaction_id', 'order_id', 'customer_name', 'amount', 'method', 'gateway'])
app.use(paymentTransactionRoutes)

// Loyalty and Marketing CRUD routes
const loyaltyRoutes = createCRUDRoutes(pool, 'loyalty_program', ['name'])
app.use(loyaltyRoutes)

const affiliateRoutes = createCRUDRoutes(pool, 'affiliate_program', ['name'])
app.use(affiliateRoutes)

const cashbackRoutes = createCRUDRoutes(pool, 'cashback_system', ['name'])
app.use(cashbackRoutes)

// Shipping and Delivery CRUD routes
const deliveryStatusRoutes = createCRUDRoutes(pool, 'order_delivery_status', ['order_id', 'status'])
app.use(deliveryStatusRoutes)

const reviewRoutes = createCRUDRoutes(pool, 'product_reviews', ['order_id', 'product_id', 'customer_email', 'customer_name', 'rating'])
app.use(reviewRoutes)

const notificationRoutes = createCRUDRoutes(pool, 'delivery_notifications', ['order_id', 'customer_email', 'notification_type'])
app.use(notificationRoutes)

const shiprocketConfigRoutes = createCRUDRoutes(pool, 'shiprocket_config', ['api_key', 'api_secret'])
app.use(shiprocketConfigRoutes)

const shipmentRoutes = createCRUDRoutes(pool, 'shiprocket_shipments', ['order_id'])
app.use(shipmentRoutes)

// Discounts CRUD routes
const discountRoutes = createCRUDRoutes(pool, 'discounts', ['name', 'code', 'type', 'value'])
app.use(discountRoutes)

const discountUsageRoutes = createCRUDRoutes(pool, 'discount_usage', ['discount_id', 'order_id', 'customer_email'])
app.use(discountUsageRoutes)

// ==================== SPECIALIZED ENDPOINTS ====================
// These require custom logic beyond basic CRUD

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) return res.status(400).json({ error: 'No file uploaded' })
    const url = `/uploads/${file.filename}`
    res.json({ url, filename: file.filename })
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload file' })
  }
})

// CSV upload endpoint (FIXED PATH)
app.post('/api/products-csv/upload', upload.single('file'), async (req, res) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) return res.status(400).json({ error: 'No file uploaded' })
    
    // FIXED: Correct path to CSV file
    const destPath = path.resolve(process.cwd(), '..', '..', 'product description page.csv')
    fs.copyFileSync(file.path, destPath)
    res.json({ ok: true })
  } catch (err) {
    console.error('Failed to upload CSV:', err)
    res.status(500).json({ error: 'Failed to upload CSV' })
  }
})

// Wishlist endpoints
app.get('/api/wishlist', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'No token provided' })
    
    const tokenParts = token.split('_')
    if (tokenParts.length < 3) return res.status(401).json({ error: 'Invalid token format' })
    
    const userId = tokenParts[2]
    const { rows } = await pool.query(`
      SELECT w.*, p.title, p.price, p.list_image, p.slug
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `, [userId])
    
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wishlist' })
  }
})

app.post('/api/wishlist', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'No token provided' })
    
    const tokenParts = token.split('_')
    if (tokenParts.length < 3) return res.status(401).json({ error: 'Invalid token format' })
    
    const userId = tokenParts[2]
    const { product_id } = req.body
    
    if (!product_id) return res.status(400).json({ error: 'product_id is required' })
    
    const { rows } = await pool.query(`
      INSERT INTO wishlist (user_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, product_id) DO NOTHING
      RETURNING *
    `, [userId, product_id])
    
    if (rows.length === 0) {
      return res.json({ message: 'Item already in wishlist' })
    }
    
    res.status(201).json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to wishlist' })
  }
})

app.delete('/api/wishlist/:productId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'No token provided' })
    
    const tokenParts = token.split('_')
    if (tokenParts.length < 3) return res.status(401).json({ error: 'Invalid token format' })
    
    const userId = tokenParts[2]
    const { productId } = req.params
    
    const { rows } = await pool.query(`
      DELETE FROM wishlist 
      WHERE user_id = $1 AND product_id = $2
      RETURNING *
    `, [userId, productId])
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' })
    }
    
    res.json({ message: 'Item removed from wishlist' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from wishlist' })
  }
})

// Orders endpoints (simplified)
app.get('/api/orders', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

app.post('/api/orders', async (req, res) => {
  try {
    const {
      order_number,
      customer_name,
      customer_email,
      shipping_address,
      items,
      subtotal,
      shipping = 0,
      tax = 0,
      total,
      payment_method,
      payment_type
    } = req.body || {}
    
    if (!order_number || !customer_name || !customer_email || !shipping_address || !items || !total) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    const { rows } = await pool.query(`
      INSERT INTO orders (order_number, customer_name, customer_email, shipping_address, items, subtotal, shipping, tax, total, payment_method, payment_type)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [order_number, customer_name, customer_email, JSON.stringify(shipping_address), JSON.stringify(items), subtotal, shipping, tax, total, payment_method, payment_type])
    
    broadcastUpdate('order_created', rows[0])
    res.status(201).json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' })
  }
})

// Start server
const port = Number(process.env.PORT || 2000)
ensureSchema(pool)
  .then(() => {
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Nefol API running on http://0.0.0.0:${port}`)
      console.log(`📡 WebSocket server ready for real-time updates`)
      console.log(`✅ All routes optimized and centralized`)
    })
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
  })
