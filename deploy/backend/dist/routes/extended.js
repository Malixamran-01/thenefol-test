"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExtendedRoutes = registerExtendedRoutes;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const apiHelpers_1 = require("../utils/apiHelpers");
const razorpay_1 = __importDefault(require("razorpay"));
const amazonInvoiceTemplate_1 = require("../utils/amazonInvoiceTemplate");
// Initialize Razorpay for payouts
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_RigxrHNSReeV37';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'F9PT2uJbFVQUedEXI3iL59N9';
const razorpay = new razorpay_1.default({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
});
function registerExtendedRoutes(app, pool, io) {
    // ==================== CSV endpoints (FIXED PATH) ====================
    app.get('/api/products-csv', async (req, res) => {
        try {
            const csvPath = path_1.default.resolve(process.cwd(), '..', 'product description page.csv');
            if (!fs_1.default.existsSync(csvPath)) {
                return (0, apiHelpers_1.sendSuccess)(res, []);
            }
            const raw = fs_1.default.readFileSync(csvPath, 'utf8');
            const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
            if (lines.length === 0) {
                return (0, apiHelpers_1.sendSuccess)(res, []);
            }
            const parseCSVLine = (line) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        if (inQuotes && line[i + 1] === '"') {
                            current += '"';
                            i++;
                        }
                        else {
                            inQuotes = !inQuotes;
                        }
                    }
                    else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    }
                    else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };
            const headers = parseCSVLine(lines[0]);
            const rows = [];
            for (let i = 1; i < lines.length; i++) {
                const parts = parseCSVLine(lines[i]);
                if (parts.every(p => p.trim() === ''))
                    continue;
                const obj = {};
                for (let j = 0; j < headers.length; j++)
                    obj[headers[j]] = (parts[j] ?? '').trim();
                rows.push(obj);
            }
            (0, apiHelpers_1.sendSuccess)(res, rows);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to read products CSV', err);
        }
    });
    // CSV upload remains defined in index to reuse existing multer instance
    // ==================== Cashback, Coins & Withdrawals ====================
    app.get('/api/cashback/balance', apiHelpers_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.userId;
            const { rows } = await pool.query(`
        SELECT COALESCE(SUM(total * 0.05), 0) as balance
        FROM orders 
        WHERE customer_email = (
          SELECT email FROM users WHERE id = $1
        )
      `, [userId]);
            const balance = rows[0]?.balance || 0;
            (0, apiHelpers_1.sendSuccess)(res, { balance });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch cashback balance', err);
        }
    });
    app.get('/api/nefol-coins', apiHelpers_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.userId;
            const { rows } = await pool.query(`
        SELECT loyalty_points as nefol_coins
        FROM users 
        WHERE id = $1
      `, [userId]);
            const totalCoins = rows[0]?.nefol_coins || 0;
            // Calculate available coins by excluding referral coins less than 8 days old
            // Referral coins can only be withdrawn 8 days after the referral purchase
            const referralCoinsResult = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as locked_referral_coins
        FROM coin_transactions
        WHERE user_id = $1
          AND type = 'referral_commission'
          AND amount > 0
          AND created_at > NOW() - INTERVAL '8 days'
      `, [userId]);
            const lockedReferralCoins = parseFloat(referralCoinsResult.rows[0]?.locked_referral_coins || 0);
            const availableCoins = totalCoins - lockedReferralCoins;
            (0, apiHelpers_1.sendSuccess)(res, {
                nefol_coins: totalCoins,
                available_coins: Math.floor(availableCoins),
                locked_referral_coins: lockedReferralCoins
            });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch Nefol coins', err);
        }
    });
    app.get('/api/coin-transactions', apiHelpers_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.userId;
            const { limit = 50 } = req.query;
            const { rows } = await pool.query(`
        SELECT 
          id, amount, type, description, status, order_id, withdrawal_id, metadata, created_at
        FROM coin_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);
            (0, apiHelpers_1.sendSuccess)(res, { data: rows });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch coin transactions', err);
        }
    });
    // Retroactively process cashback for orders that don't have cashback transactions
    app.post('/api/cashback/process-retroactive', apiHelpers_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId)
                return (0, apiHelpers_1.sendError)(res, 401, 'User ID not found');
            // Get user email
            const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                return (0, apiHelpers_1.sendError)(res, 404, 'User not found');
            }
            const userEmail = userResult.rows[0].email;
            // Get all orders for this user that don't have cashback transactions
            const ordersResult = await pool.query(`
        SELECT o.id, o.order_number, o.total, o.customer_email
        FROM orders o
        WHERE o.customer_email = $1
        AND NOT EXISTS (
          SELECT 1 FROM coin_transactions ct
          WHERE ct.order_id = o.id
          AND ct.type = 'earned'
          AND ct.description LIKE '%cashback%'
        )
        ORDER BY o.created_at DESC
      `, [userEmail]);
            const orders = ordersResult.rows;
            let processedCount = 0;
            let totalCoinsAdded = 0;
            for (const order of orders) {
                try {
                    const total = parseFloat(order.total) || 0;
                    if (total <= 0)
                        continue;
                    // Calculate 5% cashback amount
                    const cashbackAmount = total * 0.05;
                    // Convert cashback to coins (1 rupee = 10 coins)
                    const coinsToAdd = Math.floor(cashbackAmount * 10);
                    if (coinsToAdd > 0) {
                        // Add coins to user's loyalty_points
                        await pool.query(`
              UPDATE users 
              SET loyalty_points = loyalty_points + $1
              WHERE id = $2
            `, [coinsToAdd, userId]);
                        // Record coin transaction
                        await pool.query(`
              INSERT INTO coin_transactions (user_id, amount, type, description, status, order_id, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                            userId,
                            coinsToAdd,
                            'earned',
                            `5% cashback earned: ${coinsToAdd} coins (₹${cashbackAmount.toFixed(2)}) on order ${order.order_number}`,
                            'completed',
                            order.id,
                            new Date()
                        ]);
                        processedCount++;
                        totalCoinsAdded += coinsToAdd;
                        console.log(`✅ Retroactively added ${coinsToAdd} coins for order ${order.order_number}`);
                    }
                }
                catch (orderErr) {
                    console.error(`Error processing cashback for order ${order.order_number}:`, orderErr);
                }
            }
            (0, apiHelpers_1.sendSuccess)(res, {
                message: `Processed ${processedCount} orders`,
                ordersProcessed: processedCount,
                totalCoinsAdded: totalCoinsAdded,
                orders: orders.length
            });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to process retroactive cashback', err);
        }
    });
    // Get user's own orders (for regular users)
    app.get('/api/user/orders', apiHelpers_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId)
                return (0, apiHelpers_1.sendError)(res, 401, 'User ID not found');
            // Get user's email
            const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                return (0, apiHelpers_1.sendError)(res, 404, 'User not found');
            }
            const userEmail = userResult.rows[0].email;
            // Ensure required columns exist
            await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address JSONB`);
            await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT`);
            // Get orders for this user by email
            const { rows } = await pool.query(`
        SELECT 
          id, order_number, customer_name, customer_email, shipping_address,
          billing_address, items, subtotal, shipping, tax, total, status,
          payment_method, payment_type, payment_status, created_at, updated_at
        FROM orders
        WHERE customer_email = $1
        ORDER BY created_at DESC
        LIMIT 100
      `, [userEmail]);
            (0, apiHelpers_1.sendSuccess)(res, rows);
        }
        catch (err) {
            console.error('Error fetching user orders:', err);
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch orders', err);
        }
    });
    // Update order payment status when payment is cancelled
    app.put('/api/user/orders/:order_number/payment-cancelled', apiHelpers_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.userId;
            const { order_number } = req.params;
            if (!order_number) {
                return (0, apiHelpers_1.sendError)(res, 400, 'Order number is required');
            }
            // Get user's email to verify ownership
            const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                return (0, apiHelpers_1.sendError)(res, 404, 'User not found');
            }
            const userEmail = userResult.rows[0].email;
            // Check if order exists and belongs to user
            const orderResult = await pool.query('SELECT * FROM orders WHERE order_number = $1 AND customer_email = $2', [order_number, userEmail]);
            if (orderResult.rows.length === 0) {
                return (0, apiHelpers_1.sendError)(res, 404, 'Order not found or you do not have permission to update this order');
            }
            const order = orderResult.rows[0];
            // Only update if order is not already confirmed/paid
            if (order.status === 'confirmed' || order.status === 'delivered' || order.status === 'completed') {
                return (0, apiHelpers_1.sendError)(res, 400, 'Cannot update payment status for confirmed orders');
            }
            // Update order status to pending_payment
            await pool.query(`UPDATE orders 
         SET status = 'pending_payment', 
             payment_status = 'pending',
             updated_at = NOW()
         WHERE order_number = $1`, [order_number]);
            // Record status change history
            try {
                await pool.query(`CREATE TABLE IF NOT EXISTS order_status_history (
            id SERIAL PRIMARY KEY,
            order_id INT NOT NULL,
            old_status TEXT,
            new_status TEXT NOT NULL,
            note TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          )`);
                await pool.query(`INSERT INTO order_status_history (order_id, old_status, new_status, note)
           VALUES ($1, $2, $3, $4)`, [order.id, order.status, 'pending_payment', 'Payment cancelled by user']);
            }
            catch (e) {
                console.error('Failed to write order status history:', e);
            }
            (0, apiHelpers_1.sendSuccess)(res, { message: 'Order status updated to pending payment', order_number });
        }
        catch (err) {
            console.error('Error updating order payment status:', err);
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to update order payment status', err);
        }
    });
    app.get('/api/coin-withdrawals', apiHelpers_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.userId;
            const { rows } = await pool.query(`
        SELECT 
          id, amount, withdrawal_method, account_holder_name, account_number,
          ifsc_code, bank_name, upi_id, status, transaction_id, admin_notes,
          rejection_reason, created_at, processed_at
        FROM coin_withdrawals
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId]);
            (0, apiHelpers_1.sendSuccess)(res, { data: rows });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch withdrawal history', err);
        }
    });
    app.post('/api/coin-withdrawals', apiHelpers_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId)
                return (0, apiHelpers_1.sendError)(res, 401, 'User ID not found');
            const { amount, withdrawal_method, account_holder_name, account_number, ifsc_code, bank_name, upi_id } = req.body;
            if (!amount || amount <= 0)
                return (0, apiHelpers_1.sendError)(res, 400, 'Valid amount is required');
            if (!withdrawal_method || !['bank', 'upi'].includes(withdrawal_method))
                return (0, apiHelpers_1.sendError)(res, 400, 'Valid withdrawal method is required');
            if (withdrawal_method === 'bank' && (!account_number || !ifsc_code || !bank_name))
                return (0, apiHelpers_1.sendError)(res, 400, 'Bank details are required for bank transfer');
            if (withdrawal_method === 'upi' && !upi_id)
                return (0, apiHelpers_1.sendError)(res, 400, 'UPI ID is required for UPI transfer');
            if (!account_holder_name)
                return (0, apiHelpers_1.sendError)(res, 400, 'Account holder name is required');
            const userResult = await pool.query(`SELECT loyalty_points FROM users WHERE id = $1`, [userId]);
            const totalCoins = userResult.rows[0]?.loyalty_points || 0;
            // Calculate available coins by excluding referral coins less than 8 days old
            // Referral coins can only be withdrawn 8 days after the referral purchase
            const referralCoinsResult = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as locked_referral_coins
        FROM coin_transactions
        WHERE user_id = $1
          AND type = 'referral_commission'
          AND amount > 0
          AND created_at > NOW() - INTERVAL '8 days'
      `, [userId]);
            const lockedReferralCoins = parseFloat(referralCoinsResult.rows[0]?.locked_referral_coins || 0);
            const availableCoins = totalCoins - lockedReferralCoins;
            // Validate minimum withdrawal
            if (amount < 10) {
                return (0, apiHelpers_1.sendError)(res, 400, 'Minimum withdrawal is 10 coins');
            }
            if (availableCoins < amount) {
                return (0, apiHelpers_1.sendError)(res, 400, `Insufficient coins. You have ${Math.floor(availableCoins)} withdrawable coins available. Referral coins can be withdrawn 8 days after the referral purchase.`);
            }
            const insertValues = [userId, amount, withdrawal_method, account_holder_name];
            if (withdrawal_method === 'bank')
                insertValues.push(account_number, ifsc_code, bank_name, null);
            else
                insertValues.push(null, null, null, upi_id);
            const { rows } = await pool.query(`
        INSERT INTO coin_withdrawals (
          user_id, amount, withdrawal_method, account_holder_name,
          account_number, ifsc_code, bank_name, upi_id, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
        RETURNING *
      `, insertValues);
            await pool.query(`UPDATE users SET loyalty_points = loyalty_points - $1 WHERE id = $2`, [amount, userId]);
            await pool.query(`
        INSERT INTO coin_transactions (user_id, amount, type, description, status, order_id, withdrawal_id, metadata)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [userId, -amount, 'withdrawal_pending', `Withdrawal requested: ${amount} coins (₹${(amount / 10).toFixed(2)}) via ${withdrawal_method === 'bank' ? 'Bank Transfer' : 'UPI'}`, 'pending', null, rows[0].id, null]);
            (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to create withdrawal request', err);
        }
    });
    app.get('/api/admin/coin-withdrawals', async (req, res) => {
        try {
            const { status } = req.query;
            let query = `
        SELECT w.*, u.name as user_name, u.email as user_email, u.phone as user_phone
        FROM coin_withdrawals w
        JOIN users u ON w.user_id = u.id
        WHERE 1=1
      `;
            const values = [];
            if (status) {
                query += ` AND w.status = $${values.length + 1}`;
                values.push(status);
            }
            query += ` ORDER BY w.created_at DESC`;
            const { rows } = await pool.query(query, values);
            (0, apiHelpers_1.sendSuccess)(res, rows);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch withdrawal requests', err);
        }
    });
    app.put('/api/admin/coin-withdrawals/:id/process', async (req, res) => {
        try {
            const withdrawalId = req.params.id;
            const { status, transaction_id, admin_notes, rejection_reason } = req.body;
            if (!status || !['processing', 'completed', 'rejected', 'failed'].includes(status))
                return (0, apiHelpers_1.sendError)(res, 400, 'Valid status is required');
            // Require rejection_reason when status is rejected or failed
            if ((status === 'rejected' || status === 'failed') && !rejection_reason) {
                return (0, apiHelpers_1.sendError)(res, 400, 'Rejection reason is required when status is rejected or failed');
            }
            // Get withdrawal details with user information
            const withdrawalResult = await pool.query(`
        SELECT w.*, u.email, u.phone, u.name as user_name
        FROM coin_withdrawals w
        JOIN users u ON w.user_id = u.id
        WHERE w.id = $1
      `, [withdrawalId]);
            if (withdrawalResult.rows.length === 0) {
                return (0, apiHelpers_1.sendError)(res, 404, 'Withdrawal request not found');
            }
            const withdrawal = withdrawalResult.rows[0];
            let razorpayPayoutId = null;
            // If status is completed, create Razorpay payout
            if (status === 'completed' && !withdrawal.razorpay_payout_id) {
                try {
                    // Check if Razorpay account number is configured
                    const razorpayAccountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER;
                    if (!razorpayAccountNumber) {
                        console.warn('RAZORPAY_ACCOUNT_NUMBER not configured. Skipping automatic payout creation.');
                        // Continue without payout - admin can manually process
                    }
                    else {
                        // Convert coins to rupees (1 rupee = 10 coins)
                        const amountInRupees = Number(withdrawal.amount) / 10;
                        const amountInPaise = Math.round(amountInRupees * 100); // Razorpay expects amount in paise
                        // Prepare payout data for Razorpay
                        const payoutData = {
                            account_number: razorpayAccountNumber,
                            fund_account: {
                                account_type: withdrawal.withdrawal_method === 'bank' ? 'bank_account' : 'vpa',
                                contact: {
                                    name: withdrawal.account_holder_name,
                                    email: withdrawal.email || 'user@nefol.com',
                                    contact: withdrawal.phone ? withdrawal.phone.replace(/\D/g, '').slice(-10) : '9999999999',
                                    type: 'vendor'
                                }
                            },
                            amount: amountInPaise,
                            currency: 'INR',
                            mode: withdrawal.withdrawal_method === 'bank' ? 'NEFT' : 'UPI',
                            purpose: 'payout',
                            queue_if_low_balance: true,
                            reference_id: `WD${withdrawalId}_${Date.now()}`,
                            narration: `Nefol Coins Withdrawal - ${withdrawal.amount} coins`
                        };
                        // Add bank account or UPI details
                        if (withdrawal.withdrawal_method === 'bank') {
                            payoutData.fund_account.bank_account = {
                                name: withdrawal.account_holder_name,
                                ifsc: withdrawal.ifsc_code,
                                account_number: withdrawal.account_number
                            };
                        }
                        else {
                            payoutData.fund_account.vpa = {
                                address: withdrawal.upi_id
                            };
                        }
                        // Create payout using Razorpay
                        // Note: Razorpay payouts API may require different SDK methods
                        // Using type assertion as payouts might not be in TypeScript definitions
                        const payout = await razorpay.payouts.create(payoutData);
                        razorpayPayoutId = payout.id;
                        console.log(`Razorpay payout created: ${razorpayPayoutId} for withdrawal ${withdrawalId}, amount: ₹${amountInRupees.toFixed(2)}`);
                    }
                }
                catch (payoutError) {
                    console.error('Error creating Razorpay payout:', payoutError);
                    // If payout creation fails, don't mark as completed
                    const errorMessage = payoutError.error?.description || payoutError.error?.field || payoutError.message || 'Unknown error';
                    return (0, apiHelpers_1.sendError)(res, 500, `Failed to create Razorpay payout: ${errorMessage}`, payoutError);
                }
            }
            const updateFields = [];
            const values = [];
            updateFields.push(`status = $${values.length + 1}`);
            values.push(status);
            if (transaction_id) {
                updateFields.push(`transaction_id = $${values.length + 1}`);
                values.push(transaction_id);
            }
            if (razorpayPayoutId) {
                updateFields.push(`razorpay_payout_id = $${values.length + 1}`);
                values.push(razorpayPayoutId);
            }
            if (admin_notes) {
                updateFields.push(`admin_notes = $${values.length + 1}`);
                values.push(admin_notes);
            }
            if (rejection_reason) {
                updateFields.push(`rejection_reason = $${values.length + 1}`);
                values.push(rejection_reason);
            }
            if (['completed', 'rejected', 'failed'].includes(status)) {
                updateFields.push(`processed_at = NOW()`);
            }
            values.push(withdrawalId);
            const { rows } = await pool.query(`
        UPDATE coin_withdrawals
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING *
      `, values);
            if (rows.length === 0)
                return (0, apiHelpers_1.sendError)(res, 404, 'Withdrawal request not found');
            if (['rejected', 'failed'].includes(status)) {
                await pool.query(`UPDATE users SET loyalty_points = loyalty_points + $1 WHERE id = $2`, [rows[0].amount, rows[0].user_id]);
            }
            let transactionType = 'withdrawal_pending';
            if (status === 'processing')
                transactionType = 'withdrawal_processing';
            else if (status === 'completed')
                transactionType = 'withdrawal_completed';
            else if (status === 'rejected' || status === 'failed')
                transactionType = 'withdrawal_rejected';
            await pool.query(`
        UPDATE coin_transactions
        SET type = $1, status = $2, updated_at = NOW()
        WHERE withdrawal_id = $3
      `, [transactionType, status, withdrawalId]);
            (0, apiHelpers_1.sendSuccess)(res, rows[0]);
        }
        catch (err) {
            console.error('Error processing withdrawal:', err);
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to process withdrawal', err);
        }
    });
    // ==================== Invoices (settings + download) ====================
    app.get('/api/invoice-settings/company-details', async (_req, res) => {
        try {
            const result = await pool.query(`SELECT setting_value FROM store_settings WHERE setting_key = 'invoice_company_details'`);
            if (result.rows.length > 0 && result.rows[0].setting_value) {
                const details = typeof result.rows[0].setting_value === 'string' ? JSON.parse(result.rows[0].setting_value) : result.rows[0].setting_value;
                res.json(details);
            }
            else {
                res.json({});
            }
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch company details', err);
        }
    });
    app.put('/api/invoice-settings/company-details', async (req, res) => {
        try {
            const details = req.body;
            await pool.query(`
        INSERT INTO store_settings (setting_key, setting_value)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $2::jsonb, updated_at = NOW()
      `, ['invoice_company_details', JSON.stringify(details)]);
            (0, apiHelpers_1.sendSuccess)(res, { message: 'Company details saved successfully' });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to save company details', err);
        }
    });
    app.get('/api/invoice-settings/all', async (_req, res) => {
        try {
            const settings = {
                companyDetails: {},
                colors: { primaryStart: '#667eea', primaryEnd: '#764ba2', accentStart: '#667eea', accentEnd: '#764ba2' },
                tax: { rate: 18, type: 'IGST' },
                terms: 'Thank you for doing business with us.',
                signatureText: 'Authorized Signatory',
                currency: '₹'
            };
            const result = await pool.query(`
        SELECT setting_key, setting_value FROM store_settings 
        WHERE setting_key IN ('invoice_company_details', 'invoice_colors', 'invoice_tax', 'invoice_terms', 'invoice_currency', 'invoice_signature', 'invoice_logo_url', 'invoice_signatory_photo_url')
      `);
            result.rows.forEach((row) => {
                const key = row.setting_key.replace('invoice_', '');
                if (key === 'company_details') {
                    settings['companyDetails'] = typeof row.setting_value === 'string' ? JSON.parse(row.setting_value) : row.setting_value;
                }
                else if (key === 'logo_url' || key === 'signatory_photo_url') {
                    settings[key === 'logo_url' ? 'logoUrl' : 'signatoryPhotoUrl'] = row.setting_value;
                }
                else if (key === 'signature') {
                    settings['signatureText'] = row.setting_value;
                }
                else if (key === 'colors' || key === 'tax') {
                    settings[key] = typeof row.setting_value === 'string' ? JSON.parse(row.setting_value) : row.setting_value;
                }
                else {
                    settings[key] = row.setting_value;
                }
            });
            (0, apiHelpers_1.sendSuccess)(res, settings);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch settings', err);
        }
    });
    app.put('/api/invoice-settings/all', async (req, res) => {
        try {
            const { companyDetails, colors, tax, terms, signatureText, currency, logoUrl, signatoryPhotoUrl } = req.body;
            // Save company details
            if (companyDetails)
                await pool.query(`
        INSERT INTO store_settings (setting_key, setting_value)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $2::jsonb, updated_at = NOW()
      `, ['invoice_company_details', JSON.stringify(companyDetails)]);
            if (colors)
                await pool.query(`
        INSERT INTO store_settings (setting_key, setting_value)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $2::jsonb, updated_at = NOW()
      `, ['invoice_colors', JSON.stringify(colors)]);
            if (tax)
                await pool.query(`
        INSERT INTO store_settings (setting_key, setting_value)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $2::jsonb, updated_at = NOW()
      `, ['invoice_tax', JSON.stringify(tax)]);
            if (terms)
                await pool.query(`
        INSERT INTO store_settings (setting_key, setting_value)
        VALUES ($1, $2::text)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $2, updated_at = NOW()
      `, ['invoice_terms', terms]);
            if (signatureText)
                await pool.query(`
        INSERT INTO store_settings (setting_key, setting_value)
        VALUES ($1, $2::text)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $2, updated_at = NOW()
      `, ['invoice_signature', signatureText]);
            if (currency)
                await pool.query(`
        INSERT INTO store_settings (setting_key, setting_value)
        VALUES ($1, $2::text)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $2, updated_at = NOW()
      `, ['invoice_currency', currency]);
            if (logoUrl !== undefined)
                await pool.query(`
        INSERT INTO store_settings (setting_key, setting_value)
        VALUES ($1, $2::text)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $2, updated_at = NOW()
      `, ['invoice_logo_url', logoUrl || null]);
            if (signatoryPhotoUrl !== undefined)
                await pool.query(`
        INSERT INTO store_settings (setting_key, setting_value)
        VALUES ($1, $2::text)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $2, updated_at = NOW()
      `, ['invoice_signatory_photo_url', signatoryPhotoUrl || null]);
            (0, apiHelpers_1.sendSuccess)(res, { message: 'All settings saved successfully' });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to save settings', err);
        }
    });
    app.get('/api/invoices/:id/download', async (req, res) => {
        try {
            // Ensure invoice_number column exists
            try {
                await pool.query(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'invoice_number') THEN
              ALTER TABLE orders ADD COLUMN invoice_number text;
            END IF;
          END $$;
        `);
            }
            catch (err) {
                // Column might already exist, continue
                console.log('Invoice number column check:', err);
            }
            const { id } = req.params;
            const isNumeric = /^\d+$/.test(id);
            let result;
            if (isNumeric)
                result = await pool.query('SELECT * FROM orders WHERE id = $1', [parseInt(id)]);
            else
                result = await pool.query('SELECT * FROM orders WHERE order_number = $1', [id]);
            if (result.rows.length === 0 && isNumeric) {
                result = await pool.query('SELECT * FROM orders WHERE order_number = $1', [id]);
            }
            if (result.rows.length === 0)
                return (0, apiHelpers_1.sendError)(res, 404, 'Invoice not found');
            const order = result.rows[0];
            // Generate invoice number if not exists
            const { getOrGenerateInvoiceNumber } = require('../utils/invoiceUtils');
            if (!order.invoice_number) {
                order.invoice_number = await getOrGenerateInvoiceNumber(pool, order);
            }
            // Always fetch company details and all invoice settings from store_settings
            const companyDetailsResult = await pool.query(`SELECT setting_value FROM store_settings WHERE setting_key = 'invoice_company_details'`);
            const colorsResult = await pool.query(`SELECT setting_value FROM store_settings WHERE setting_key = 'invoice_colors'`);
            const taxResult = await pool.query(`SELECT setting_value FROM store_settings WHERE setting_key = 'invoice_tax'`);
            const termsResult = await pool.query(`SELECT setting_value FROM store_settings WHERE setting_key = 'invoice_terms'`);
            const signatureResult = await pool.query(`SELECT setting_value FROM store_settings WHERE setting_key = 'invoice_signature'`);
            const currencyResult = await pool.query(`SELECT setting_value FROM store_settings WHERE setting_key = 'invoice_currency'`);
            const logoResult = await pool.query(`SELECT setting_value FROM store_settings WHERE setting_key = 'invoice_logo_url'`);
            const signatoryPhotoResult = await pool.query(`SELECT setting_value FROM store_settings WHERE setting_key = 'invoice_signatory_photo_url'`);
            // Default values (only used if settings don't exist in database)
            const defaultCompanyDetails = { companyName: 'Nefol', companyAddress: '', companyPhone: '7355384939', companyEmail: 'info@nefol.com', gstNumber: '', panNumber: '', bankName: '', accountNumber: '', ifscCode: '' };
            const defaultColors = { primaryStart: '#667eea', primaryEnd: '#764ba2', accentStart: '#667eea', accentEnd: '#764ba2' };
            const defaultTaxSettings = { rate: 18, type: 'IGST' };
            const defaultTerms = 'Thank you for doing business with us.';
            const defaultSignature = 'Authorized Signatory';
            const defaultCurrency = '₹';
            // Always use values from store_settings if they exist, otherwise use defaults
            let companyDetails = defaultCompanyDetails;
            if (companyDetailsResult.rows.length > 0 && companyDetailsResult.rows[0].setting_value) {
                const fetchedDetails = typeof companyDetailsResult.rows[0].setting_value === 'string'
                    ? JSON.parse(companyDetailsResult.rows[0].setting_value)
                    : companyDetailsResult.rows[0].setting_value;
                companyDetails = { ...defaultCompanyDetails, ...fetchedDetails };
            }
            let colors = defaultColors;
            if (colorsResult.rows.length > 0 && colorsResult.rows[0].setting_value) {
                colors = typeof colorsResult.rows[0].setting_value === 'string'
                    ? JSON.parse(colorsResult.rows[0].setting_value)
                    : colorsResult.rows[0].setting_value;
            }
            let taxSettings = defaultTaxSettings;
            if (taxResult.rows.length > 0 && taxResult.rows[0].setting_value) {
                taxSettings = typeof taxResult.rows[0].setting_value === 'string'
                    ? JSON.parse(taxResult.rows[0].setting_value)
                    : taxResult.rows[0].setting_value;
            }
            let terms = defaultTerms;
            if (termsResult.rows.length > 0 && termsResult.rows[0].setting_value) {
                terms = termsResult.rows[0].setting_value;
            }
            let signature = defaultSignature;
            if (signatureResult.rows.length > 0 && signatureResult.rows[0].setting_value) {
                signature = signatureResult.rows[0].setting_value;
            }
            let currency = defaultCurrency;
            if (currencyResult.rows.length > 0 && currencyResult.rows[0].setting_value) {
                currency = currencyResult.rows[0].setting_value;
            }
            let logoUrl = null;
            if (logoResult.rows.length > 0 && logoResult.rows[0].setting_value) {
                logoUrl = logoResult.rows[0].setting_value;
            }
            let signatoryPhotoUrl = null;
            if (signatoryPhotoResult.rows.length > 0 && signatoryPhotoResult.rows[0].setting_value) {
                signatoryPhotoUrl = signatoryPhotoResult.rows[0].setting_value;
            }
            // Convert relative URLs to absolute URLs
            const getBaseUrl = () => {
                const protocol = req.protocol || 'http';
                const host = req.get('host') || 'thenefol.com';
                return `${protocol}://${host}`;
            };
            const baseUrl = getBaseUrl();
            if (logoUrl && !logoUrl.startsWith('http')) {
                logoUrl = logoUrl.startsWith('/') ? `${baseUrl}${logoUrl}` : `${baseUrl}/${logoUrl}`;
            }
            if (signatoryPhotoUrl && !signatoryPhotoUrl.startsWith('http')) {
                signatoryPhotoUrl = signatoryPhotoUrl.startsWith('/') ? `${baseUrl}${signatoryPhotoUrl}` : `${baseUrl}/${signatoryPhotoUrl}`;
            }
            const invoiceHtml = (0, amazonInvoiceTemplate_1.generateAmazonInvoiceHTML)(order, companyDetails, taxSettings, terms, signature, currency, logoUrl, signatoryPhotoUrl);
            res.setHeader('Content-Type', 'text/html');
            res.send(invoiceHtml);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to generate invoice', err);
        }
    });
    function generateInvoiceHTML(order, companyDetails, colors, taxSettings, terms, signature, currency, logoUrl = null, signatoryPhotoUrl = null) {
        const { getStateCode, numberToWords } = require('../utils/invoiceUtils');
        try {
            const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
            let subtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;
            const invoiceItems = items.map((item, index) => {
                const unitPrice = parseFloat(item.price || item.unitPrice || item.mrp || 0);
                const quantity = parseInt(item.quantity || 1);
                const discount = parseFloat(item.discount || 0);
                const gstFromCSV = item.csvProduct?.['GST %'];
                const taxRate = gstFromCSV ? (parseFloat(gstFromCSV) / 100) : (parseFloat(item.taxRate || taxSettings.rate) / 100);
                const itemSubtotal = unitPrice * quantity;
                const itemDiscount = discount;
                // MRP is tax-inclusive, so extract tax from MRP
                // basePrice = taxInclusivePrice / (1 + taxRate)
                // tax = taxInclusivePrice - basePrice
                const basePricePerUnit = unitPrice / (1 + taxRate);
                const taxPerUnit = unitPrice - basePricePerUnit;
                const itemTax = taxPerUnit * quantity;
                // Item total after discount (MRP already includes tax)
                const itemTotalAfterDiscount = itemSubtotal - itemDiscount;
                subtotal += itemSubtotal;
                totalDiscount += itemDiscount;
                totalTax += itemTax;
                const hsnCode = item.csvProduct?.['HSN Code'] || item.hsn || '-';
                const sku = item.csvProduct?.['SKU'] || item.code || item.sku || item.id || 'N/A';
                const brand = item.csvProduct?.['Brand Name'] || 'NEFOL';
                const gstPercent = gstFromCSV || (taxRate * 100); // Convert back to percentage for display
                const discountPercent = itemSubtotal > 0 ? ((itemDiscount / itemSubtotal) * 100).toFixed(0) : 0;
                return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${index + 1}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
              <div style="margin-bottom: 4px;"><strong>${item.name || item.productName || item.title || 'Product'}</strong></div>
              <div style="font-size: 11px; color: #6b7280;">Code: ${sku}</div>
              ${brand !== 'NEFOL' ? `<div style="font-size: 11px; color: #6b7280;">Brand: ${brand}</div>` : ''}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px;"><strong>${hsnCode}</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 14px;"><strong>${quantity}</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px;">
              <div>${currency}${unitPrice.toFixed(2)}</div>
              ${itemDiscount > 0 ? `<div style="color: #dc2626; font-size: 11px; margin-top: 2px;">Discount: ${discountPercent}% (${currency}${itemDiscount.toFixed(2)})</div>` : ''}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px;">
              <strong>${currency}${itemTotalAfterDiscount.toFixed(2)}</strong>
              <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
                <div>GST ${gstPercent}% (Inclusive): ${currency}${itemTax.toFixed(2)}</div>
                <div style="font-size: 10px; margin-top: 2px;">HSN: ${hsnCode}</div>
              </div>
            </td>
          </tr>
        `;
            }).join('');
            // MRP is tax-inclusive, so calculations:
            // MRP = sum of all item prices (tax-inclusive)
            // Subtotal = MRP - Discount
            // Tax is already included in MRP, we just extract it for display
            // Grand Total = Subtotal + Shipping (tax already included)
            const mrp = subtotal; // MRP is the sum of all item prices
            const finalSubtotal = mrp - totalDiscount; // Subtotal after discount
            const shippingCharges = parseFloat(order.shipping || 0);
            // Recalculate tax from the discounted amount (since discount affects tax)
            // If discount is applied, tax should be recalculated on the discounted amount
            let recalculatedTax = 0;
            if (totalDiscount > 0) {
                // Recalculate tax on discounted amount
                const baseAmount = finalSubtotal / (1 + (taxSettings.rate / 100));
                recalculatedTax = finalSubtotal - baseAmount;
            }
            else {
                // No discount, use the tax we already calculated
                recalculatedTax = totalTax;
            }
            // Grand Total = Subtotal + Shipping (tax is already included in subtotal)
            const finalTotal = finalSubtotal + shippingCharges;
            // Calculate CGST and SGST if tax type is CGST+SGST (split the tax rate in half)
            const isCGST = taxSettings.type === 'CGST+SGST';
            const cgstAmount = isCGST ? recalculatedTax / 2 : 0;
            const sgstAmount = isCGST ? recalculatedTax / 2 : 0;
            const igstAmount = !isCGST ? recalculatedTax : 0;
            const formatDate = (date) => new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const formatDateTime = (date) => {
                const d = new Date(date);
                return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            };
            // Format addresses
            const formatShippingAddress = () => {
                if (!order.shipping_address)
                    return 'N/A';
                if (typeof order.shipping_address === 'string')
                    return order.shipping_address;
                const addr = order.shipping_address;
                return `
          ${addr.firstName || addr.first_name || order.customer_name || ''} ${addr.lastName || addr.last_name || ''}<br/>
          ${addr.address || addr.street || ''}<br/>
          ${addr.apartment ? addr.apartment + '<br/>' : ''}
          ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}<br/>
          ${addr.country || 'India'}
        `;
            };
            const formatBillingAddress = () => {
                // If billing_address is null, use shipping_address (for backward compatibility and same-as-shipping case)
                const billingAddr = order.billing_address || order.shipping_address;
                if (!billingAddr)
                    return 'N/A';
                if (typeof billingAddr === 'string')
                    return billingAddr;
                const addr = billingAddr;
                return `
          ${addr.firstName || addr.first_name || order.customer_name || ''} ${addr.lastName || addr.last_name || ''}<br/>
          ${addr.company ? addr.company + '<br/>' : ''}
          ${addr.address || addr.street || ''}<br/>
          ${addr.apartment ? addr.apartment + '<br/>' : ''}
          ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}<br/>
          ${addr.country || 'India'}
        `;
            };
            return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tax Invoice - ${order.order_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: linear-gradient(135deg, ${colors.primaryStart} 0%, ${colors.primaryEnd} 100%); padding: 20px; }
            .invoice-container { max-width: 210mm; margin: 0 auto; background: white; padding: 30px; }
            .header-section { margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
            .header-left { flex: 1; }
            .header-right { flex: 1; text-align: right; }
            .logo-container { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
            .logo-box { ${logoUrl ? `background: url('${logoUrl}') center/contain no-repeat;` : `background: linear-gradient(135deg, ${colors.primaryStart} 0%, ${colors.primaryEnd} 100%);`} ${logoUrl ? '' : 'color: white;'} padding: 20px; width: 120px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; border-radius: 8px; }
            .company-name { font-size: 20px; color: #4a5568; font-weight: 700; }
            .company-details { text-align: right; color: white; font-size: 13px; line-height: 1.6; padding: 20px; background: #4facfe; border-radius: 8px; }
            .company-details div { margin-bottom: 6px; }
            .company-details strong { font-weight: 600; }
            .invoice-title { font-size: 32px; font-weight: bold; color: #4a5568; margin: 20px 0 15px 0; text-align: center; }
            .invoice-info { display: flex; justify-content: space-between; color: #4a5568; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 12px; }
            .address-section { display: flex; gap: 20px; margin-bottom: 30px; }
            .address-left, .address-right { flex: 1; padding: 20px; background: #4facfe; border-radius: 8px; }
            .address-title { font-weight: bold; color: white; margin-bottom: 12px; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
            .address-content { color: white; font-size: 13px; line-height: 1.8; }
            .table-container { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; }
            thead tr { background: #4facfe; color: white; }
            th { padding: 12px; text-align: left; font-weight: 600; }
            tbody td { padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568; }
            tfoot td { padding: 12px; }
            .summary-section { margin-top: 20px; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .summary-label { color: #4a5568; font-weight: 500; }
            .summary-value { color: #4a5568; font-weight: 600; text-align: right; }
            .grand-total { background: linear-gradient(135deg, ${colors.primaryStart} 0%, ${colors.primaryEnd} 100%); color: white; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 10px; }
            .note { margin-top: 15px; font-size: 12px; color: #6b7280; font-style: italic; }
            .footer-section { margin-top: 40px; display: flex; gap: 30px; }
            .terms-section { flex: 1; }
            .terms-title { font-weight: bold; color: #4a5568; margin-bottom: 10px; font-size: 16px; }
            .terms-content { color: #4a5568; font-size: 13px; line-height: 1.8; white-space: pre-line; }
            .signature-section { flex: 1; text-align: right; }
            .signature-box { display: inline-block; text-align: center; }
            .signature-photo { max-width: 150px; max-height: 100px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 10px; }
            .signature-text { color: #4a5568; font-size: 14px; font-weight: 600; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <!-- Header Section -->
            <div class="header-section">
              <div class="header-left">
                <div class="logo-container">
                  <div class="logo-box">${logoUrl ? '' : 'LOGO'}</div>
                  <div class="company-name">${companyDetails.companyName || 'Nefol'}</div>
                </div>
              </div>
              <div class="header-right">
                <div class="company-details">
                  ${companyDetails.companyAddress ? `<div><strong>Address:</strong> ${companyDetails.companyAddress}</div>` : ''}
                  ${companyDetails.companyPhone ? `<div><strong>Phone:</strong> ${companyDetails.companyPhone}</div>` : ''}
                  ${companyDetails.companyEmail ? `<div><strong>Email:</strong> ${companyDetails.companyEmail}</div>` : ''}
                  ${companyDetails.gstNumber ? `<div><strong>GST No:</strong> ${companyDetails.gstNumber}</div>` : ''}
                  ${companyDetails.panNumber ? `<div><strong>PAN No:</strong> ${companyDetails.panNumber}</div>` : ''}
                  ${companyDetails.bankName ? `<div><strong>Bank:</strong> ${companyDetails.bankName}</div>` : ''}
                  ${companyDetails.accountNumber ? `<div><strong>Account No:</strong> ${companyDetails.accountNumber}</div>` : ''}
                  ${companyDetails.ifscCode ? `<div><strong>IFSC:</strong> ${companyDetails.ifscCode}</div>` : ''}
                </div>
              </div>
            </div>
            
            <!-- Invoice Title -->
            <div class="invoice-title">Tax Invoice</div>
            
            <!-- Invoice Info -->
            <div class="invoice-info">
              <div>
                <div style="margin-bottom: 5px;"><strong>Invoice No.:</strong> ${order.order_number || 'N/A'}</div>
                <div><strong>Date:</strong> ${formatDate(order.created_at)}</div>
              </div>
              <div>
                <div><strong>Time:</strong> ${formatDateTime(order.created_at).split(' ')[1] || 'N/A'}</div>
              </div>
            </div>
            
            <!-- Address Section -->
            <div class="address-section">
              <div class="address-left">
                <div class="address-title">Shipping Address</div>
                <div class="address-content">${formatShippingAddress()}</div>
              </div>
              <div class="address-right">
                <div class="address-title">Billing Address</div>
                <div class="address-content">${formatBillingAddress()}</div>
              </div>
            </div>
            
            <!-- Product Table -->
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
                <tbody>${invoiceItems}</tbody>
              </table>
            </div>
            
            <!-- Summary Section -->
            <div class="summary-section">
              <div class="summary-row">
                <div class="summary-label">MRP</div>
                <div class="summary-value">${currency}${mrp.toFixed(2)}</div>
              </div>
              ${totalDiscount > 0 ? `
              <div class="summary-row">
                <div class="summary-label">Product Discount</div>
                <div class="summary-value" style="color: #dc2626;">-${currency}${totalDiscount.toFixed(2)}</div>
              </div>
              ` : ''}
              <div class="summary-row">
                <div class="summary-label">Subtotal</div>
                <div class="summary-value">${currency}${finalSubtotal.toFixed(2)}</div>
              </div>
              ${shippingCharges > 0 ? `
              <div class="summary-row">
                <div class="summary-label">Shipping Charges</div>
                <div class="summary-value">${currency}${shippingCharges.toFixed(2)}</div>
              </div>
              ` : ''}
              <div class="summary-row">
                <div class="summary-label">Tax (GST ${taxSettings.rate.toFixed(0)}%)</div>
                <div class="summary-value">${currency}${recalculatedTax.toFixed(2)}</div>
              </div>
              <div class="grand-total">
                <div>Grand Total</div>
                <div>${currency}${finalTotal.toFixed(2)}</div>
              </div>
              <div class="note">* MRP includes GST</div>
            </div>
            
            <!-- Terms and Conditions & Signature Section -->
            <div class="footer-section">
              <div class="terms-section">
                <div class="terms-title">Terms and Conditions</div>
                <div class="terms-content">${terms || 'Thank you for doing business with us.'}</div>
              </div>
              <div class="signature-section">
                <div class="signature-box">
                  ${signatoryPhotoUrl ? `<img src="${signatoryPhotoUrl}" alt="Signature" class="signature-photo" />` : ''}
                  <div class="signature-text">${signature || 'Authorized Signatory'}</div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
        }
        catch (error) {
            return `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Invoice Generation Error</h1><p>Failed to generate invoice. Please try again.</p><p>Error: ${error}</p></body></html>`;
        }
    }
    // ==================== Admin Notifications ====================
    async function createAdminNotification(pool, type, title, message, link, icon, priority = 'medium', metadata, userId) {
        const { rows } = await pool.query(`
      INSERT INTO admin_notifications (user_id, notification_type, title, message, link, icon, priority, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [userId || null, type, title, message, link || null, icon || null, priority, metadata ? JSON.stringify(metadata) : '{}']);
        io.to('admin-panel').emit('new-notification', rows[0]);
        return rows[0];
    }
    app.get('/api/admin/notifications', async (req, res) => {
        try {
            const { status = 'unread', limit = 50 } = req.query;
            const { rows } = await pool.query(`
        SELECT * FROM admin_notifications
        ${status !== 'all' ? 'WHERE status = $1' : ''}
        ORDER BY created_at DESC
        LIMIT $${status !== 'all' ? '2' : '1'}
      `, status !== 'all' ? [status, limit] : [limit]);
            (0, apiHelpers_1.sendSuccess)(res, rows);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch notifications', err);
        }
    });
    app.get('/api/admin/notifications/unread-count', async (_req, res) => {
        try {
            const { rows } = await pool.query(`SELECT COUNT(*) as count FROM admin_notifications WHERE status = 'unread'`);
            (0, apiHelpers_1.sendSuccess)(res, { count: parseInt(rows[0].count) });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch unread count', err);
        }
    });
    app.put('/api/admin/notifications/:id/read', async (req, res) => {
        try {
            const { id } = req.params;
            await pool.query(`UPDATE admin_notifications SET status = 'read', read_at = NOW() WHERE id = $1`, [id]);
            (0, apiHelpers_1.sendSuccess)(res, { message: 'Notification marked as read' });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to mark notification as read', err);
        }
    });
    app.put('/api/admin/notifications/read-all', async (_req, res) => {
        try {
            await pool.query(`UPDATE admin_notifications SET status = 'read', read_at = NOW() WHERE status = 'unread'`);
            (0, apiHelpers_1.sendSuccess)(res, { message: 'All notifications marked as read' });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to mark all notifications as read', err);
        }
    });
    app.delete('/api/admin/notifications/:id', async (req, res) => {
        try {
            const { id } = req.params;
            await pool.query(`DELETE FROM admin_notifications WHERE id = $1`, [id]);
            (0, apiHelpers_1.sendSuccess)(res, { message: 'Notification deleted' });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete notification', err);
        }
    });
}
