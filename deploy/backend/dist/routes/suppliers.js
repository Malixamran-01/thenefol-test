"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupplier = createSupplier;
exports.listSuppliers = listSuppliers;
exports.createPurchaseOrder = createPurchaseOrder;
exports.listPurchaseOrders = listPurchaseOrders;
const apiHelpers_1 = require("../utils/apiHelpers");
async function createSupplier(pool, req, res) {
    try {
        const { name, email, phone, address, contact_person, payment_terms, notes } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ name }, ['name']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const { rows } = await pool.query(`insert into suppliers (name, email, phone, address, contact_person, payment_terms, notes, created_at, updated_at)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, now(), now()) returning *`, [name, email || null, phone || null, JSON.stringify(address || {}), contact_person || null, payment_terms || null, JSON.stringify(notes || {})]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create supplier', err);
    }
}
async function listSuppliers(pool, req, res) {
    try {
        const { rows } = await pool.query('select * from suppliers order by name asc');
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to list suppliers', err);
    }
}
async function createPurchaseOrder(pool, req, res) {
    try {
        const { supplier_id, items, total_amount, due_date, created_by } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ supplier_id, items }, ['supplier_id', 'items']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const po_number = `PO-${Date.now()}`;
        const { rows } = await pool.query(`insert into purchase_orders (po_number, supplier_id, items, total_amount, due_date, created_by, created_at, updated_at)
       values ($1, $2, $3::jsonb, $4, $5, $6, now(), now()) returning *`, [po_number, supplier_id, JSON.stringify(items), total_amount, due_date, created_by || null]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create purchase order', err);
    }
}
async function listPurchaseOrders(pool, req, res) {
    try {
        const { rows } = await pool.query(`select po.*, s.name as supplier_name
       from purchase_orders po
       left join suppliers s on s.id = po.supplier_id
       order by po.created_at desc`);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to list purchase orders', err);
    }
}
