"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCollections = getCollections;
exports.getCollectionById = getCollectionById;
exports.createCollection = createCollection;
exports.updateCollection = updateCollection;
exports.deleteCollection = deleteCollection;
exports.getRecommendationPosts = getRecommendationPosts;
exports.getRecommendationPostById = getRecommendationPostById;
exports.createRecommendationPost = createRecommendationPost;
exports.updateRecommendationPost = updateRecommendationPost;
exports.deleteRecommendationPost = deleteRecommendationPost;
const apiHelpers_1 = require("../utils/apiHelpers");
// Get all collections by type
async function getCollections(pool, req, res) {
    try {
        const { type } = req.query;
        const { published } = req.query;
        let query = `
      SELECT 
        pc.*,
        p.id as product_id,
        p.title as product_title,
        p.slug as product_slug,
        p.list_image as product_image,
        p.price as product_price,
        p.category as product_category
      FROM product_collections pc
      LEFT JOIN products p ON pc.product_id = p.id
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;
        if (type) {
            query += ` AND pc.collection_type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }
        if (published === 'true') {
            query += ` AND pc.is_published = true`;
        }
        query += ` ORDER BY pc.order_index ASC, pc.created_at DESC`;
        const { rows } = await pool.query(query, params);
        (0, apiHelpers_1.sendSuccess)(res, { success: true, data: rows });
    }
    catch (err) {
        console.error('Failed to fetch collections:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch collections', err);
    }
}
// Get single collection by ID
async function getCollectionById(pool, req, res) {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(`
      SELECT 
        pc.*,
        p.id as product_id,
        p.title as product_title,
        p.slug as product_slug,
        p.list_image as product_image,
        p.price as product_price,
        p.category as product_category
      FROM product_collections pc
      LEFT JOIN products p ON pc.product_id = p.id
      WHERE pc.id = $1
    `, [id]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Collection not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, { success: true, data: rows[0] });
    }
    catch (err) {
        console.error('Failed to fetch collection:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch collection', err);
    }
}
// Create collection item
async function createCollection(pool, req, res) {
    try {
        const { collection_type, product_id, title, subtitle, description, image_url, code, expiry_date, discount_percent, discount_amount, is_featured, is_published, order_index, metadata } = req.body;
        if (!collection_type) {
            return (0, apiHelpers_1.sendError)(res, 400, 'collection_type is required');
        }
        const { rows } = await pool.query(`
      INSERT INTO product_collections (
        collection_type, product_id, title, subtitle, description,
        image_url, code, expiry_date, discount_percent, discount_amount,
        is_featured, is_published, order_index, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
            collection_type,
            product_id || null,
            title || null,
            subtitle || null,
            description || null,
            image_url || null,
            code || null,
            expiry_date || null,
            discount_percent || null,
            discount_amount || null,
            is_featured || false,
            is_published || false,
            order_index || 0,
            metadata ? JSON.stringify(metadata) : '{}'
        ]);
        (0, apiHelpers_1.sendSuccess)(res, { success: true, data: rows[0], message: 'Collection created successfully' });
    }
    catch (err) {
        console.error('Failed to create collection:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create collection', err);
    }
}
// Update collection item
async function updateCollection(pool, req, res) {
    try {
        const { id } = req.params;
        const { product_id, title, subtitle, description, image_url, code, expiry_date, discount_percent, discount_amount, is_featured, is_published, order_index, metadata } = req.body;
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (product_id !== undefined) {
            updates.push(`product_id = $${paramIndex}`);
            values.push(product_id);
            paramIndex++;
        }
        if (title !== undefined) {
            updates.push(`title = $${paramIndex}`);
            values.push(title);
            paramIndex++;
        }
        if (subtitle !== undefined) {
            updates.push(`subtitle = $${paramIndex}`);
            values.push(subtitle);
            paramIndex++;
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex}`);
            values.push(description);
            paramIndex++;
        }
        if (image_url !== undefined) {
            updates.push(`image_url = $${paramIndex}`);
            values.push(image_url);
            paramIndex++;
        }
        if (code !== undefined) {
            updates.push(`code = $${paramIndex}`);
            values.push(code);
            paramIndex++;
        }
        if (expiry_date !== undefined) {
            updates.push(`expiry_date = $${paramIndex}`);
            values.push(expiry_date);
            paramIndex++;
        }
        if (discount_percent !== undefined) {
            updates.push(`discount_percent = $${paramIndex}`);
            values.push(discount_percent);
            paramIndex++;
        }
        if (discount_amount !== undefined) {
            updates.push(`discount_amount = $${paramIndex}`);
            values.push(discount_amount);
            paramIndex++;
        }
        if (is_featured !== undefined) {
            updates.push(`is_featured = $${paramIndex}`);
            values.push(is_featured);
            paramIndex++;
        }
        if (is_published !== undefined) {
            updates.push(`is_published = $${paramIndex}`);
            values.push(is_published);
            paramIndex++;
        }
        if (order_index !== undefined) {
            updates.push(`order_index = $${paramIndex}`);
            values.push(order_index);
            paramIndex++;
        }
        if (metadata !== undefined) {
            updates.push(`metadata = $${paramIndex}`);
            values.push(JSON.stringify(metadata));
            paramIndex++;
        }
        if (updates.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 400, 'No fields to update');
        }
        updates.push(`updated_at = now()`);
        values.push(id);
        const { rows } = await pool.query(`
      UPDATE product_collections
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Collection not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, { success: true, data: rows[0], message: 'Collection updated successfully' });
    }
    catch (err) {
        console.error('Failed to update collection:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to update collection', err);
    }
}
// Delete collection item
async function deleteCollection(pool, req, res) {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(`
      DELETE FROM product_collections
      WHERE id = $1
      RETURNING id
    `, [id]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Collection not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, { success: true, data: { id: rows[0].id }, message: 'Collection deleted successfully' });
    }
    catch (err) {
        console.error('Failed to delete collection:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete collection', err);
    }
}
// Recommendation Posts CRUD
async function getRecommendationPosts(pool, req, res) {
    try {
        const { published } = req.query;
        let query = `
      SELECT 
        rp.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'title', p.title,
              'slug', p.slug,
              'list_image', p.list_image,
              'price', p.price
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) as products
      FROM recommendation_posts rp
      LEFT JOIN unnest(rp.product_ids) WITH ORDINALITY AS product_id(id, ord) ON true
      LEFT JOIN products p ON p.id = product_id.id
      WHERE 1=1
    `;
        if (published === 'true') {
            query += ` AND rp.is_published = true`;
        }
        query += ` GROUP BY rp.id ORDER BY rp.order_index ASC, rp.created_at DESC`;
        const { rows } = await pool.query(query);
        (0, apiHelpers_1.sendSuccess)(res, { success: true, data: rows });
    }
    catch (err) {
        console.error('Failed to fetch recommendation posts:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch recommendation posts', err);
    }
}
async function getRecommendationPostById(pool, req, res) {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(`
      SELECT 
        rp.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'title', p.title,
              'slug', p.slug,
              'list_image', p.list_image,
              'price', p.price
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) as products
      FROM recommendation_posts rp
      LEFT JOIN unnest(rp.product_ids) WITH ORDINALITY AS product_id(id, ord) ON true
      LEFT JOIN products p ON p.id = product_id.id
      WHERE rp.id = $1
      GROUP BY rp.id
    `, [id]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Recommendation post not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, { success: true, data: rows[0] });
    }
    catch (err) {
        console.error('Failed to fetch recommendation post:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch recommendation post', err);
    }
}
async function createRecommendationPost(pool, req, res) {
    try {
        const { title, content, image_url, product_ids, is_published, order_index, metadata } = req.body;
        if (!title) {
            return (0, apiHelpers_1.sendError)(res, 400, 'title is required');
        }
        const publishedAt = is_published ? new Date().toISOString() : null;
        const { rows } = await pool.query(`
      INSERT INTO recommendation_posts (
        title, content, image_url, product_ids, is_published, published_at, order_index, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
            title,
            content || null,
            image_url || null,
            product_ids ? `{${product_ids.join(',')}}` : null,
            is_published || false,
            publishedAt,
            order_index || 0,
            metadata ? JSON.stringify(metadata) : '{}'
        ]);
        (0, apiHelpers_1.sendSuccess)(res, { success: true, data: rows[0], message: 'Recommendation post created successfully' });
    }
    catch (err) {
        console.error('Failed to create recommendation post:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create recommendation post', err);
    }
}
async function updateRecommendationPost(pool, req, res) {
    try {
        const { id } = req.params;
        const { title, content, image_url, product_ids, is_published, order_index, metadata } = req.body;
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (title !== undefined) {
            updates.push(`title = $${paramIndex}`);
            values.push(title);
            paramIndex++;
        }
        if (content !== undefined) {
            updates.push(`content = $${paramIndex}`);
            values.push(content);
            paramIndex++;
        }
        if (image_url !== undefined) {
            updates.push(`image_url = $${paramIndex}`);
            values.push(image_url);
            paramIndex++;
        }
        if (product_ids !== undefined) {
            updates.push(`product_ids = $${paramIndex}`);
            values.push(product_ids ? `{${product_ids.join(',')}}` : null);
            paramIndex++;
        }
        if (is_published !== undefined) {
            updates.push(`is_published = $${paramIndex}`);
            values.push(is_published);
            if (is_published) {
                updates.push(`published_at = COALESCE(published_at, now())`);
            }
            paramIndex++;
        }
        if (order_index !== undefined) {
            updates.push(`order_index = $${paramIndex}`);
            values.push(order_index);
            paramIndex++;
        }
        if (metadata !== undefined) {
            updates.push(`metadata = $${paramIndex}`);
            values.push(JSON.stringify(metadata));
            paramIndex++;
        }
        if (updates.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 400, 'No fields to update');
        }
        updates.push(`updated_at = now()`);
        values.push(id);
        const { rows } = await pool.query(`
      UPDATE recommendation_posts
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Recommendation post not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, { success: true, data: rows[0], message: 'Recommendation post updated successfully' });
    }
    catch (err) {
        console.error('Failed to update recommendation post:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to update recommendation post', err);
    }
}
async function deleteRecommendationPost(pool, req, res) {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(`
      DELETE FROM recommendation_posts
      WHERE id = $1
      RETURNING id
    `, [id]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Recommendation post not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, { success: true, data: { id: rows[0].id }, message: 'Recommendation post deleted successfully' });
    }
    catch (err) {
        console.error('Failed to delete recommendation post:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete recommendation post', err);
    }
}
