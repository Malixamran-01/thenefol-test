"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAmazonAccount = saveAmazonAccount;
exports.listAmazonAccounts = listAmazonAccounts;
exports.syncProductsToAmazon = syncProductsToAmazon;
exports.importAmazonOrders = importAmazonOrders;
const apiHelpers_1 = require("../utils/apiHelpers");
async function saveAmazonAccount(pool, req, res) {
    try {
        const { name, credentials } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ name, credentials }, ['name', 'credentials']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const { rows } = await pool.query(`insert into marketplace_accounts (channel, name, credentials, is_active, created_at, updated_at)
       values ('amazon', $1, $2::jsonb, true, now(), now())
       on conflict (channel, name) do update set credentials = excluded.credentials, updated_at = now()
       returning *`, [name, JSON.stringify(credentials)]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0]);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to save Amazon account', err);
    }
}
async function listAmazonAccounts(pool, req, res) {
    try {
        const { rows } = await pool.query(`select * from marketplace_accounts where channel = 'amazon' order by created_at desc`);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to list Amazon accounts', err);
    }
}
// Stubs for sync; implementation will require SP-API auth and feeds/orders APIs
async function syncProductsToAmazon(pool, req, res) {
    try {
        const { accountId, productId } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ accountId }, ['accountId']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        // record listing intent
        if (productId) {
            await pool.query(`insert into channel_listings (channel, account_id, product_id, status, created_at, updated_at)
         values ('amazon', $1, $2, 'pending', now(), now())
         on conflict do nothing`, [accountId, productId]);
        }
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Product sync queued (stub)' });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to sync products to Amazon', err);
    }
}
async function importAmazonOrders(pool, req, res) {
    try {
        const { accountId } = req.query;
        if (!accountId)
            return (0, apiHelpers_1.sendError)(res, 400, 'accountId is required');
        // stub: mark a channel_orders row
        await pool.query(`insert into channel_orders (channel, account_id, external_order_id, status, imported_at, updated_at)
       values ('amazon', $1, $2, 'imported', now(), now())
       on conflict (channel, external_order_id) do nothing`, [accountId, `AMZ-${Date.now()}`]);
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Order import triggered (stub)' });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to import Amazon orders', err);
    }
}
