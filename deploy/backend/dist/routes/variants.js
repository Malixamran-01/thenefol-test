"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setVariantOptions = setVariantOptions;
exports.getVariantOptions = getVariantOptions;
exports.generateVariants = generateVariants;
exports.listVariants = listVariants;
exports.createVariant = createVariant;
exports.updateVariant = updateVariant;
exports.deleteVariant = deleteVariant;
const apiHelpers_1 = require("../utils/apiHelpers");
function generateCombinations(optionValues) {
    if (optionValues.length === 0)
        return [];
    let result = [[]];
    for (const values of optionValues) {
        const next = [];
        for (const combo of result) {
            for (const v of values)
                next.push([...combo, v]);
        }
        result = next;
    }
    return result;
}
async function setVariantOptions(pool, req, res) {
    try {
        const { id: productId } = req.params;
        const { options } = req.body || {};
        if (!Array.isArray(options) || options.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 400, 'options is required and must be a non-empty array');
        }
        // Validate product
        const prod = await pool.query('select id from products where id = $1', [productId]);
        if (prod.rows.length === 0)
            return (0, apiHelpers_1.sendError)(res, 404, 'Product not found');
        // Upsert: remove previous and insert fresh set
        await pool.query('delete from variant_options where product_id = $1', [productId]);
        const inserted = [];
        for (const opt of options) {
            const name = String(opt?.name || '').trim();
            const values = Array.isArray(opt?.values) ? opt.values.map((v) => String(v)) : [];
            if (!name || values.length === 0)
                continue;
            const { rows } = await pool.query('insert into variant_options (product_id, name, values) values ($1, $2, $3) returning *', [productId, name, values]);
            inserted.push(rows[0]);
        }
        (0, apiHelpers_1.sendSuccess)(res, inserted);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to set variant options', err);
    }
}
async function getVariantOptions(pool, req, res) {
    try {
        const { id: productId } = req.params;
        const { rows } = await pool.query('select id, name, values from variant_options where product_id = $1 order by id asc', [productId]);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch variant options', err);
    }
}
async function generateVariants(pool, req, res) {
    try {
        const { id: productId } = req.params;
        // read options
        const { rows: optionRows } = await pool.query('select name, values from variant_options where product_id = $1 order by id asc', [productId]);
        if (optionRows.length === 0)
            return (0, apiHelpers_1.sendError)(res, 400, 'No variant options configured');
        const optionNames = optionRows.map((o) => o.name);
        const optionValues = optionRows.map((o) => o.values || []);
        const combos = generateCombinations(optionValues);
        if (combos.length === 0)
            return (0, apiHelpers_1.sendSuccess)(res, []);
        // Delete existing variants for a clean regenerate
        await pool.query('delete from product_variants where product_id = $1', [productId]);
        const created = [];
        for (const combo of combos) {
            const attributes = {};
            combo.forEach((v, i) => (attributes[optionNames[i]] = v));
            const sku = `SKU-${productId}-${Object.values(attributes).join('-')}`.replace(/\s+/g, '').toUpperCase();
            const { rows } = await pool.query('insert into product_variants (product_id, sku, attributes) values ($1, $2, $3) returning *', [productId, sku, JSON.stringify(attributes)]);
            // Ensure inventory row exists
            await pool.query(`insert into inventory (product_id, variant_id, quantity, reserved, low_stock_threshold)
         values ($1, $2, 0, 0, 0)
         on conflict (product_id, variant_id) do nothing`, [productId, rows[0].id]);
            created.push(rows[0]);
        }
        (0, apiHelpers_1.sendSuccess)(res, created);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to generate variants', err);
    }
}
async function listVariants(pool, req, res) {
    try {
        const { id: productId } = req.params;
        const { rows } = await pool.query(`select pv.*,
              coalesce(json_build_object('quantity', i.quantity, 'reserved', i.reserved, 'low_stock_threshold', i.low_stock_threshold), '{ }'::json) as inventory
       from product_variants pv
       left join inventory i on i.variant_id = pv.id
       where pv.product_id = $1
       order by pv.id asc`, [productId]);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch variants', err);
    }
}
async function createVariant(pool, req, res) {
    try {
        const { id: productId } = req.params;
        const { attributes, sku, price, mrp, image_url, barcode, is_active = true } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ attributes }, ['attributes']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const { rows } = await pool.query(`insert into product_variants (product_id, sku, attributes, price, mrp, image_url, barcode, is_active)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`, [productId, sku || null, JSON.stringify(attributes), price || null, mrp || null, image_url || null, barcode || null, is_active]);
        // ensure inventory
        await pool.query(`insert into inventory (product_id, variant_id, quantity, reserved, low_stock_threshold)
       values ($1, $2, 0, 0, 0)
       on conflict (product_id, variant_id) do nothing`, [productId, rows[0].id]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create variant', err);
    }
}
async function updateVariant(pool, req, res) {
    try {
        const { variantId } = req.params;
        const allowed = ['sku', 'attributes', 'price', 'mrp', 'image_url', 'barcode', 'is_active'];
        const updates = {};
        for (const k of allowed)
            if (req.body?.[k] !== undefined)
                updates[k] = k === 'attributes' ? JSON.stringify(req.body[k]) : req.body[k];
        if (Object.keys(updates).length === 0)
            return (0, apiHelpers_1.sendError)(res, 400, 'No fields to update');
        const set = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
        const values = [variantId, ...Object.keys(updates).map(k => updates[k])];
        const { rows } = await pool.query(`update product_variants set ${set}, updated_at = now() where id = $1 returning *`, values);
        if (rows.length === 0)
            return (0, apiHelpers_1.sendError)(res, 404, 'Variant not found');
        (0, apiHelpers_1.sendSuccess)(res, rows[0]);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to update variant', err);
    }
}
async function deleteVariant(pool, req, res) {
    try {
        const { variantId } = req.params;
        const { rows } = await pool.query('delete from product_variants where id = $1 returning *', [variantId]);
        if (rows.length === 0)
            return (0, apiHelpers_1.sendError)(res, 404, 'Variant not found');
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Variant deleted successfully' });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete variant', err);
    }
}
