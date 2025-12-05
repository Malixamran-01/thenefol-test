"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Optimized main server file with centralized routes and utilities
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pg_1 = require("pg");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const routes_1 = require("./routes");
const schema_1 = require("./utils/schema");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const clientOrigin = process.env.CLIENT_ORIGIN || 'https://thenefol.com';
app.use((0, cors_1.default)({ origin: (_origin, cb) => cb(null, true), credentials: true }));
// Create HTTP server and Socket.IO
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: (_origin, cb) => cb(null, true),
        methods: ['GET', 'POST']
    }
});
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol';
const pool = new pg_1.Pool({ connectionString });
// Create a simple db object for compatibility
const db = {
    query: async (text, params) => {
        try {
            const result = await pool.query(text, params);
            return result;
        }
        catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }
};
// File upload configuration
const upload = (0, multer_1.default)({ dest: 'uploads/' });
// Ensure uploads directory exists
if (!fs_1.default.existsSync('uploads')) {
    fs_1.default.mkdirSync('uploads');
}
// Helper function to broadcast updates
function broadcastUpdate(type, data) {
    io.to('admin-panel').emit('update', { type, data });
}
// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('join-admin', () => {
        socket.join('admin-panel');
        console.log('Admin panel joined:', socket.id);
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
// ==================== MAIN ROUTES ====================
const mainRoutes = (0, routes_1.createRoutes)(pool);
app.use(mainRoutes);
// ==================== GENERIC CRUD ROUTES ====================
// These replace the duplicate code patterns found in the original file
// Videos CRUD
const videoRoutes = (0, routes_1.createCRUDRoutes)(pool, 'videos', ['title', 'description', 'video_url', 'redirect_url', 'price', 'size', 'thumbnail_url']);
app.use(videoRoutes);
// Users CRUD (admin only)
const userRoutes = (0, routes_1.createCRUDRoutes)(pool, 'users', ['name', 'email', 'password']);
app.use(userRoutes);
// Marketing CRUD routes
const emailRoutes = (0, routes_1.createCRUDRoutes)(pool, 'email_campaigns', ['name', 'subject']);
app.use(emailRoutes);
const smsRoutes = (0, routes_1.createCRUDRoutes)(pool, 'sms_campaigns', ['name', 'message']);
app.use(smsRoutes);
const pushRoutes = (0, routes_1.createCRUDRoutes)(pool, 'push_notifications', ['title', 'message']);
app.use(pushRoutes);
const whatsappRoutes = (0, routes_1.createCRUDRoutes)(pool, 'whatsapp_chat', ['phone_number']);
app.use(whatsappRoutes);
const liveChatRoutes = (0, routes_1.createCRUDRoutes)(pool, 'live_chat', ['customer_name']);
app.use(liveChatRoutes);
// Analytics CRUD routes
const analyticsRoutes = (0, routes_1.createCRUDRoutes)(pool, 'analytics_data', ['metric_name']);
app.use(analyticsRoutes);
const formRoutes = (0, routes_1.createCRUDRoutes)(pool, 'forms', ['name']);
app.use(formRoutes);
const workflowRoutes = (0, routes_1.createCRUDRoutes)(pool, 'workflows', ['name']);
app.use(workflowRoutes);
const segmentRoutes = (0, routes_1.createCRUDRoutes)(pool, 'customer_segments', ['name']);
app.use(segmentRoutes);
const journeyRoutes = (0, routes_1.createCRUDRoutes)(pool, 'customer_journeys', ['customer_id', 'journey_step']);
app.use(journeyRoutes);
const insightRoutes = (0, routes_1.createCRUDRoutes)(pool, 'actionable_insights', ['insight_type']);
app.use(insightRoutes);
const aiRoutes = (0, routes_1.createCRUDRoutes)(pool, 'ai_features', ['feature_name']);
app.use(aiRoutes);
const funnelRoutes = (0, routes_1.createCRUDRoutes)(pool, 'journey_funnels', ['funnel_name']);
app.use(funnelRoutes);
const personalizationRoutes = (0, routes_1.createCRUDRoutes)(pool, 'personalization_rules', ['rule_name']);
app.use(personalizationRoutes);
const audienceRoutes = (0, routes_1.createCRUDRoutes)(pool, 'custom_audiences', ['audience_name']);
app.use(audienceRoutes);
const omniRoutes = (0, routes_1.createCRUDRoutes)(pool, 'omni_channel_campaigns', ['campaign_name']);
app.use(omniRoutes);
const apiConfigRoutes = (0, routes_1.createCRUDRoutes)(pool, 'api_configurations', ['name', 'category']);
app.use(apiConfigRoutes);
// Finance CRUD routes
const invoiceRoutes = (0, routes_1.createCRUDRoutes)(pool, 'invoices', ['invoice_number', 'customer_name', 'customer_email', 'order_id', 'amount', 'due_date']);
app.use(invoiceRoutes);
const taxRateRoutes = (0, routes_1.createCRUDRoutes)(pool, 'tax_rates', ['name', 'rate', 'type', 'region']);
app.use(taxRateRoutes);
const taxRuleRoutes = (0, routes_1.createCRUDRoutes)(pool, 'tax_rules', ['name', 'conditions', 'tax_rate_ids']);
app.use(taxRuleRoutes);
const returnRoutes = (0, routes_1.createCRUDRoutes)(pool, 'returns', ['return_number', 'order_id', 'customer_name', 'customer_email', 'reason', 'total_amount', 'refund_amount']);
app.use(returnRoutes);
const paymentMethodRoutes = (0, routes_1.createCRUDRoutes)(pool, 'payment_methods', ['name', 'type']);
app.use(paymentMethodRoutes);
const paymentGatewayRoutes = (0, routes_1.createCRUDRoutes)(pool, 'payment_gateways', ['name', 'type', 'api_key', 'secret_key', 'webhook_url']);
app.use(paymentGatewayRoutes);
const paymentTransactionRoutes = (0, routes_1.createCRUDRoutes)(pool, 'payment_transactions', ['transaction_id', 'order_id', 'customer_name', 'amount', 'method', 'gateway']);
app.use(paymentTransactionRoutes);
// Loyalty and Marketing CRUD routes
const loyaltyRoutes = (0, routes_1.createCRUDRoutes)(pool, 'loyalty_program', ['name']);
app.use(loyaltyRoutes);
const affiliateRoutes = (0, routes_1.createCRUDRoutes)(pool, 'affiliate_program', ['name']);
app.use(affiliateRoutes);
const cashbackRoutes = (0, routes_1.createCRUDRoutes)(pool, 'cashback_system', ['name']);
app.use(cashbackRoutes);
// Shipping and Delivery CRUD routes
const deliveryStatusRoutes = (0, routes_1.createCRUDRoutes)(pool, 'order_delivery_status', ['order_id', 'status']);
app.use(deliveryStatusRoutes);
const reviewRoutes = (0, routes_1.createCRUDRoutes)(pool, 'product_reviews', ['order_id', 'product_id', 'customer_email', 'customer_name', 'rating']);
app.use(reviewRoutes);
const notificationRoutes = (0, routes_1.createCRUDRoutes)(pool, 'delivery_notifications', ['order_id', 'customer_email', 'notification_type']);
app.use(notificationRoutes);
const shiprocketConfigRoutes = (0, routes_1.createCRUDRoutes)(pool, 'shiprocket_config', ['api_key', 'api_secret']);
app.use(shiprocketConfigRoutes);
const shipmentRoutes = (0, routes_1.createCRUDRoutes)(pool, 'shiprocket_shipments', ['order_id']);
app.use(shipmentRoutes);
// Discounts CRUD routes
const discountRoutes = (0, routes_1.createCRUDRoutes)(pool, 'discounts', ['name', 'code', 'type', 'value']);
app.use(discountRoutes);
const discountUsageRoutes = (0, routes_1.createCRUDRoutes)(pool, 'discount_usage', ['discount_id', 'order_id', 'customer_email']);
app.use(discountUsageRoutes);
// ==================== SPECIALIZED ENDPOINTS ====================
// These require custom logic beyond basic CRUD
// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: 'No file uploaded' });
        const url = `/uploads/${file.filename}`;
        res.json({ url, filename: file.filename });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to upload file' });
    }
});
// CSV upload endpoint (FIXED PATH)
app.post('/api/products-csv/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: 'No file uploaded' });
        // FIXED: Correct path to CSV file
        const destPath = path_1.default.resolve(process.cwd(), '..', '..', 'product description page.csv');
        fs_1.default.copyFileSync(file.path, destPath);
        res.json({ ok: true });
    }
    catch (err) {
        console.error('Failed to upload CSV:', err);
        res.status(500).json({ error: 'Failed to upload CSV' });
    }
});
// Wishlist endpoints
app.get('/api/wishlist', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token)
            return res.status(401).json({ error: 'No token provided' });
        const tokenParts = token.split('_');
        if (tokenParts.length < 3)
            return res.status(401).json({ error: 'Invalid token format' });
        const userId = tokenParts[2];
        const { rows } = await pool.query(`
      SELECT w.*, p.title, p.price, p.list_image, p.slug
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `, [userId]);
        res.json(rows);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch wishlist' });
    }
});
app.post('/api/wishlist', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token)
            return res.status(401).json({ error: 'No token provided' });
        const tokenParts = token.split('_');
        if (tokenParts.length < 3)
            return res.status(401).json({ error: 'Invalid token format' });
        const userId = tokenParts[2];
        const { product_id } = req.body;
        if (!product_id)
            return res.status(400).json({ error: 'product_id is required' });
        const { rows } = await pool.query(`
      INSERT INTO wishlist (user_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, product_id) DO NOTHING
      RETURNING *
    `, [userId, product_id]);
        if (rows.length === 0) {
            return res.json({ message: 'Item already in wishlist' });
        }
        res.status(201).json(rows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to add to wishlist' });
    }
});
app.delete('/api/wishlist/:productId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token)
            return res.status(401).json({ error: 'No token provided' });
        const tokenParts = token.split('_');
        if (tokenParts.length < 3)
            return res.status(401).json({ error: 'Invalid token format' });
        const userId = tokenParts[2];
        const { productId } = req.params;
        const { rows } = await pool.query(`
      DELETE FROM wishlist 
      WHERE user_id = $1 AND product_id = $2
      RETURNING *
    `, [userId, productId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Wishlist item not found' });
        }
        res.json({ message: 'Item removed from wishlist' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to remove from wishlist' });
    }
});
// Orders endpoints (simplified)
app.get('/api/orders', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(rows);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});
app.post('/api/orders', async (req, res) => {
    try {
        const { order_number, customer_name, customer_email, shipping_address, items, subtotal, shipping = 0, tax = 0, total, payment_method, payment_type } = req.body || {};
        if (!order_number || !customer_name || !customer_email || !shipping_address || !items || !total) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const { rows } = await pool.query(`
      INSERT INTO orders (order_number, customer_name, customer_email, shipping_address, items, subtotal, shipping, tax, total, payment_method, payment_type)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [order_number, customer_name, customer_email, JSON.stringify(shipping_address), JSON.stringify(items), subtotal, shipping, tax, total, payment_method, payment_type]);
        broadcastUpdate('order_created', rows[0]);
        res.status(201).json(rows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create order' });
    }
});
// Start server
const port = Number(process.env.PORT || 2000);
(0, schema_1.ensureSchema)(pool)
    .then(() => {
    server.listen(port, '0.0.0.0', () => {
        console.log(`🚀 Nefol API running on http://0.0.0.0:${port}`);
        console.log(`📡 WebSocket server ready for real-time updates`);
        console.log(`✅ All routes optimized and centralized`);
    });
})
    .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
