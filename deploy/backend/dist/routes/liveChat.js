"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLiveChatRoutes = registerLiveChatRoutes;
const apiHelpers_1 = require("../utils/apiHelpers");
// Automated response function for product-related questions
async function getAutomatedResponse(message, pool, userId) {
    const lowerMessage = message.toLowerCase().trim();
    // Common product keywords/categories
    const productKeywords = [
        'shampoo', 'cleanser', 'lotion', 'cream', 'serum', 'toner', 'mask', 'scrub',
        'moisturizer', 'sunscreen', 'face wash', 'body wash', 'soap', 'oil', 'gel',
        'conditioner', 'hair oil', 'face cream', 'body lotion', 'lip balm', 'perfume',
        'fragrance', 'deodorant', 'antiperspirant', 'makeup', 'cosmetic', 'skincare',
        'haircare', 'beauty', 'personal care', 'wellness', 'health', 'hygiene'
    ];
    // Check if message contains product keywords directly
    let searchTerm = '';
    for (const keyword of productKeywords) {
        if (lowerMessage.includes(keyword)) {
            searchTerm = keyword;
            break;
        }
    }
    // Also check for product search queries
    if (!searchTerm) {
        const productMatch = lowerMessage.match(/(?:product|item|search|find|looking for|want|tell me about|information about|details about)\s+(?:about|for|on|information|details)?\s*(.+)/i);
        if (productMatch) {
            searchTerm = productMatch[1].trim();
        }
    }
    // If we found a search term, search for products
    if (searchTerm) {
        try {
            const { rows } = await pool.query(`
        SELECT id, title, slug, price, description, category 
        FROM products 
        WHERE LOWER(title) LIKE $1 OR LOWER(description) LIKE $1 OR LOWER(category) LIKE $1
        ORDER BY 
          CASE WHEN LOWER(title) LIKE $2 THEN 1 ELSE 2 END,
          CASE WHEN LOWER(category) LIKE $1 THEN 1 ELSE 2 END
        LIMIT 5
      `, [`%${searchTerm}%`, `${searchTerm}%`]);
            if (rows.length > 0) {
                const products = rows.map((p, idx) => {
                    const shortDesc = p.description ? (p.description.length > 100 ? p.description.substring(0, 100) + '...' : p.description) : 'No description available';
                    return `${idx + 1}. ${p.title}\n   Price: ₹${p.price}\n   Category: ${p.category || 'Uncategorized'}\n   ${shortDesc}`;
                }).join('\n\n');
                return {
                    response: `I found ${rows.length} product(s) related to "${searchTerm}":\n\n${products}\n\nWould you like more details about any specific product? You can visit our website to see full product information and place an order.`,
                    canHandle: true
                };
            }
            else {
                // No products found, but we can still provide helpful information
                return {
                    response: `I don't have specific products matching "${searchTerm}" in our database right now. However, we do carry a wide range of ${searchTerm} products. Please visit our website to browse our full catalog, or feel free to ask me about other product categories like skincare, haircare, or personal care items.`,
                    canHandle: true
                };
            }
        }
        catch (e) {
            console.error('Error searching products:', e);
        }
    }
    // Price queries
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
        return {
            response: 'I can help you find product prices! Please tell me which product you\'re interested in, or use the search feature on our website to browse products and their prices.',
            canHandle: true
        };
    }
    // Shipping/delivery queries
    if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery') || lowerMessage.includes('ship') || lowerMessage.includes('when will i receive')) {
        return {
            response: 'We offer fast and reliable shipping across India. Delivery times typically range from 3-7 business days depending on your location. You can check the exact delivery time during checkout. We also provide order tracking once your order is shipped.',
            canHandle: true
        };
    }
    // Returns/refunds queries
    if (lowerMessage.includes('return') || lowerMessage.includes('refund') || lowerMessage.includes('exchange')) {
        return {
            response: 'We have a hassle-free return policy. You can return products within 7 days of delivery in their original condition. For refunds and exchanges, please contact our support team or raise a request through the chat.',
            canHandle: true
        };
    }
    // Order status queries
    if (lowerMessage.includes('order') && (lowerMessage.includes('status') || lowerMessage.includes('track') || lowerMessage.includes('where'))) {
        return {
            response: 'To check your order status, please visit your Orders page in your account. You can also track your order using the tracking number provided in your order confirmation email.',
            canHandle: true
        };
    }
    // Payment queries
    if (lowerMessage.includes('payment') || lowerMessage.includes('pay') || lowerMessage.includes('payment method')) {
        return {
            response: 'We accept multiple payment methods including credit/debit cards, UPI, net banking, and cash on delivery (where available). All payments are processed securely.',
            canHandle: true
        };
    }
    // Product availability
    if (lowerMessage.includes('available') || lowerMessage.includes('in stock') || lowerMessage.includes('out of stock')) {
        return {
            response: 'Product availability is shown on each product page. If a product is out of stock, you can sign up for notifications to be alerted when it\'s back in stock.',
            canHandle: true
        };
    }
    // General help
    if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('assistance')) {
        return {
            response: 'I\'m here to help! I can assist with:\n• Product information and search\n• Pricing and availability\n• Shipping and delivery\n• Returns and refunds\n• Order tracking\n• Payment methods\n\nIf you need help with something specific, please ask me, or if I can\'t help, I can connect you with our support team.',
            canHandle: true
        };
    }
    // Greetings
    if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
        return {
            response: 'Hello! 👋 I\'m NEFOL bot, here to help you with product information and general questions. How can I assist you today?',
            canHandle: true
        };
    }
    // Default - cannot handle
    return {
        response: null,
        canHandle: false
    };
}
function registerLiveChatRoutes(app, pool, io) {
    async function ensureLiveChatTables() {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS live_chat_sessions (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        status TEXT DEFAULT 'active',
        priority TEXT DEFAULT 'low',
        assigned_agent TEXT,
        last_message TEXT,
        last_message_time TIMESTAMP,
        message_count INT DEFAULT 0,
        tags TEXT[],
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
        await pool.query(`ALTER TABLE live_chat_sessions ADD COLUMN IF NOT EXISTS user_id TEXT`);
        // Ensure customer_email can be nullable (for guest users)
        // This will fail silently if column doesn't have NOT NULL constraint, which is fine
        try {
            await pool.query(`ALTER TABLE live_chat_sessions ALTER COLUMN customer_email DROP NOT NULL`);
        }
        catch (e) {
            // Column might not have NOT NULL constraint, or constraint might have a name
            // Try alternative approach: check if constraint exists first
            try {
                await pool.query(`
          DO $$ 
          BEGIN 
            IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'live_chat_sessions' 
              AND column_name = 'customer_email' 
              AND is_nullable = 'NO'
            ) THEN
              ALTER TABLE live_chat_sessions ALTER COLUMN customer_email DROP NOT NULL;
            END IF;
          END $$;
        `);
            }
            catch (e2) {
                // If both fail, we'll rely on placeholder email instead
                console.log('Note: Could not modify customer_email constraint, will use placeholder emails for guests');
            }
        }
        await pool.query(`
      CREATE TABLE IF NOT EXISTS live_chat_messages (
        id SERIAL PRIMARY KEY,
        session_id INT NOT NULL REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
        sender TEXT NOT NULL,
        sender_name TEXT,
        message TEXT,
        type TEXT DEFAULT 'text',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    }
    app.post('/api/live-chat/sessions', async (req, res) => {
        try {
            await ensureLiveChatTables();
            const { userId, customerName, customerEmail, customerPhone } = req.body || {};
            if (!userId && !customerEmail && !customerPhone)
                return (0, apiHelpers_1.sendError)(res, 400, 'userId, customerEmail, or customerPhone required');
            const findRes = await pool.query(`
        SELECT * FROM live_chat_sessions 
        WHERE (($1::text IS NOT NULL AND user_id = $1::text) OR ($2::text IS NOT NULL AND customer_email = $2::text) OR ($3::text IS NOT NULL AND customer_phone = $3::text))
        AND status IN ('active','waiting') ORDER BY created_at DESC LIMIT 1
      `, [userId ?? null, customerEmail ?? null, customerPhone ?? null]);
            if (findRes.rows.length > 0)
                return (0, apiHelpers_1.sendSuccess)(res, findRes.rows[0]);
            // If user_id is provided but name/email are missing, try to get from users table
            let finalName = customerName;
            let finalEmail = customerEmail;
            // Check if this is a guest user (userId starts with "guest_")
            const isGuestUser = userId && typeof userId === 'string' && userId.startsWith('guest_');
            if (userId && !isGuestUser && (!customerName || !customerEmail)) {
                try {
                    const userRes = await pool.query(`SELECT name, email FROM users WHERE id::text = $1`, [userId]);
                    if (userRes.rows.length > 0) {
                        finalName = customerName || userRes.rows[0].name || null;
                        finalEmail = customerEmail || userRes.rows[0].email || null;
                    }
                }
                catch (e) {
                    console.error('Failed to fetch user data:', e);
                }
            }
            // For guest users, provide a placeholder email to satisfy NOT NULL constraint
            if (isGuestUser && !finalEmail) {
                finalEmail = `${userId}@nefol.guest`;
            }
            // Ensure email is not null (required by database constraint)
            if (!finalEmail) {
                // Fallback: use a generic placeholder if no email is provided
                finalEmail = `guest-${Date.now()}@nefol.local`;
            }
            const insertRes = await pool.query(`
        INSERT INTO live_chat_sessions (user_id, customer_name, customer_email, customer_phone, status, priority)
        VALUES ($1,$2,$3,$4,'active','low') RETURNING *
      `, [userId || null, finalName || null, finalEmail, customerPhone || null]);
            return (0, apiHelpers_1.sendSuccess)(res, insertRes.rows[0], 201);
        }
        catch (err) {
            return (0, apiHelpers_1.sendError)(res, 500, 'Failed to create live chat session', err);
        }
    });
    app.get('/api/live-chat/messages', async (req, res) => {
        try {
            await ensureLiveChatTables();
            const sessionId = req.query.sessionId;
            if (!sessionId)
                return (0, apiHelpers_1.sendError)(res, 400, 'sessionId is required');
            const { rows } = await pool.query(`
        SELECT id, session_id, sender, sender_name, message, type, is_read, created_at
        FROM live_chat_messages WHERE session_id = $1 ORDER BY created_at ASC
      `, [sessionId]);
            return (0, apiHelpers_1.sendSuccess)(res, rows);
        }
        catch (err) {
            return (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch messages', err);
        }
    });
    app.post('/api/live-chat/messages', async (req, res) => {
        try {
            await ensureLiveChatTables();
            const { sessionId, sender, senderName, message, type } = req.body || {};
            if (!sessionId || !sender || !message)
                return (0, apiHelpers_1.sendError)(res, 400, 'sessionId, sender, and message are required');
            const insert = await pool.query(`
        INSERT INTO live_chat_messages (session_id, sender, sender_name, message, type)
        VALUES ($1,$2,$3,$4,$5) RETURNING id, session_id, sender, sender_name, message, type, is_read, created_at
      `, [sessionId, sender, senderName || null, message, type || 'text']);
            const msg = insert.rows[0];
            // Update session: set last message and increment count, also update customer_name if missing and sender is customer
            if (sender === 'customer' && senderName) {
                // Try to update customer_name if it's missing, also try to get email from users table if user_id exists
                const sessionRes = await pool.query(`SELECT user_id FROM live_chat_sessions WHERE id = $1`, [sessionId]);
                if (sessionRes.rows.length > 0) {
                    const userId = sessionRes.rows[0].user_id;
                    if (userId) {
                        // Try to get email from users table
                        const userRes = await pool.query(`SELECT email, name FROM users WHERE id::text = $1`, [userId]);
                        if (userRes.rows.length > 0) {
                            await pool.query(`
                UPDATE live_chat_sessions 
                SET last_message = $1, 
                    last_message_time = NOW(), 
                    message_count = COALESCE(message_count,0) + 1,
                    customer_name = COALESCE(NULLIF(customer_name, ''), $2, $3),
                    customer_email = COALESCE(NULLIF(customer_email, ''), $4)
                WHERE id = $5
              `, [message, senderName, userRes.rows[0].name, userRes.rows[0].email, sessionId]);
                        }
                        else {
                            await pool.query(`
                UPDATE live_chat_sessions 
                SET last_message = $1, 
                    last_message_time = NOW(), 
                    message_count = COALESCE(message_count,0) + 1,
                    customer_name = COALESCE(NULLIF(customer_name, ''), $2)
                WHERE id = $3
              `, [message, senderName, sessionId]);
                        }
                    }
                    else {
                        await pool.query(`
              UPDATE live_chat_sessions 
              SET last_message = $1, 
                  last_message_time = NOW(), 
                  message_count = COALESCE(message_count,0) + 1,
                  customer_name = COALESCE(NULLIF(customer_name, ''), $2)
              WHERE id = $3
            `, [message, senderName, sessionId]);
                    }
                }
            }
            else {
                await pool.query(`
          UPDATE live_chat_sessions SET last_message = $1, last_message_time = NOW(), message_count = COALESCE(message_count,0) + 1 WHERE id = $2
        `, [message, sessionId]);
            }
            io.to(`live-chat-session-${sessionId}`).emit('live-chat:message', msg);
            io.to('admin-panel').emit('live-chat:message', msg);
            // If message is from customer, try automated response
            if (sender === 'customer') {
                const sessionRes = await pool.query(`SELECT user_id FROM live_chat_sessions WHERE id = $1`, [sessionId]);
                const userId = sessionRes.rows.length > 0 ? sessionRes.rows[0].user_id : null;
                const automated = await getAutomatedResponse(message, pool, userId || undefined);
                if (automated.canHandle && automated.response) {
                    // Add a small delay to make it feel more natural
                    setTimeout(async () => {
                        try {
                            const botInsert = await pool.query(`
                INSERT INTO live_chat_messages (session_id, sender, sender_name, message, type)
                VALUES ($1, 'agent', 'NEFOL bot', $2, 'text')
                RETURNING id, session_id, sender, sender_name, message, type, is_read, created_at
              `, [sessionId, automated.response]);
                            const botMsg = botInsert.rows[0];
                            await pool.query(`
                UPDATE live_chat_sessions SET last_message = $1, last_message_time = NOW(), message_count = COALESCE(message_count,0) + 1 WHERE id = $2
              `, [automated.response, sessionId]);
                            io.to(`live-chat-session-${sessionId}`).emit('live-chat:message', botMsg);
                            io.to('admin-panel').emit('live-chat:message', botMsg);
                        }
                        catch (err) {
                            console.error('Failed to send automated response:', err);
                        }
                    }, 1000); // 1 second delay
                }
            }
            return (0, apiHelpers_1.sendSuccess)(res, msg, 201);
        }
        catch (err) {
            return (0, apiHelpers_1.sendError)(res, 500, 'Failed to send message', err);
        }
    });
    // Support request endpoint
    app.post('/api/live-chat/support-request', async (req, res) => {
        try {
            await ensureLiveChatTables();
            const { sessionId, subject, description, priority } = req.body || {};
            if (!sessionId || !subject || !description) {
                return (0, apiHelpers_1.sendError)(res, 400, 'sessionId, subject, and description are required');
            }
            // Get session details
            const sessionRes = await pool.query(`
        SELECT user_id, customer_name, customer_email, customer_phone 
        FROM live_chat_sessions 
        WHERE id = $1
      `, [sessionId]);
            if (sessionRes.rows.length === 0) {
                return (0, apiHelpers_1.sendError)(res, 404, 'Session not found');
            }
            const session = sessionRes.rows[0];
            // Create support request in contact_messages table (reusing existing table)
            await pool.query(`
        CREATE TABLE IF NOT EXISTS contact_messages (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          message TEXT NOT NULL,
          subject TEXT,
          status TEXT DEFAULT 'pending',
          priority TEXT DEFAULT 'medium',
          source TEXT DEFAULT 'live_chat',
          session_id INT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
            await pool.query(`
        ALTER TABLE contact_messages 
        ADD COLUMN IF NOT EXISTS subject TEXT,
        ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
        ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'contact_form',
        ADD COLUMN IF NOT EXISTS session_id INT
      `);
            const { rows } = await pool.query(`
        INSERT INTO contact_messages (name, email, phone, message, subject, priority, source, session_id)
        VALUES ($1, $2, $3, $4, $5, $6, 'live_chat', $7)
        RETURNING *
      `, [
                session.customer_name || 'Customer',
                session.customer_email || 'customer@example.com',
                session.customer_phone || null,
                description,
                subject,
                priority || 'medium',
                sessionId
            ]);
            // Send automated confirmation message
            const confirmationMsg = `✅ Your support request has been created!\n\nSubject: ${subject}\n\nOur team will review your request and get back to you within 24 hours. You'll receive updates via email.`;
            const botInsert = await pool.query(`
        INSERT INTO live_chat_messages (session_id, sender, sender_name, message, type)
        VALUES ($1, 'agent', 'Support System', $2, 'text')
        RETURNING id, session_id, sender, sender_name, message, type, is_read, created_at
      `, [sessionId, confirmationMsg]);
            const botMsg = botInsert.rows[0];
            io.to(`live-chat-session-${sessionId}`).emit('live-chat:message', botMsg);
            io.to('admin-panel').emit('live-chat:message', botMsg);
            io.to('admin-panel').emit('update', { type: 'support_request_created', data: rows[0] });
            // Create admin notification
            try {
                await pool.query(`
          INSERT INTO admin_notifications (user_id, notification_type, title, message, link, icon, priority, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
                    null,
                    'support_request',
                    'New Support Request from Live Chat',
                    `Request: ${subject}`,
                    '/admin/contact-messages',
                    '🎫',
                    priority || 'medium',
                    JSON.stringify({ request_id: rows[0].id, session_id: sessionId })
                ]);
                io.to('admin-panel').emit('new-notification', { notification_type: 'support_request' });
            }
            catch (notifErr) {
                console.error('Error creating admin notification:', notifErr);
            }
            return (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
        }
        catch (err) {
            return (0, apiHelpers_1.sendError)(res, 500, 'Failed to create support request', err);
        }
    });
}
