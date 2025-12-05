"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listReturns = listReturns;
exports.createReturn = createReturn;
exports.updateReturnStatus = updateReturnStatus;
exports.generateReturnLabel = generateReturnLabel;
const apiHelpers_1 = require("../utils/apiHelpers");
const notifications_1 = require("./notifications");
async function ensureTable(pool) {
    await pool.query(`
    create table if not exists returns (
      id serial primary key,
      order_id int not null,
      status text not null default 'requested',
      items jsonb not null default '[]'::jsonb,
      reason text,
      label_url text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
}
async function listReturns(pool, req, res) {
    try {
        await ensureTable(pool);
        const { rows } = await pool.query(`select * from returns order by created_at desc`);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to list returns', err);
    }
}
async function createReturn(pool, req, res) {
    try {
        await ensureTable(pool);
        const { order_id, items, reason } = req.body || {};
        if (!order_id)
            return (0, apiHelpers_1.sendError)(res, 400, 'order_id is required');
        const { rows } = await pool.query(`insert into returns (order_id, items, reason) values ($1, $2, $3) returning *`, [order_id, JSON.stringify(Array.isArray(items) ? items : []), reason || null]);
        try {
            await (0, notifications_1.sendAlert)(pool, { subject: 'New Return Requested', text: `Return created for Order #${order_id}. Reason: ${reason || 'N/A'}` });
        }
        catch { }
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create return', err);
    }
}
async function updateReturnStatus(pool, req, res) {
    try {
        await ensureTable(pool);
        const { id } = req.params;
        const { status } = req.body || {};
        if (!status)
            return (0, apiHelpers_1.sendError)(res, 400, 'status is required');
        const { rows } = await pool.query(`update returns set status = $2, updated_at = now() where id = $1 returning *`, [id, status]);
        if (rows.length === 0)
            return (0, apiHelpers_1.sendError)(res, 404, 'Return not found');
        (0, apiHelpers_1.sendSuccess)(res, rows[0]);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to update return status', err);
    }
}
async function generateReturnLabel(pool, req, res) {
    try {
        await ensureTable(pool);
        const { id } = req.params;
        const label_url = `/returns/label-${id}-${Date.now()}.pdf`;
        const { rows } = await pool.query(`update returns set label_url = $2, updated_at = now() where id = $1 returning *`, [id, label_url]);
        if (rows.length === 0)
            return (0, apiHelpers_1.sendError)(res, 404, 'Return not found');
        (0, apiHelpers_1.sendSuccess)(res, { id, label_url });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to generate return label', err);
    }
}
