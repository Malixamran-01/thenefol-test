"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdateOrderStatus = bulkUpdateOrderStatus;
exports.bulkGenerateShippingLabels = bulkGenerateShippingLabels;
exports.bulkDownloadInvoices = bulkDownloadInvoices;
exports.bulkUpdateProductPrices = bulkUpdateProductPrices;
const apiHelpers_1 = require("../utils/apiHelpers");
async function bulkUpdateOrderStatus(pool, req, res) {
    try {
        const { orderIds, status } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ orderIds, status }, ['orderIds', 'status']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const ids = Array.isArray(orderIds) ? orderIds : [];
        if (ids.length === 0)
            return (0, apiHelpers_1.sendError)(res, 400, 'orderIds must be non-empty array');
        const { rows } = await pool.query(`update orders set status = $2, updated_at = now() where id = any($1::int[]) returning id, status`, [ids, status]);
        (0, apiHelpers_1.sendSuccess)(res, { updated: rows.length });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Bulk update order status failed', err);
    }
}
async function bulkGenerateShippingLabels(pool, req, res) {
    try {
        const { orderIds } = req.body || {};
        if (!Array.isArray(orderIds) || orderIds.length === 0)
            return (0, apiHelpers_1.sendError)(res, 400, 'orderIds required');
        // Stub: just acknowledge request
        (0, apiHelpers_1.sendSuccess)(res, { queued: orderIds.length });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Bulk shipping label generation failed', err);
    }
}
async function bulkDownloadInvoices(pool, req, res) {
    try {
        const { orderIds } = req.body || {};
        if (!Array.isArray(orderIds) || orderIds.length === 0)
            return (0, apiHelpers_1.sendError)(res, 400, 'orderIds required');
        // Stub: return links list placeholder
        const links = orderIds.map((id) => ({ orderId: id, url: `/invoices/${id}.pdf` }));
        (0, apiHelpers_1.sendSuccess)(res, { links });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Bulk invoice download failed', err);
    }
}
async function bulkUpdateProductPrices(pool, req, res) {
    try {
        const { items } = req.body || {};
        if (!Array.isArray(items) || items.length === 0)
            return (0, apiHelpers_1.sendError)(res, 400, 'items required');
        let updated = 0;
        for (const it of items) {
            if (!it?.productId || it.price === undefined)
                continue;
            await pool.query(`update products set price = $2, updated_at = now() where id = $1`, [it.productId, String(it.price)]);
            updated++;
        }
        (0, apiHelpers_1.sendSuccess)(res, { updated });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Bulk product price update failed', err);
    }
}
