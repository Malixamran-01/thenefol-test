"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWarehouse = createWarehouse;
exports.listWarehouses = listWarehouses;
exports.createStockTransfer = createStockTransfer;
exports.listStockTransfers = listStockTransfers;
const apiHelpers_1 = require("../utils/apiHelpers");
async function createWarehouse(pool, req, res) {
    try {
        const { name, address, is_active = true } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ name }, ['name']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const { rows } = await pool.query(`insert into warehouses (name, address, is_active, created_at, updated_at)
       values ($1, $2::jsonb, $3, now(), now()) returning *`, [name, JSON.stringify(address || {}), is_active]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        if (err?.code === '23505')
            return (0, apiHelpers_1.sendError)(res, 409, 'Warehouse name already exists');
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create warehouse', err);
    }
}
async function listWarehouses(pool, req, res) {
    try {
        const { rows } = await pool.query('select * from warehouses order by created_at desc');
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to list warehouses', err);
    }
}
async function createStockTransfer(pool, req, res) {
    try {
        const { from_warehouse_id, to_warehouse_id, product_id, variant_id, quantity } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ from_warehouse_id, to_warehouse_id, product_id, quantity }, ['from_warehouse_id', 'to_warehouse_id', 'product_id', 'quantity']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const { rows } = await pool.query(`insert into stock_transfers (from_warehouse_id, to_warehouse_id, product_id, variant_id, quantity, created_at, updated_at)
       values ($1, $2, $3, $4, $5, now(), now()) returning *`, [from_warehouse_id, to_warehouse_id, product_id, variant_id || null, quantity]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create stock transfer', err);
    }
}
async function listStockTransfers(pool, req, res) {
    try {
        const { rows } = await pool.query(`select st.*, fw.name as from_warehouse_name, tw.name as to_warehouse_name
       from stock_transfers st
       join warehouses fw on fw.id = st.from_warehouse_id
       join warehouses tw on tw.id = st.to_warehouse_id
       order by st.created_at desc`);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to list stock transfers', err);
    }
}
