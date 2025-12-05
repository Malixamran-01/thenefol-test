"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPOSTransaction = createPOSTransaction;
exports.listPOSTransactions = listPOSTransactions;
exports.openPOSSession = openPOSSession;
exports.closePOSSession = closePOSSession;
exports.generateBarcode = generateBarcode;
exports.scanBarcode = scanBarcode;
const apiHelpers_1 = require("../utils/apiHelpers");
async function createPOSTransaction(pool, req, res) {
    try {
        const { staff_id, items, subtotal, tax = 0, discount = 0, total, payment_method } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ staff_id, items, subtotal, total, payment_method }, ['staff_id', 'items', 'subtotal', 'total', 'payment_method']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const transaction_number = `POS-${Date.now()}`;
        const { rows } = await pool.query(`insert into pos_transactions (transaction_number, staff_id, items, subtotal, tax, discount, total, payment_method, created_at, updated_at)
       values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, now(), now()) returning *`, [transaction_number, staff_id, JSON.stringify(items), subtotal, tax, discount, total, payment_method]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create POS transaction', err);
    }
}
async function listPOSTransactions(pool, req, res) {
    try {
        const { rows } = await pool.query(`select pt.*, su.name as staff_name
       from pos_transactions pt
       left join staff_users su on su.id = pt.staff_id
       order by pt.created_at desc`);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to list POS transactions', err);
    }
}
async function openPOSSession(pool, req, res) {
    try {
        const { staff_id, opening_amount = 0 } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ staff_id }, ['staff_id']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const { rows } = await pool.query(`insert into pos_sessions (staff_id, opened_at, opening_amount, status)
       values ($1, now(), $2, 'open') returning *`, [staff_id, opening_amount]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to open POS session', err);
    }
}
async function closePOSSession(pool, req, res) {
    try {
        const { sessionId, closing_amount } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ sessionId, closing_amount }, ['sessionId', 'closing_amount']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const { rows } = await pool.query(`update pos_sessions set closed_at = now(), closing_amount = $2, status = 'closed'
       where id = $1 and status = 'open'
       returning *`, [sessionId, closing_amount]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0] || null);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to close POS session', err);
    }
}
async function generateBarcode(pool, req, res) {
    try {
        const { product_id, variant_id, barcode_type = 'EAN13' } = req.body || {};
        if (!product_id && !variant_id)
            return (0, apiHelpers_1.sendError)(res, 400, 'product_id or variant_id required');
        const barcode = `BAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { rows } = await pool.query(`insert into barcodes (barcode, product_id, variant_id, barcode_type, is_active, created_at)
       values ($1, $2, $3, $4, true, now()) returning *`, [barcode, product_id || null, variant_id || null, barcode_type]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        if (err?.code === '23505')
            return (0, apiHelpers_1.sendError)(res, 409, 'Barcode already exists');
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to generate barcode', err);
    }
}
async function scanBarcode(pool, req, res) {
    try {
        const { barcode } = req.query;
        if (!barcode)
            return (0, apiHelpers_1.sendError)(res, 400, 'barcode is required');
        const { rows } = await pool.query(`select b.*, p.title as product_title, pv.attributes
       from barcodes b
       left join products p on p.id = b.product_id
       left join product_variants pv on pv.id = b.variant_id
       where b.barcode = $1 and b.is_active = true`, [barcode]);
        if (rows.length === 0)
            return (0, apiHelpers_1.sendError)(res, 404, 'Barcode not found');
        (0, apiHelpers_1.sendSuccess)(res, rows[0]);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to scan barcode', err);
    }
}
