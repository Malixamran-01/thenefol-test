"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveFlipkartAccount = saveFlipkartAccount;
exports.listFlipkartAccounts = listFlipkartAccounts;
exports.syncProductsToFlipkart = syncProductsToFlipkart;
exports.importFlipkartOrders = importFlipkartOrders;
const apiHelpers_1 = require("../utils/apiHelpers");
async function saveFlipkartAccount(pool, req, res) {
    try {
        const { name, credentials } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ name, credentials }, ['name', 'credentials']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const { rows } = await pool.query(`insert into marketplace_accounts (channel, name, credentials, is_active, created_at, updated_at)
       values ('flipkart', $1, $2::jsonb, true, now(), now())
       on conflict (channel, name) do update set credentials = excluded.credentials, updated_at = now()
       returning *`, [name, JSON.stringify(credentials)]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0]);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to save Flipkart account', err);
    }
}
async function listFlipkartAccounts(pool, req, res) {
    try {
        const { rows } = await pool.query(`select * from marketplace_accounts where channel = 'flipkart' order by created_at desc`);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to list Flipkart accounts', err);
    }
}
async function syncProductsToFlipkart(pool, req, res) {
    try {
        const { accountId, productId } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ accountId }, ['accountId']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        if (productId) {
            await pool.query(`insert into channel_listings (channel, account_id, product_id, status, created_at, updated_at)
         values ('flipkart', $1, $2, 'pending', now(), now())
         on conflict do nothing`, [accountId, productId]);
        }
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Product sync queued (stub)' });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to sync products to Flipkart', err);
    }
}
async function importFlipkartOrders(pool, req, res) {
    try {
        const { accountId } = req.query;
        if (!accountId)
            return (0, apiHelpers_1.sendError)(res, 400, 'accountId is required');
        await pool.query(`insert into channel_orders (channel, account_id, external_order_id, status, imported_at, updated_at)
       values ('flipkart', $1, $2, 'imported', now(), now())
       on conflict (channel, external_order_id) do nothing`, [accountId, `FK-${Date.now()}`]);
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Order import triggered (stub)' });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to import Flipkart orders', err);
    }
}
