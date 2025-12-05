"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveConfig = saveConfig;
exports.listErrors = listErrors;
exports.clearErrors = clearErrors;
exports.catalogCSV = catalogCSV;
exports.syncAllProducts = syncAllProducts;
exports.syncStockPrice = syncStockPrice;
exports.jobStatus = jobStatus;
exports.saveFieldMapping = saveFieldMapping;
exports.getFieldMapping = getFieldMapping;
exports.webhook = webhook;
const apiHelpers_1 = require("../utils/apiHelpers");
const notifications_1 = require("./notifications");
const jobs = {};
async function ensureTables(pool) {
    await pool.query(`
    create table if not exists facebook_config (
      id serial primary key,
      page_id text,
      access_token text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    create table if not exists facebook_sync_errors (
      id serial primary key,
      product_id int,
      code text,
      message text,
      payload jsonb,
      created_at timestamptz default now()
    );
    create table if not exists facebook_field_mapping (
      id serial primary key,
      key text unique,
      value text,
      updated_at timestamptz default now()
    );
  `);
}
async function saveConfig(pool, req, res) {
    try {
        await ensureTables(pool);
        const { page_id, access_token } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ page_id, access_token }, ['page_id', 'access_token']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        await pool.query('insert into facebook_config (page_id, access_token, created_at, updated_at) values ($1, $2, now(), now())', [page_id, access_token]);
        (0, apiHelpers_1.sendSuccess)(res, { success: true }, 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to save Facebook config', err);
    }
}
async function listErrors(pool, req, res) {
    try {
        await ensureTables(pool);
        const { rows } = await pool.query('select * from facebook_sync_errors order by created_at desc limit 500');
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to list sync errors', err);
    }
}
async function clearErrors(pool, req, res) {
    try {
        await ensureTables(pool);
        await pool.query('delete from facebook_sync_errors');
        (0, apiHelpers_1.sendSuccess)(res, { cleared: true });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to clear sync errors', err);
    }
}
async function catalogCSV(pool, req, res) {
    try {
        // Minimal Facebook/Instagram catalog CSV
        // Required columns: id,title,description,availability,condition,price,link,image_link,brand,inventory
        const { rows: products } = await pool.query(`
      select id, slug, title, description, price, list_image, category from products order by id desc
    `);
        const host = `${req.protocol}://${req.get('host')}`;
        const lines = [];
        lines.push(['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand', 'inventory'].join(','));
        for (const p of products) {
            const id = p.id;
            const title = (p.title || '').replace(/[",\n\r]+/g, ' ').trim();
            const description = (p.description || '').replace(/[",\n\r]+/g, ' ').slice(0, 4000);
            const availability = 'in stock';
            const condition = 'new';
            const price = `${Number(p.price || 0).toFixed(2)} INR`;
            const link = `${host}/#/user/product/${encodeURIComponent(p.slug)}`;
            const image_link = p.list_image ? `${host}${p.list_image}` : '';
            const brand = 'Nefol';
            const inventory = '100';
            const row = [id, title, description, availability, condition, price, link, image_link, brand, inventory].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',');
            lines.push(row);
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'inline; filename="catalog.csv"');
        res.send(lines.join('\n'));
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to generate catalog feed', err);
    }
}
async function syncAllProducts(pool, req, res) {
    try {
        await ensureTables(pool);
        const { rows: products } = await pool.query('select id, slug, title, price from products order by id desc');
        // Stub push; in real flow call Graph API and record errors
        const jobId = `job_${Date.now()}`;
        jobs[jobId] = { id: jobId, type: 'products', total: products.length, success: 0, failed: 0, started_at: Date.now(), running: true };
        (async () => {
            for (const p of products) {
                try {
                    // simulate push latency
                    await new Promise(r => setTimeout(r, 5));
                    jobs[jobId].success++;
                }
                catch (e) {
                    jobs[jobId].failed++;
                    await pool.query('insert into facebook_sync_errors (product_id, code, message, payload) values ($1,$2,$3,$4)', [p.id, 'API_ERROR', e?.message || 'Unknown', JSON.stringify(p)]);
                }
            }
            jobs[jobId].running = false;
            jobs[jobId].finished_at = Date.now();
            if (jobs[jobId].failed > 0) {
                try {
                    await (0, notifications_1.sendAlert)(pool, { subject: 'FB Sync Errors', text: `Product sync finished with ${jobs[jobId].failed} failures out of ${jobs[jobId].total}.` });
                }
                catch { }
            }
        })();
        (0, apiHelpers_1.sendSuccess)(res, { jobId, queued: products.length });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to sync products', err);
    }
}
async function syncStockPrice(pool, req, res) {
    try {
        await ensureTables(pool);
        // Optional: accept specific items; otherwise, sync all
        const items = Array.isArray(req.body?.items) ? req.body.items : null;
        let rows;
        if (items && items.length > 0) {
            const ids = items.map((it) => it.productId).filter(Boolean);
            const { rows: pr } = await pool.query('select id, price from products where id = any($1::int[])', [ids]);
            rows = pr;
        }
        else {
            const { rows: pr } = await pool.query('select id, price from products order by id desc');
            rows = pr;
        }
        const jobId = `job_${Date.now()}`;
        jobs[jobId] = { id: jobId, type: 'stock', total: rows.length, success: 0, failed: 0, started_at: Date.now(), running: true };
        (async () => {
            for (const r of rows) {
                try {
                    await new Promise(r => setTimeout(r, 5));
                    jobs[jobId].success++;
                }
                catch (e) {
                    jobs[jobId].failed++;
                }
            }
            jobs[jobId].running = false;
            jobs[jobId].finished_at = Date.now();
        })();
        (0, apiHelpers_1.sendSuccess)(res, { jobId, queued: rows.length });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to sync stock/price', err);
    }
}
async function jobStatus(pool, req, res) {
    try {
        const { id } = req.params;
        const job = jobs[id];
        if (!job)
            return (0, apiHelpers_1.sendError)(res, 404, 'Job not found');
        (0, apiHelpers_1.sendSuccess)(res, job);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch job status', err);
    }
}
async function saveFieldMapping(pool, req, res) {
    try {
        await ensureTables(pool);
        const mapping = req.body || {};
        await pool.query('begin');
        for (const [k, v] of Object.entries(mapping)) {
            await pool.query(`insert into facebook_field_mapping (key, value, updated_at) values ($1,$2, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`, [k, String(v)]);
        }
        await pool.query('commit');
        (0, apiHelpers_1.sendSuccess)(res, { saved: Object.keys(mapping).length });
    }
    catch (err) {
        await pool.query('rollback');
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to save field mapping', err);
    }
}
async function getFieldMapping(pool, req, res) {
    try {
        await ensureTables(pool);
        const { rows } = await pool.query('select key, value from facebook_field_mapping');
        const mapping = {};
        for (const r of rows)
            mapping[r.key] = r.value;
        (0, apiHelpers_1.sendSuccess)(res, mapping);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to load field mapping', err);
    }
}
async function webhook(pool, req, res) {
    try {
        // Stub receiver for Meta webhook; record errors/events to sync_errors
        const body = req.body || {};
        if (Array.isArray(body?.errors)) {
            for (const e of body.errors) {
                await pool.query('insert into facebook_sync_errors (product_id, code, message, payload) values ($1,$2,$3,$4)', [e.product_id || null, e.code || 'WEBHOOK', e.message || 'Webhook Error', JSON.stringify(e)]);
            }
        }
        (0, apiHelpers_1.sendSuccess)(res, { ok: true });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to handle webhook', err);
    }
}
