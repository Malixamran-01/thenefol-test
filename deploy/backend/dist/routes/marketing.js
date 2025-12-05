"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiveChatWidgets = exports.getLiveChatAgents = exports.getLiveChatSessions = exports.createScheduledWhatsAppMessage = exports.getScheduledWhatsAppMessages = exports.createWhatsAppAutomation = exports.createWhatsAppTemplate = exports.saveWhatsAppConfig = exports.getWhatsAppConfig = exports.sendWhatsAppMessage = exports.getWhatsAppAutomations = exports.getWhatsAppTemplates = exports.getWhatsAppChats = exports.getPushAutomations = exports.getPushTemplates = exports.getPushNotifications = exports.updateSMSAutomation = exports.createSMSAutomation = exports.getSMSAutomations = exports.getSMSTemplates = exports.deleteSMSCampaign = exports.updateSMSCampaign = exports.createSMSCampaign = exports.getSMSCampaigns = exports.updateEmailAutomation = exports.createEmailAutomation = exports.getEmailAutomations = exports.getEmailSendingLogs = exports.addEmailSubscribers = exports.createEmailList = exports.getEmailLists = exports.sendEmailCampaign = exports.deleteEmailTemplate = exports.updateEmailTemplate = exports.createEmailTemplate = exports.getEmailTemplates = exports.deleteEmailCampaign = exports.updateEmailCampaign = exports.createEmailCampaign = exports.getEmailCampaigns = exports.redeemCashback = exports.getCashbackTransactions = exports.getCashbackOffers = exports.getCashbackWallet = void 0;
const apiHelpers_1 = require("../utils/apiHelpers");
const nodemailer_1 = __importDefault(require("nodemailer"));
// ==================== CASHBACK SYSTEM ====================
const getCashbackWallet = async (pool, req, res) => {
    try {
        const userId = req.userId;
        const role = req.headers['x-user-role'];
        // For admin users, return aggregate data or allow querying by user_id
        if (role === 'admin' || role === 'manager') {
            const queryUserId = req.query.user_id || userId;
            // If no user_id provided and no userId from token, return aggregate stats
            if (!queryUserId) {
                const aggregateResult = await pool.query(`
          SELECT 
            COALESCE(SUM(total * 0.05), 0) as total_earned,
            COALESCE(SUM(CASE WHEN status IN ('pending', 'approved') THEN total * 0.05 ELSE 0 END), 0) as pending_amount,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN total * 0.05 ELSE 0 END), 0) as used_amount
          FROM orders
        `);
                const totalEarned = parseFloat(aggregateResult.rows[0]?.total_earned || 0);
                const pendingAmount = parseFloat(aggregateResult.rows[0]?.pending_amount || 0);
                const usedAmount = parseFloat(aggregateResult.rows[0]?.used_amount || 0);
                const availableBalance = totalEarned - usedAmount;
                return (0, apiHelpers_1.sendSuccess)(res, {
                    totalEarned: Math.floor(totalEarned * 10), // Convert to coins (1 rupee = 10 coins)
                    availableBalance: Math.floor(availableBalance * 10),
                    pendingAmount: Math.floor(pendingAmount * 10),
                    usedAmount: Math.floor(usedAmount * 10),
                    nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
                    payoutMethod: 'Bank Transfer'
                });
            }
            // Admin querying specific user's wallet
            const walletResult = await pool.query(`
        SELECT 
          COALESCE(SUM(total * 0.05), 0) as total_earned,
          COALESCE(SUM(total), 0) as total_spent
        FROM orders 
        WHERE customer_email = (
          SELECT email FROM users WHERE id = $1
        )
      `, [queryUserId]);
            const totalEarned = parseFloat(walletResult.rows[0]?.total_earned || 0);
            const totalSpent = walletResult.rows[0]?.total_spent || 0;
            // Get pending and used amounts from transactions
            const transactionsResult = await pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN status = 'credited' THEN amount ELSE 0 END), 0) as used_amount
        FROM cashback_transactions
        WHERE user_id = $1
      `, [queryUserId]);
            const pendingAmount = parseFloat(transactionsResult.rows[0]?.pending_amount || 0);
            const usedAmount = parseFloat(transactionsResult.rows[0]?.used_amount || 0);
            const availableBalance = totalEarned - usedAmount;
            return (0, apiHelpers_1.sendSuccess)(res, {
                totalEarned: Math.floor(totalEarned * 10), // Convert to coins
                availableBalance: Math.floor(availableBalance * 10),
                pendingAmount: Math.floor(pendingAmount * 10),
                usedAmount: Math.floor(usedAmount * 10),
                nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                payoutMethod: 'Bank Transfer'
            });
        }
        // Regular user flow
        if (!userId) {
            return (0, apiHelpers_1.sendError)(res, 401, 'Unauthorized');
        }
        // Get cashback wallet balance from orders (5% of total spent)
        const walletResult = await pool.query(`
      SELECT 
        COALESCE(SUM(total * 0.05), 0) as total_earned,
        COALESCE(SUM(total), 0) as total_spent
      FROM orders 
      WHERE customer_email = (
        SELECT email FROM users WHERE id = $1
      )
    `, [userId]);
        const totalEarned = parseFloat(walletResult.rows[0]?.total_earned || 0);
        const totalSpent = walletResult.rows[0]?.total_spent || 0;
        // Get pending and used amounts from transactions
        const transactionsResult = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'credited' THEN amount ELSE 0 END), 0) as used_amount
      FROM cashback_transactions
      WHERE user_id = $1
    `, [userId]);
        const pendingAmount = parseFloat(transactionsResult.rows[0]?.pending_amount || 0);
        const usedAmount = parseFloat(transactionsResult.rows[0]?.used_amount || 0);
        const availableBalance = totalEarned - usedAmount;
        (0, apiHelpers_1.sendSuccess)(res, {
            totalEarned: Math.floor(totalEarned * 10), // Convert to coins (1 rupee = 10 coins)
            availableBalance: Math.floor(availableBalance * 10),
            pendingAmount: Math.floor(pendingAmount * 10),
            usedAmount: Math.floor(usedAmount * 10),
            nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            payoutMethod: 'Bank Transfer'
        });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch cashback wallet', err);
    }
};
exports.getCashbackWallet = getCashbackWallet;
const getCashbackOffers = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM cashback_offers
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch cashback offers', err);
    }
};
exports.getCashbackOffers = getCashbackOffers;
const getCashbackTransactions = async (pool, req, res) => {
    try {
        const userId = req.userId || req.headers['user-id'];
        const role = req.headers['x-user-role'];
        const queryUserId = req.query.user_id || userId;
        // For admin users, return all transactions or filter by user_id if provided
        if (role === 'admin' || role === 'manager') {
            if (queryUserId) {
                const { rows } = await pool.query(`
          SELECT * FROM cashback_transactions
          WHERE user_id = $1
          ORDER BY created_at DESC
        `, [queryUserId]);
                return (0, apiHelpers_1.sendSuccess)(res, rows);
            }
            else {
                // Return all transactions for admin overview
                const { rows } = await pool.query(`
          SELECT * FROM cashback_transactions
          ORDER BY created_at DESC
          LIMIT 100
        `);
                return (0, apiHelpers_1.sendSuccess)(res, rows);
            }
        }
        // Regular user flow - require userId
        if (!userId || userId === '0') {
            return (0, apiHelpers_1.sendError)(res, 401, 'Unauthorized');
        }
        const { rows } = await pool.query(`
      SELECT * FROM cashback_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch cashback transactions', err);
    }
};
exports.getCashbackTransactions = getCashbackTransactions;
const redeemCashback = async (pool, req, res) => {
    try {
        const userId = req.headers['user-id'] || '0';
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Invalid amount');
        }
        // Get current balance
        const walletResult = await pool.query(`
      SELECT COALESCE(SUM(total * 0.05), 0) as balance
      FROM orders 
      WHERE customer_email = (
        SELECT email FROM users WHERE id = $1
      )
    `, [userId]);
        const balance = walletResult.rows[0]?.balance || 0;
        if (amount > balance) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Insufficient cashback balance');
        }
        // Create transaction record
        const { rows } = await pool.query(`
      INSERT INTO cashback_transactions (user_id, amount, transaction_type, status)
      VALUES ($1, $2, 'redeem', 'pending')
      RETURNING *
    `, [userId, amount]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to redeem cashback', err);
    }
};
exports.redeemCashback = redeemCashback;
// ==================== EMAIL MARKETING ====================
// Helper function to get SMTP config and create transport
async function getEmailTransport(pool) {
    const { rows } = await pool.query('SELECT * FROM notification_config ORDER BY id DESC LIMIT 1');
    const cfg = rows[0];
    if (!cfg?.smtp_user || !cfg?.smtp_pass) {
        throw new Error('SMTP configuration not found. Please configure email settings first.');
    }
    if (cfg.smtp_provider === 'gmail') {
        return nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: { user: cfg.smtp_user, pass: cfg.smtp_pass }
        });
    }
    if (cfg.smtp_provider === 'hostinger') {
        return nodemailer_1.default.createTransport({
            host: cfg.smtp_host || 'smtp.hostinger.com',
            port: Number(cfg.smtp_port || 587),
            secure: false,
            auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
            tls: { rejectUnauthorized: false }
        });
    }
    if (cfg.smtp_provider === 'godaddy') {
        return nodemailer_1.default.createTransport({
            host: cfg.smtp_host || 'smtpout.secureserver.net',
            port: Number(cfg.smtp_port || 587),
            secure: false,
            auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
            tls: { ciphers: 'SSLv3', rejectUnauthorized: false }
        });
    }
    // Custom SMTP
    return nodemailer_1.default.createTransport({
        host: cfg.smtp_host,
        port: Number(cfg.smtp_port || 587),
        secure: Number(cfg.smtp_port) === 465,
        auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
        tls: { rejectUnauthorized: false }
    });
}
const getEmailCampaigns = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT l.id) as total_sent,
        COUNT(DISTINCT CASE WHEN l.status = 'opened' THEN l.id END) as total_opened,
        COUNT(DISTINCT CASE WHEN l.status = 'clicked' THEN l.id END) as total_clicked
      FROM email_campaigns c
      LEFT JOIN email_sending_logs l ON l.campaign_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch email campaigns', err);
    }
};
exports.getEmailCampaigns = getEmailCampaigns;
const createEmailCampaign = async (pool, req, res) => {
    try {
        const { name, subject, content, audience, type, scheduled_date } = req.body;
        if (!name || !subject || !content) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Name, subject, and content are required');
        }
        const { rows } = await pool.query(`
      INSERT INTO email_campaigns (name, subject, content, audience, status, scheduled_date, type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, subject, content, audience || 'all', scheduled_date ? 'scheduled' : 'draft', scheduled_date || null, type || 'promotional']);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create email campaign', err);
    }
};
exports.createEmailCampaign = createEmailCampaign;
const updateEmailCampaign = async (pool, req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const { rows } = await pool.query(`
      UPDATE email_campaigns 
      SET ${Object.keys(body).map((key, i) => `${key} = $${i + 2}`).join(', ')}
      WHERE id = $1
      RETURNING *
    `, [id, ...Object.values(body)]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Campaign not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, rows[0]);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to update email campaign', err);
    }
};
exports.updateEmailCampaign = updateEmailCampaign;
const deleteEmailCampaign = async (pool, req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(`
      DELETE FROM email_campaigns
      WHERE id = $1
      RETURNING *
    `, [id]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Campaign not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Campaign deleted successfully' });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete email campaign', err);
    }
};
exports.deleteEmailCampaign = deleteEmailCampaign;
const getEmailTemplates = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM email_templates
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch email templates', err);
    }
};
exports.getEmailTemplates = getEmailTemplates;
const createEmailTemplate = async (pool, req, res) => {
    try {
        const { name, subject, content, category } = req.body;
        if (!name || !subject || !content) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Name, subject, and content are required');
        }
        const { rows } = await pool.query(`
      INSERT INTO email_templates (name, subject, content, category)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, subject, content, category || 'general']);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create email template', err);
    }
};
exports.createEmailTemplate = createEmailTemplate;
const updateEmailTemplate = async (pool, req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const { rows } = await pool.query(`
      UPDATE email_templates
      SET ${Object.keys(body).map((key, i) => `${key} = $${i + 2}`).join(', ')}
      WHERE id = $1
      RETURNING *
    `, [id, ...Object.values(body)]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Template not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, rows[0]);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to update email template', err);
    }
};
exports.updateEmailTemplate = updateEmailTemplate;
const deleteEmailTemplate = async (pool, req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(`
      DELETE FROM email_templates
      WHERE id = $1
      RETURNING *
    `, [id]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Template not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Template deleted successfully' });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete email template', err);
    }
};
exports.deleteEmailTemplate = deleteEmailTemplate;
// Send email campaign to recipients
const sendEmailCampaign = async (pool, req, res) => {
    try {
        const { campaign_id, recipient_emails, recipient_list_id } = req.body;
        if (!campaign_id) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Campaign ID is required');
        }
        // Get campaign details
        const campaignResult = await pool.query('SELECT * FROM email_campaigns WHERE id = $1', [campaign_id]);
        if (campaignResult.rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Campaign not found');
        }
        const campaign = campaignResult.rows[0];
        // Get recipients
        let recipients = [];
        if (recipient_list_id) {
            const listResult = await pool.query(`
        SELECT email, name FROM email_subscribers 
        WHERE list_id = $1 AND status = 'subscribed'
      `, [recipient_list_id]);
            recipients = listResult.rows;
        }
        else if (recipient_emails && Array.isArray(recipient_emails)) {
            recipients = recipient_emails.map((email) => ({ email }));
        }
        else if (campaign.audience === 'all') {
            // Get all subscribed users
            const usersResult = await pool.query('SELECT email, name FROM users WHERE email IS NOT NULL');
            recipients = usersResult.rows;
        }
        else {
            return (0, apiHelpers_1.sendError)(res, 400, 'Recipients not specified');
        }
        if (recipients.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 400, 'No recipients found');
        }
        // Get SMTP config
        const transporter = await getEmailTransport(pool);
        const { rows: cfgRows } = await pool.query('SELECT from_email, smtp_user FROM notification_config ORDER BY id DESC LIMIT 1');
        const fromEmail = cfgRows[0]?.from_email || cfgRows[0]?.smtp_user;
        // Send emails in batches (rate limiting)
        const batchSize = 10;
        let sentCount = 0;
        let failedCount = 0;
        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            await Promise.all(batch.map(async (recipient) => {
                try {
                    const info = await transporter.sendMail({
                        from: fromEmail,
                        to: recipient.email,
                        subject: campaign.subject,
                        html: campaign.content,
                        text: campaign.content.replace(/<[^>]*>/g, '') // Strip HTML for text version
                    });
                    // Log successful send
                    await pool.query(`
            INSERT INTO email_sending_logs (campaign_id, recipient_email, recipient_name, subject, status, message_id, sent_at)
            VALUES ($1, $2, $3, $4, 'sent', $5, NOW())
          `, [campaign_id, recipient.email, recipient.name || null, campaign.subject, info.messageId]);
                    sentCount++;
                }
                catch (error) {
                    // Log failed send
                    await pool.query(`
            INSERT INTO email_sending_logs (campaign_id, recipient_email, recipient_name, subject, status, error_message, sent_at)
            VALUES ($1, $2, $3, $4, 'failed', $5, NOW())
          `, [campaign_id, recipient.email, recipient.name || null, campaign.subject, error.message]);
                    failedCount++;
                }
            }));
            // Rate limiting: wait 1 second between batches
            if (i + batchSize < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        // Update campaign status
        await pool.query(`
      UPDATE email_campaigns 
      SET status = 'sent', sent_date = NOW(), sent_count = $1
      WHERE id = $2
    `, [sentCount, campaign_id]);
        (0, apiHelpers_1.sendSuccess)(res, {
            message: 'Campaign sent successfully',
            sent: sentCount,
            failed: failedCount,
            total: recipients.length
        });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to send email campaign', err);
    }
};
exports.sendEmailCampaign = sendEmailCampaign;
// Get email lists
const getEmailLists = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT 
        l.*,
        COUNT(DISTINCT s.id) as subscriber_count
      FROM email_lists l
      LEFT JOIN email_subscribers s ON s.list_id = l.id AND s.status = 'subscribed'
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch email lists', err);
    }
};
exports.getEmailLists = getEmailLists;
// Create email list
const createEmailList = async (pool, req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return (0, apiHelpers_1.sendError)(res, 400, 'List name is required');
        }
        const { rows } = await pool.query(`
      INSERT INTO email_lists (name, description)
      VALUES ($1, $2)
      RETURNING *
    `, [name, description || null]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create email list', err);
    }
};
exports.createEmailList = createEmailList;
// Add subscribers to list
const addEmailSubscribers = async (pool, req, res) => {
    try {
        const { list_id, subscribers } = req.body;
        if (!list_id || !subscribers || !Array.isArray(subscribers)) {
            return (0, apiHelpers_1.sendError)(res, 400, 'List ID and subscribers array are required');
        }
        const added = [];
        const errors = [];
        for (const sub of subscribers) {
            try {
                const { rows } = await pool.query(`
          INSERT INTO email_subscribers (email, name, list_id, status)
          VALUES ($1, $2, $3, 'subscribed')
          ON CONFLICT (email, list_id) DO UPDATE SET
            name = COALESCE(EXCLUDED.name, email_subscribers.name),
            status = 'subscribed',
            subscribed_at = NOW(),
            unsubscribed_at = NULL
          RETURNING *
        `, [sub.email, sub.name || null, list_id]);
                added.push(rows[0]);
            }
            catch (error) {
                errors.push({ email: sub.email, error: error.message });
            }
        }
        // Update subscriber count
        await pool.query(`
      UPDATE email_lists 
      SET subscriber_count = (SELECT COUNT(*) FROM email_subscribers WHERE list_id = $1 AND status = 'subscribed')
      WHERE id = $1
    `, [list_id]);
        (0, apiHelpers_1.sendSuccess)(res, { added: added.length, errors: errors.length, details: { added, errors } });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to add subscribers', err);
    }
};
exports.addEmailSubscribers = addEmailSubscribers;
// Get sending logs for a campaign
const getEmailSendingLogs = async (pool, req, res) => {
    try {
        const { campaign_id } = req.query;
        let query = 'SELECT * FROM email_sending_logs';
        const params = [];
        if (campaign_id) {
            query += ' WHERE campaign_id = $1';
            params.push(campaign_id);
        }
        query += ' ORDER BY created_at DESC LIMIT 1000';
        const { rows } = await pool.query(query, params);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch sending logs', err);
    }
};
exports.getEmailSendingLogs = getEmailSendingLogs;
const getEmailAutomations = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM email_automations
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch email automations', err);
    }
};
exports.getEmailAutomations = getEmailAutomations;
const createEmailAutomation = async (pool, req, res) => {
    try {
        const body = req.body;
        const { name, trigger, condition, action, is_active } = body;
        const { rows } = await pool.query(`
      INSERT INTO email_automations (name, trigger, condition, action, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, trigger, condition, action, is_active || false]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create email automation', err);
    }
};
exports.createEmailAutomation = createEmailAutomation;
const updateEmailAutomation = async (pool, req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const { rows } = await pool.query(`
      UPDATE email_automations
      SET ${Object.keys(body).map((key, i) => `${key} = $${i + 2}`).join(', ')}
      WHERE id = $1
      RETURNING *
    `, [id, ...Object.values(body)]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Automation not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, rows[0]);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to update email automation', err);
    }
};
exports.updateEmailAutomation = updateEmailAutomation;
// ==================== SMS MARKETING ====================
const getSMSCampaigns = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM sms_campaigns
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch SMS campaigns', err);
    }
};
exports.getSMSCampaigns = getSMSCampaigns;
const createSMSCampaign = async (pool, req, res) => {
    try {
        const body = req.body;
        const { name, message, audience, scheduled_date } = body;
        const { rows } = await pool.query(`
      INSERT INTO sms_campaigns (name, message, audience, scheduled_date, status)
      VALUES ($1, $2, $3, $4, 'draft')
      RETURNING *
    `, [name, message, audience, scheduled_date]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create SMS campaign', err);
    }
};
exports.createSMSCampaign = createSMSCampaign;
const updateSMSCampaign = async (pool, req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const { rows } = await pool.query(`
      UPDATE sms_campaigns
      SET ${Object.keys(body).map((key, i) => `${key} = $${i + 2}`).join(', ')}
      WHERE id = $1
      RETURNING *
    `, [id, ...Object.values(body)]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Campaign not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, rows[0]);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to update SMS campaign', err);
    }
};
exports.updateSMSCampaign = updateSMSCampaign;
const deleteSMSCampaign = async (pool, req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(`
      DELETE FROM sms_campaigns
      WHERE id = $1
      RETURNING *
    `, [id]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Campaign not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Campaign deleted successfully' });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete SMS campaign', err);
    }
};
exports.deleteSMSCampaign = deleteSMSCampaign;
const getSMSTemplates = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM sms_templates
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch SMS templates', err);
    }
};
exports.getSMSTemplates = getSMSTemplates;
const getSMSAutomations = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM sms_automations
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch SMS automations', err);
    }
};
exports.getSMSAutomations = getSMSAutomations;
const createSMSAutomation = async (pool, req, res) => {
    try {
        const body = req.body;
        const { name, trigger, condition, action, is_active } = body;
        const { rows } = await pool.query(`
      INSERT INTO sms_automations (name, trigger, condition, action, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, trigger, condition, action, is_active || false]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create SMS automation', err);
    }
};
exports.createSMSAutomation = createSMSAutomation;
const updateSMSAutomation = async (pool, req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const { rows } = await pool.query(`
      UPDATE sms_automations
      SET ${Object.keys(body).map((key, i) => `${key} = $${i + 2}`).join(', ')}
      WHERE id = $1
      RETURNING *
    `, [id, ...Object.values(body)]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Automation not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, rows[0]);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to update SMS automation', err);
    }
};
exports.updateSMSAutomation = updateSMSAutomation;
// ==================== PUSH NOTIFICATIONS ====================
const getPushNotifications = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM push_notifications
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch push notifications', err);
    }
};
exports.getPushNotifications = getPushNotifications;
const getPushTemplates = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM push_templates
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch push templates', err);
    }
};
exports.getPushTemplates = getPushTemplates;
const getPushAutomations = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM push_automations
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch push automations', err);
    }
};
exports.getPushAutomations = getPushAutomations;
// ==================== WHATSAPP CHAT ====================
const getWhatsAppChats = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM whatsapp_chat_sessions
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch WhatsApp chats', err);
    }
};
exports.getWhatsAppChats = getWhatsAppChats;
const getWhatsAppTemplates = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM whatsapp_templates
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch WhatsApp templates', err);
    }
};
exports.getWhatsAppTemplates = getWhatsAppTemplates;
const getWhatsAppAutomations = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM whatsapp_automations
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch WhatsApp automations', err);
    }
};
exports.getWhatsAppAutomations = getWhatsAppAutomations;
// Send WhatsApp message via Facebook Graph API
const sendWhatsAppMessage = async (pool, req, res) => {
    try {
        const { to, template, message } = req.body;
        // Get WhatsApp credentials from environment
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        if (!accessToken || !phoneNumberId) {
            console.error('❌ WhatsApp credentials not configured');
            console.error('   Missing:', !accessToken ? 'WHATSAPP_ACCESS_TOKEN' : '', !phoneNumberId ? 'WHATSAPP_PHONE_NUMBER_ID' : '');
            return (0, apiHelpers_1.sendError)(res, 400, 'WhatsApp credentials not configured. Please check your environment variables.');
        }
        if (!to) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Recipient phone number is required');
        }
        // Prepare the request body
        let requestBody;
        // If template is provided, use template message format
        if (template && template.name) {
            requestBody = {
                messaging_product: 'whatsapp',
                to: to,
                type: 'template',
                template: {
                    name: template.name,
                    language: {
                        code: template.language || 'en_US'
                    }
                }
            };
        }
        else if (message) {
            // Use text message
            requestBody = {
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: {
                    body: message
                }
            };
        }
        else {
            return (0, apiHelpers_1.sendError)(res, 400, 'Either template or message is required');
        }
        // Make request to Facebook Graph API
        const facebookUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
        const response = await fetch(facebookUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        const responseData = await response.json();
        if (!response.ok) {
            console.error('❌ WhatsApp API error:', JSON.stringify(responseData, null, 2));
            console.error('   Phone:', to);
            console.error('   Status:', response.status);
            return (0, apiHelpers_1.sendError)(res, response.status, responseData.error?.message || 'Failed to send WhatsApp message', responseData);
        }
        // Log the message to database if chat_sessions table exists
        try {
            await pool.query(`
        INSERT INTO whatsapp_chat_sessions (customer_name, customer_phone, last_message, last_message_time, status)
        VALUES ($1, $2, $3, NOW(), 'active')
      `, [`Customer_${to}`, to, message || JSON.stringify(template)]);
        }
        catch (dbErr) {
            console.error('Failed to log WhatsApp message:', dbErr);
        }
        (0, apiHelpers_1.sendSuccess)(res, {
            message: 'WhatsApp message sent successfully',
            whatsappResponse: responseData
        });
    }
    catch (err) {
        console.error('WhatsApp send error:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to send WhatsApp message', err);
    }
};
exports.sendWhatsAppMessage = sendWhatsAppMessage;
// ==================== WHATSAPP CONFIGURATION ====================
const getWhatsAppConfig = async (pool, req, res) => {
    try {
        const config = {
            accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
            phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
            businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
            webhookUrl: process.env.WHATSAPP_WEBHOOK_URL || '',
            verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || ''
        };
        (0, apiHelpers_1.sendSuccess)(res, config);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch WhatsApp config', err);
    }
};
exports.getWhatsAppConfig = getWhatsAppConfig;
const saveWhatsAppConfig = async (pool, req, res) => {
    try {
        const { accessToken, phoneNumberId, businessAccountId, webhookUrl, verifyToken } = req.body;
        // In production, you would save these to a secure configuration store
        // For now, we'll just validate and return success
        // You should update the .env file or use a secure config management system
        if (!accessToken || !phoneNumberId) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Access token and phone number ID are required');
        }
        // Store in database for persistence
        await pool.query(`
      INSERT INTO whatsapp_config (access_token, phone_number_id, business_account_id, webhook_url, verify_token, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE SET
        access_token = $1,
        phone_number_id = $2,
        business_account_id = $3,
        webhook_url = $4,
        verify_token = $5,
        updated_at = NOW()
    `, [accessToken, phoneNumberId, businessAccountId || null, webhookUrl || null, verifyToken || null]);
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Configuration saved successfully' });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to save WhatsApp config', err);
    }
};
exports.saveWhatsAppConfig = saveWhatsAppConfig;
const createWhatsAppTemplate = async (pool, req, res) => {
    try {
        const { name, content, category, language, scheduled_date, scheduled_time, is_scheduled } = req.body;
        if (!name || !content) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Name and content are required');
        }
        const { rows } = await pool.query(`
      INSERT INTO whatsapp_templates (name, category, content, is_approved, scheduled_date, scheduled_time, is_scheduled, created_at, updated_at)
      VALUES ($1, $2, $3, false, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [name, category || 'Custom', content, scheduled_date || null, scheduled_time || null, is_scheduled || false]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create template', err);
    }
};
exports.createWhatsAppTemplate = createWhatsAppTemplate;
const createWhatsAppAutomation = async (pool, req, res) => {
    try {
        const { name, trigger, action, template_id, scheduled_date, scheduled_time, is_scheduled } = req.body;
        if (!name || !trigger) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Name and trigger are required');
        }
        const { rows } = await pool.query(`
      INSERT INTO whatsapp_automations (name, trigger, condition, action, template_id, scheduled_date, scheduled_time, is_scheduled, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW(), NOW())
      RETURNING *
    `, [name, trigger, 'Always', action || 'Send WhatsApp Message', template_id || null, scheduled_date || null, scheduled_time || null, is_scheduled || false]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create automation', err);
    }
};
exports.createWhatsAppAutomation = createWhatsAppAutomation;
// Get scheduled WhatsApp messages
const getScheduledWhatsAppMessages = async (pool, req, res) => {
    try {
        const { status } = req.query;
        let query = `
      SELECT sm.*, 
             t.name as template_name,
             a.name as automation_name
      FROM whatsapp_scheduled_messages sm
      LEFT JOIN whatsapp_templates t ON sm.template_id = t.id
      LEFT JOIN whatsapp_automations a ON sm.automation_id = a.id
    `;
        const params = [];
        if (status) {
            query += ' WHERE sm.status = $1';
            params.push(status);
        }
        query += ' ORDER BY sm.scheduled_at ASC';
        const { rows } = await pool.query(query, params);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch scheduled messages', err);
    }
};
exports.getScheduledWhatsAppMessages = getScheduledWhatsAppMessages;
// Create scheduled WhatsApp message
const createScheduledWhatsAppMessage = async (pool, req, res) => {
    try {
        const { template_id, automation_id, phone, message, scheduled_at } = req.body;
        if (!phone || !message || !scheduled_at) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Phone, message, and scheduled_at are required');
        }
        const { rows } = await pool.query(`
      INSERT INTO whatsapp_scheduled_messages (template_id, automation_id, phone, message, scheduled_at, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
      RETURNING *
    `, [template_id || null, automation_id || null, phone, message, scheduled_at]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create scheduled message', err);
    }
};
exports.createScheduledWhatsAppMessage = createScheduledWhatsAppMessage;
// ==================== LIVE CHAT ====================
const getLiveChatSessions = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT 
        s.*,
        COALESCE(NULLIF(s.customer_name, ''), NULLIF(u.name, ''), 'User') as customer_name,
        COALESCE(NULLIF(s.customer_email, ''), NULLIF(u.email, ''), '') as customer_email
      FROM live_chat_sessions s
      LEFT JOIN users u ON s.user_id::text = u.id::text
      ORDER BY s.last_message_time DESC NULLS LAST, s.created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch live chat sessions', err);
    }
};
exports.getLiveChatSessions = getLiveChatSessions;
const getLiveChatAgents = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM live_chat_agents
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch live chat agents', err);
    }
};
exports.getLiveChatAgents = getLiveChatAgents;
const getLiveChatWidgets = async (pool, req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT * FROM live_chat_widgets
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch live chat widgets', err);
    }
};
exports.getLiveChatWidgets = getLiveChatWidgets;
