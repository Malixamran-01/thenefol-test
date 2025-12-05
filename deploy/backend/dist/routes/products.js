"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProducts = getProducts;
exports.getProductById = getProductById;
exports.getProductBySlug = getProductBySlug;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.bulkDeleteProducts = bulkDeleteProducts;
exports.uploadProductImages = uploadProductImages;
exports.getProductImages = getProductImages;
exports.deleteProductImage = deleteProductImage;
exports.getProductsCSV = getProductsCSV;
const apiHelpers_1 = require("../utils/apiHelpers");
// Optimized GET /api/products
async function getProducts(pool, res) {
    try {
        console.log(`📋 Fetching all products from database...`);
        const { rows } = await pool.query(`
      SELECT p.*, 
             COALESCE(
               json_agg(
                 json_build_object('url', pi.url, 'type', COALESCE(pi.type, 'pdp'))
               ) FILTER (WHERE pi.url IS NOT NULL AND (pi.type = 'pdp' OR pi.type IS NULL)), 
               '[]'::json
             ) as pdp_images,
             COALESCE(
               json_agg(
                 json_build_object('url', pi_banner.url, 'type', 'banner')
               ) FILTER (WHERE pi_banner.url IS NOT NULL AND pi_banner.type = 'banner'), 
               '[]'::json
             ) as banner_images
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND (pi.type = 'pdp' OR pi.type IS NULL)
      LEFT JOIN product_images pi_banner ON p.id = pi_banner.product_id AND pi_banner.type = 'banner'
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
        console.log(`✅ Retrieved ${rows.length} products from database`);
        // Transform the data to match expected format
        const products = rows.map((product) => ({
            ...product,
            pdp_images: product.pdp_images.filter((img) => img.url).map((img) => img.url),
            banner_images: product.banner_images.filter((img) => img.url).map((img) => img.url)
        }));
        (0, apiHelpers_1.sendSuccess)(res, products);
    }
    catch (err) {
        console.error(`❌ Failed to fetch products:`, err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch products', err);
    }
}
// Optimized GET /api/products/:id
async function getProductById(pool, req, res) {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(`
      SELECT p.*, 
             COALESCE(
               json_agg(
                 json_build_object('url', pi.url, 'type', COALESCE(pi.type, 'pdp'))
               ) FILTER (WHERE pi.url IS NOT NULL AND (pi.type = 'pdp' OR pi.type IS NULL)), 
               '[]'::json
             ) as pdp_images,
             COALESCE(
               json_agg(
                 json_build_object('url', pi_banner.url, 'type', 'banner')
               ) FILTER (WHERE pi_banner.url IS NOT NULL AND pi_banner.type = 'banner'), 
               '[]'::json
             ) as banner_images
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND (pi.type = 'pdp' OR pi.type IS NULL)
      LEFT JOIN product_images pi_banner ON p.id = pi_banner.product_id AND pi_banner.type = 'banner'
      WHERE p.id = $1
      GROUP BY p.id
    `, [id]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Product not found');
        }
        const product = {
            ...rows[0],
            pdp_images: rows[0].pdp_images.filter((img) => img.url).map((img) => img.url),
            banner_images: rows[0].banner_images.filter((img) => img.url).map((img) => img.url)
        };
        (0, apiHelpers_1.sendSuccess)(res, product);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch product', err);
    }
}
// Optimized GET /api/products/slug/:slug
async function getProductBySlug(pool, req, res) {
    try {
        const { slug } = req.params;
        const { rows } = await pool.query(`
      SELECT p.*, 
             COALESCE(
               json_agg(
                 json_build_object('url', pi.url, 'type', COALESCE(pi.type, 'pdp'))
               ) FILTER (WHERE pi.url IS NOT NULL AND (pi.type = 'pdp' OR pi.type IS NULL)), 
               '[]'::json
             ) as pdp_images,
             COALESCE(
               json_agg(
                 json_build_object('url', pi_banner.url, 'type', 'banner')
               ) FILTER (WHERE pi_banner.url IS NOT NULL AND pi_banner.type = 'banner'), 
               '[]'::json
             ) as banner_images
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND (pi.type = 'pdp' OR pi.type IS NULL)
      LEFT JOIN product_images pi_banner ON p.id = pi_banner.product_id AND pi_banner.type = 'banner'
      WHERE p.slug = $1
      GROUP BY p.id
    `, [slug]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Product not found');
        }
        const product = {
            ...rows[0],
            pdp_images: rows[0].pdp_images.filter((img) => img.url).map((img) => img.url),
            banner_images: rows[0].banner_images.filter((img) => img.url).map((img) => img.url)
        };
        (0, apiHelpers_1.sendSuccess)(res, product);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch product', err);
    }
}
// Optimized POST /api/products
async function createProduct(pool, req, res) {
    try {
        const { slug, title, category = '', price = '', listImage = '', description = '', details = {} } = req.body || {};
        // Validate required fields
        const validationError = (0, apiHelpers_1.validateRequired)(req.body, ['slug', 'title']);
        if (validationError) {
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        }
        console.log(`📦 Creating product: ${title} (slug: ${slug})`);
        const { rows } = await pool.query(`
      INSERT INTO products (slug, title, category, price, list_image, description, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [slug, title, category, price, listImage, description, JSON.stringify(details)]);
        console.log(`✅ Product created successfully: ID=${rows[0].id}, Title=${rows[0].title}`);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        console.error(`❌ Failed to create product:`, err);
        if (err?.code === '23505') {
            (0, apiHelpers_1.sendError)(res, 409, 'Product slug must be unique');
        }
        else {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to create product', err);
        }
    }
}
// Optimized PUT /api/products/:id
async function updateProduct(pool, req, res, io) {
    try {
        const { id } = req.params;
        const { slug, title, category, price, listImage, description, details } = req.body || {};
        const updates = {};
        if (slug !== undefined)
            updates.slug = slug;
        if (title !== undefined)
            updates.title = title;
        if (category !== undefined)
            updates.category = category;
        if (price !== undefined)
            updates.price = price;
        if (listImage !== undefined)
            updates.list_image = listImage;
        if (description !== undefined)
            updates.description = description;
        if (details !== undefined)
            updates.details = JSON.stringify(details);
        const fields = Object.keys(updates);
        if (fields.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 400, 'No fields to update');
        }
        const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
        const values = [id, ...fields.map(field => updates[field])];
        const { rows } = await pool.query(`
      UPDATE products 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, values);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Product not found');
        }
        // Parse details if it's a JSON string
        const updatedProduct = {
            ...rows[0],
            details: typeof rows[0].details === 'string' ? JSON.parse(rows[0].details) : rows[0].details
        };
        // Broadcast to admin panel
        if (io) {
            io.to('admin-panel').emit('update', { type: 'product_updated', data: updatedProduct });
        }
        // Broadcast to all users (for real-time updates in user panel)
        if (io) {
            io.to('all-users').emit('product-updated', updatedProduct);
            io.to('all-users').emit('products-updated', updatedProduct); // Also emit for backward compatibility
        }
        (0, apiHelpers_1.sendSuccess)(res, updatedProduct);
    }
    catch (err) {
        if (err?.code === '23505') {
            (0, apiHelpers_1.sendError)(res, 409, 'Product slug must be unique');
        }
        else {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to update product', err);
        }
    }
}
// Optimized DELETE /api/products/:id
async function deleteProduct(pool, req, res) {
    try {
        const { id } = req.params;
        // First check if product exists
        const { rows: existingRows } = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
        if (existingRows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Product not found');
        }
        // Delete product (cascade will handle product_images)
        const { rows } = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Product deleted successfully', deletedProduct: rows[0] });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete product', err);
    }
}
// Bulk DELETE /api/products/bulk-delete
async function bulkDeleteProducts(pool, req, res) {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 400, 'ids must be a non-empty array');
        }
        // Validate all IDs are numbers
        const productIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        if (productIds.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Invalid product IDs provided');
        }
        // Delete products in bulk (cascade will handle product_images)
        const placeholders = productIds.map((_, i) => `$${i + 1}`).join(', ');
        const { rows } = await pool.query(`DELETE FROM products WHERE id IN (${placeholders}) RETURNING *`, productIds);
        (0, apiHelpers_1.sendSuccess)(res, {
            message: `Successfully deleted ${rows.length} product(s)`,
            deletedCount: rows.length,
            deletedProducts: rows
        });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete products', err);
    }
}
// Upload product images
async function uploadProductImages(pool, req, res) {
    try {
        const { id } = req.params;
        const files = req.files;
        const body = req.body || {};
        // Check if product exists
        const { rows: productRows } = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
        if (productRows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Product not found');
        }
        let imageUrls = [];
        const imageType = body.type || 'pdp'; // Default to 'pdp' if not specified
        // Handle multipart form data (actual file uploads)
        if (files && files.length > 0) {
            imageUrls = files.map(file => `/uploads/${file.filename}`);
        }
        // Handle JSON data (pre-uploaded URLs)
        else if (body.images && Array.isArray(body.images)) {
            imageUrls = body.images;
        }
        else {
            return (0, apiHelpers_1.sendError)(res, 400, 'No images provided');
        }
        // Insert image URLs into database with type
        const insertedImages = [];
        for (const url of imageUrls) {
            const { rows } = await pool.query('INSERT INTO product_images (product_id, url, type) VALUES ($1, $2, $3) RETURNING *', [id, url, imageType]);
            insertedImages.push(rows[0]);
        }
        (0, apiHelpers_1.sendSuccess)(res, insertedImages, 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to upload product images', err);
    }
}
// Get product images
async function getProductImages(pool, req, res) {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY created_at ASC', [id]);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch product images', err);
    }
}
// Delete product image
async function deleteProductImage(pool, req, res) {
    try {
        const { id, imageId } = req.params;
        const { rows } = await pool.query('DELETE FROM product_images WHERE id = $1 AND product_id = $2 RETURNING *', [imageId, id]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Product image not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Product image deleted successfully' });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete product image', err);
    }
}
// Optimized CSV endpoint with correct path
async function getProductsCSV(res) {
    try {
        const path = require('path');
        const fs = require('fs');
        // FIXED: Correct path to CSV file (backend runs from backend/, so go up 1 level)
        const csvPath = path.resolve(process.cwd(), '..', 'product description page.csv');
        console.log('🔍 CSV Debug Info:');
        console.log('  Current working directory:', process.cwd());
        console.log('  Resolved CSV path:', csvPath);
        console.log('  File exists:', fs.existsSync(csvPath));
        if (!fs.existsSync(csvPath)) {
            console.warn('❌ CSV file not found at:', csvPath);
            return (0, apiHelpers_1.sendSuccess)(res, []);
        }
        console.log('✅ CSV file found, reading content...');
        const raw = fs.readFileSync(csvPath, 'utf8');
        const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
        console.log('📊 CSV Content Info:');
        console.log('  Raw content length:', raw.length);
        console.log('  Total lines:', lines.length);
        console.log('  First line:', lines[0]?.substring(0, 100) + '...');
        if (lines.length === 0) {
            console.warn('❌ No lines found in CSV');
            return (0, apiHelpers_1.sendSuccess)(res, []);
        }
        const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    }
                    else {
                        inQuotes = !inQuotes;
                    }
                }
                else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                }
                else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };
        const headerLine = lines[0];
        const headers = parseCSVLine(headerLine);
        const rows = [];
        console.log('📋 CSV Parsing Info:');
        console.log('  Headers count:', headers.length);
        console.log('  First header:', headers[0]);
        for (let i = 1; i < lines.length; i++) {
            const parts = parseCSVLine(lines[i]);
            if (parts.every(p => p.trim() === ''))
                continue;
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = (parts[j] ?? '').trim();
            }
            rows.push(obj);
        }
        console.log('📦 Final Results:');
        console.log('  Parsed products:', rows.length);
        console.log('  First product:', rows[0]?.['Product Name']);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to read products CSV', err);
    }
}
