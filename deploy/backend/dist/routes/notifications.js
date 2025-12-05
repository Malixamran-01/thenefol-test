"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveConfig = saveConfig;
exports.getConfig = getConfig;
exports.testWhatsApp = testWhatsApp;
exports.testEmail = testEmail;
exports.sendAlert = sendAlert;
const apiHelpers_1 = require("../utils/apiHelpers");
const nodemailer_1 = __importDefault(require("nodemailer"));
async function ensureTables(pool) {
    await pool.query(`
    create table if not exists notification_config (
      id serial primary key,
      whatsapp_token text,
      whatsapp_phone_id text,
      notify_phone text,
      smtp_provider text, -- gmail|hostinger|godaddy|custom
      smtp_host text,
      smtp_port int,
      smtp_user text,
      smtp_pass text,
      notify_email text,
      from_email text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
  `);
}
async function saveConfig(pool, req, res) {
    try {
        await ensureTables(pool);
        const cfg = req.body || {};
        await pool.query(`insert into notification_config (whatsapp_token, whatsapp_phone_id, notify_phone, smtp_provider, smtp_host, smtp_port, smtp_user, smtp_pass, notify_email, from_email, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now(), now())`, [cfg.whatsapp_token || null, cfg.whatsapp_phone_id || null, cfg.notify_phone || null, cfg.smtp_provider || null, cfg.smtp_host || null, cfg.smtp_port || null, cfg.smtp_user || null, cfg.smtp_pass || null, cfg.notify_email || null, cfg.from_email || null]);
        (0, apiHelpers_1.sendSuccess)(res, { saved: true }, 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to save notification config', err);
    }
}
async function getConfig(pool, req, res) {
    try {
        await ensureTables(pool);
        const { rows } = await pool.query('select * from notification_config order by id desc limit 1');
        (0, apiHelpers_1.sendSuccess)(res, rows[0] || null);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch notification config', err);
    }
}
async function testWhatsApp(pool, req, res) {
    try {
        await ensureTables(pool);
        const { phone_number, message } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ phone_number, message }, ['phone_number', 'message']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const { rows } = await pool.query('select whatsapp_token, whatsapp_phone_id from notification_config order by id desc limit 1');
        const token = rows[0]?.whatsapp_token;
        const phoneId = rows[0]?.whatsapp_phone_id;
        if (!token || !phoneId)
            return (0, apiHelpers_1.sendError)(res, 400, 'WhatsApp config missing');
        const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneId)}/messages`;
        const payload = { messaging_product: 'whatsapp', to: phone_number, type: 'text', text: { body: message } };
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
        const data = await resp.json();
        if (!resp.ok)
            return (0, apiHelpers_1.sendError)(res, 400, 'WhatsApp send failed', data);
        (0, apiHelpers_1.sendSuccess)(res, { sent: true, id: data?.messages?.[0]?.id || null });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to send WhatsApp message', err);
    }
}
function createTransport(cfg) {
    if (cfg.smtp_provider === 'gmail') {
        return nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: {
                user: cfg.smtp_user,
                pass: cfg.smtp_pass
            }
        });
    }
    if (cfg.smtp_provider === 'hostinger') {
        // Hostinger SMTP settings
        return nodemailer_1.default.createTransport({
            host: cfg.smtp_host || 'smtp.hostinger.com',
            port: Number(cfg.smtp_port || 587),
            secure: false, // true for 465, false for other ports
            auth: {
                user: cfg.smtp_user,
                pass: cfg.smtp_pass
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }
    if (cfg.smtp_provider === 'godaddy') {
        // GoDaddy SMTP settings
        return nodemailer_1.default.createTransport({
            host: cfg.smtp_host || 'smtpout.secureserver.net',
            port: Number(cfg.smtp_port || 587),
            secure: false, // true for 465, false for other ports
            auth: {
                user: cfg.smtp_user,
                pass: cfg.smtp_pass
            },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
        });
    }
    // Custom SMTP
    return nodemailer_1.default.createTransport({
        host: cfg.smtp_host,
        port: Number(cfg.smtp_port || 587),
        secure: Number(cfg.smtp_port) === 465,
        auth: {
            user: cfg.smtp_user,
            pass: cfg.smtp_pass
        },
        tls: {
            rejectUnauthorized: false
        }
    });
}
async function testEmail(pool, req, res) {
    try {
        await ensureTables(pool);
        const { to, subject, text } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ to, subject, text }, ['to', 'subject', 'text']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const { rows } = await pool.query('select * from notification_config order by id desc limit 1');
        const cfg = rows[0];
        if (!cfg?.smtp_user || !cfg?.smtp_pass)
            return (0, apiHelpers_1.sendError)(res, 400, 'SMTP config missing');
        const transporter = createTransport(cfg);
        const info = await transporter.sendMail({ from: cfg.from_email || cfg.smtp_user, to, subject, text });
        (0, apiHelpers_1.sendSuccess)(res, { sent: true, messageId: info.messageId });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to send email', err);
    }
}
async function getCfg(pool) {
    const { rows } = await pool.query('select * from notification_config order by id desc limit 1');
    return rows[0];
}
async function sendAlert(pool, params) {
    try {
        const cfg = await getCfg(pool);
        if (!cfg)
            return;
        // WhatsApp
        if (cfg.whatsapp_token && cfg.whatsapp_phone_id && cfg.notify_phone) {
            try {
                const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(cfg.whatsapp_phone_id)}/messages`;
                const payload = { messaging_product: 'whatsapp', to: cfg.notify_phone, type: 'text', text: { body: params.text } };
                await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.whatsapp_token}` }, body: JSON.stringify(payload) });
            }
            catch { }
        }
        // Email
        if (cfg.smtp_user && cfg.smtp_pass && (cfg.notify_email || cfg.from_email)) {
            try {
                const transporter = createTransport(cfg);
                await transporter.sendMail({ from: cfg.from_email || cfg.smtp_user, to: cfg.notify_email || cfg.from_email, subject: params.subject, text: params.text });
            }
            catch { }
        }
    }
    catch { }
}
