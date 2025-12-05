"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackProductView = trackProductView;
exports.getRecentlyViewed = getRecentlyViewed;
exports.getRelatedProducts = getRelatedProducts;
exports.getRecommendedProducts = getRecommendedProducts;
exports.trackSearch = trackSearch;
exports.getPopularSearches = getPopularSearches;
const apiHelpers_1 = require("../utils/apiHelpers");
// Track product view for recommendations
async function trackProductView(pool, req, res) {
    try {
        const { productId } = req.params;
        // Validate productId is provided
        if (!productId) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Product ID is required');
        }
        // Check if product exists before tracking
        const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
        if (productCheck.rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Product not found');
        }
        // Get userId from token if authenticated, otherwise null
        const userId = req.userId || null;
        const sessionId = req.headers['x-session-id'] || `session_${Date.now()}`;
        const { viewDuration, source } = req.body;
        await pool.query(`
      INSERT INTO product_views (product_id, user_id, session_id, view_duration, source)
      VALUES ($1, $2, $3, $4, $5)
    `, [productId, userId, sessionId, viewDuration || null, source || 'direct']);
        // Update recently viewed using UPSERT to handle duplicates
        // For partial unique indexes, try UPDATE first, then INSERT if needed
        // Catch duplicate errors and update if insert fails
        if (userId) {
            try {
                // Try to update first
                const updateResult = await pool.query(`
          UPDATE recently_viewed_products 
          SET viewed_at = NOW()
          WHERE user_id = $1 AND product_id = $2
        `, [userId, productId]);
                // If no row was updated, insert a new one
                if (updateResult.rowCount === 0) {
                    try {
                        await pool.query(`
              INSERT INTO recently_viewed_products (user_id, product_id, viewed_at)
              VALUES ($1, $2, NOW())
            `, [userId, productId]);
                    }
                    catch (insertErr) {
                        // If insert fails due to race condition (duplicate key), just update
                        if (insertErr.code === '23505') {
                            await pool.query(`
                UPDATE recently_viewed_products 
                SET viewed_at = NOW()
                WHERE user_id = $1 AND product_id = $2
              `, [userId, productId]);
                        }
                        else {
                            throw insertErr;
                        }
                    }
                }
            }
            catch (err) {
                // If update somehow fails, try insert (will be caught by outer try-catch)
                if (err.code !== '23505') {
                    throw err;
                }
            }
        }
        else {
            try {
                // Try to update first
                const updateResult = await pool.query(`
          UPDATE recently_viewed_products 
          SET viewed_at = NOW()
          WHERE session_id = $1 AND product_id = $2 AND user_id IS NULL
        `, [sessionId, productId]);
                // If no row was updated, insert a new one
                if (updateResult.rowCount === 0) {
                    try {
                        await pool.query(`
              INSERT INTO recently_viewed_products (session_id, product_id, viewed_at, user_id)
              VALUES ($1, $2, NOW(), NULL)
            `, [sessionId, productId]);
                    }
                    catch (insertErr) {
                        // If insert fails due to race condition (duplicate key), just update
                        if (insertErr.code === '23505') {
                            await pool.query(`
                UPDATE recently_viewed_products 
                SET viewed_at = NOW()
                WHERE session_id = $1 AND product_id = $2 AND user_id IS NULL
              `, [sessionId, productId]);
                        }
                        else {
                            throw insertErr;
                        }
                    }
                }
            }
            catch (err) {
                // If update somehow fails, try insert (will be caught by outer try-catch)
                if (err.code !== '23505') {
                    throw err;
                }
            }
        }
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Product view tracked' });
    }
    catch (err) {
        // Handle foreign key constraint violations specifically
        if (err.code === '23503') {
            console.error('Error tracking product view: Product not found', err);
            return (0, apiHelpers_1.sendError)(res, 404, 'Product not found');
        }
        console.error('Error tracking product view:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to track product view', err);
    }
}
// Get recently viewed products
async function getRecentlyViewed(pool, req, res) {
    try {
        const userId = req.userId || null;
        const sessionId = req.headers['x-session-id'];
        const limit = parseInt(req.query.limit) || 10;
        let query;
        let params;
        if (userId) {
            query = `
        SELECT p.*,
               COALESCE(
                 json_agg(DISTINCT jsonb_build_object('url', pi.url)) 
                 FILTER (WHERE pi.url IS NOT NULL),
                 '[]'::json
               ) as pdp_images
        FROM (
          SELECT DISTINCT ON (rv.product_id) rv.product_id, rv.viewed_at
          FROM recently_viewed_products rv
          WHERE rv.user_id = $1
          ORDER BY rv.product_id, rv.viewed_at DESC
        ) latest_views
        JOIN products p ON latest_views.product_id = p.id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND (pi.type = 'pdp' OR pi.type IS NULL)
        GROUP BY p.id, latest_views.viewed_at
        ORDER BY latest_views.viewed_at DESC
        LIMIT $2
      `;
            params = [userId, limit];
        }
        else if (sessionId) {
            query = `
        SELECT p.*,
               COALESCE(
                 json_agg(DISTINCT jsonb_build_object('url', pi.url)) 
                 FILTER (WHERE pi.url IS NOT NULL),
                 '[]'::json
               ) as pdp_images
        FROM (
          SELECT DISTINCT ON (rv.product_id) rv.product_id, rv.viewed_at
          FROM recently_viewed_products rv
          WHERE rv.session_id = $1
          ORDER BY rv.product_id, rv.viewed_at DESC
        ) latest_views
        JOIN products p ON latest_views.product_id = p.id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND (pi.type = 'pdp' OR pi.type IS NULL)
        GROUP BY p.id, latest_views.viewed_at
        ORDER BY latest_views.viewed_at DESC
        LIMIT $2
      `;
            params = [sessionId, limit];
        }
        else {
            return (0, apiHelpers_1.sendSuccess)(res, []);
        }
        const { rows } = await pool.query(query, params);
        const products = rows.map((product) => ({
            ...product,
            pdp_images: product.pdp_images?.filter((img) => img.url).map((img) => img.url) || [],
            listImage: product.pdp_images?.[0]?.url || null
        }));
        (0, apiHelpers_1.sendSuccess)(res, products);
    }
    catch (err) {
        console.error('Error fetching recently viewed:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch recently viewed products', err);
    }
}
// Get related products
async function getRelatedProducts(pool, req, res) {
    try {
        const { productId } = req.params;
        const limit = parseInt(req.query.limit) || 8;
        // Get products from same category
        const { rows } = await pool.query(`
      SELECT p.*,
             COALESCE(
               json_agg(DISTINCT jsonb_build_object('url', pi.url)) 
               FILTER (WHERE pi.url IS NOT NULL),
               '[]'::json
             ) as pdp_images,
             CASE WHEN p.category = p2.category THEN 1 ELSE 2 END as category_match
      FROM products p
      LEFT JOIN products p2 ON p2.id = $1
      LEFT JOIN product_images pi ON p.id = pi.product_id AND (pi.type = 'pdp' OR pi.type IS NULL)
      WHERE p.id != $1
        AND (p.category = p2.category OR p.brand = p2.brand)
      GROUP BY p.id, p.category, p2.category, p.created_at
      ORDER BY category_match, p.created_at DESC
      LIMIT $2
    `, [productId, limit]);
        const products = rows.map((product) => {
            const { category_match, ...rest } = product;
            return {
                ...rest,
                pdp_images: product.pdp_images?.filter((img) => img.url).map((img) => img.url) || [],
                listImage: product.pdp_images?.[0]?.url || null
            };
        });
        (0, apiHelpers_1.sendSuccess)(res, products);
    }
    catch (err) {
        console.error('Error fetching related products:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch related products', err);
    }
}
// Get recommended products based on user behavior
async function getRecommendedProducts(pool, req, res) {
    try {
        const userId = req.userId || null;
        const sessionId = req.headers['x-session-id'];
        const limit = parseInt(req.query.limit) || 8;
        const type = req.query.type || 'based_on_browsing';
        let products = [];
        if (type === 'trending') {
            // Get trending products (most viewed in last 7 days)
            const { rows } = await pool.query(`
        SELECT p.*,
               COUNT(pv.id) as view_count,
               COALESCE(
                 json_agg(DISTINCT jsonb_build_object('url', pi.url)) 
                 FILTER (WHERE pi.url IS NOT NULL),
                 '[]'::json
               ) as pdp_images
        FROM products p
        LEFT JOIN product_views pv ON p.id = pv.product_id 
          AND pv.viewed_at > NOW() - INTERVAL '7 days'
        LEFT JOIN product_images pi ON p.id = pi.product_id AND (pi.type = 'pdp' OR pi.type IS NULL)
        GROUP BY p.id
        ORDER BY view_count DESC, p.created_at DESC
        LIMIT $1
      `, [limit]);
            products = rows;
        }
        else if (userId || sessionId) {
            // Get recommendations based on user's browsing history
            let rows;
            if (userId) {
                const result = await pool.query(`
          SELECT p.*,
                 COALESCE(
                   json_agg(DISTINCT jsonb_build_object('url', pi.url)) 
                   FILTER (WHERE pi.url IS NOT NULL),
                   '[]'::json
                 ) as pdp_images
          FROM products p
          LEFT JOIN recently_viewed_products rv ON rv.user_id = $2
          LEFT JOIN products viewed_products ON rv.product_id = viewed_products.id
          LEFT JOIN product_images pi ON p.id = pi.product_id AND (pi.type = 'pdp' OR pi.type IS NULL)
          WHERE p.id NOT IN (
            SELECT product_id FROM recently_viewed_products 
            WHERE user_id = $2
          )
          AND (p.category = ANY(
            SELECT DISTINCT category FROM products 
            WHERE id IN (
              SELECT product_id FROM recently_viewed_products 
              WHERE user_id = $2
            )
          ) OR p.brand = ANY(
            SELECT DISTINCT brand FROM products 
            WHERE id IN (
              SELECT product_id FROM recently_viewed_products 
              WHERE user_id = $2
            )
          ))
          GROUP BY p.id
          ORDER BY p.created_at DESC
          LIMIT $1
        `, [limit, userId]);
                rows = result.rows;
            }
            else if (sessionId) {
                const result = await pool.query(`
          SELECT p.*,
                 COALESCE(
                   json_agg(DISTINCT jsonb_build_object('url', pi.url)) 
                   FILTER (WHERE pi.url IS NOT NULL),
                   '[]'::json
                 ) as pdp_images
          FROM products p
          LEFT JOIN recently_viewed_products rv ON rv.session_id = $2 AND rv.user_id IS NULL
          LEFT JOIN products viewed_products ON rv.product_id = viewed_products.id
          LEFT JOIN product_images pi ON p.id = pi.product_id AND (pi.type = 'pdp' OR pi.type IS NULL)
          WHERE p.id NOT IN (
            SELECT product_id FROM recently_viewed_products 
            WHERE session_id = $2 AND user_id IS NULL
          )
          AND (p.category = ANY(
            SELECT DISTINCT category FROM products 
            WHERE id IN (
              SELECT product_id FROM recently_viewed_products 
              WHERE session_id = $2 AND user_id IS NULL
            )
          ) OR p.brand = ANY(
            SELECT DISTINCT brand FROM products 
            WHERE id IN (
              SELECT product_id FROM recently_viewed_products 
              WHERE session_id = $2 AND user_id IS NULL
            )
          ))
          GROUP BY p.id
          ORDER BY p.created_at DESC
          LIMIT $1
        `, [limit, sessionId]);
                rows = result.rows;
            }
            else {
                rows = [];
            }
            products = rows;
        }
        else {
            // Fallback to new products
            const { rows } = await pool.query(`
        SELECT p.*,
               COALESCE(
                 json_agg(DISTINCT jsonb_build_object('url', pi.url)) 
                 FILTER (WHERE pi.url IS NOT NULL),
                 '[]'::json
               ) as pdp_images
        FROM products p
        LEFT JOIN product_images pi ON p.id = pi.product_id AND (pi.type = 'pdp' OR pi.type IS NULL)
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT $1
      `, [limit]);
            products = rows;
        }
        const formattedProducts = products.map((product) => ({
            ...product,
            pdp_images: product.pdp_images?.filter((img) => img.url).map((img) => img.url) || [],
            listImage: product.pdp_images?.[0]?.url || null
        }));
        (0, apiHelpers_1.sendSuccess)(res, formattedProducts);
    }
    catch (err) {
        console.error('Error fetching recommendations:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch recommendations', err);
    }
}
// Track search query
async function trackSearch(pool, req, res) {
    try {
        const { query: searchQuery, resultsCount } = req.body;
        const userId = req.userId || null;
        const sessionId = req.headers['x-session-id'] || `session_${Date.now()}`;
        await pool.query(`
      INSERT INTO user_search_history (user_id, search_query, results_count, session_id)
      VALUES ($1, $2, $3, $4)
    `, [userId, searchQuery, resultsCount || 0, sessionId]);
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Search tracked' });
    }
    catch (err) {
        console.error('Error tracking search:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to track search', err);
    }
}
// Get popular searches
async function getPopularSearches(pool, req, res) {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const { rows } = await pool.query(`
      SELECT search_query, COUNT(*) as search_count
      FROM user_search_history
      WHERE searched_at > NOW() - INTERVAL '30 days'
      GROUP BY search_query
      ORDER BY search_count DESC
      LIMIT $1
    `, [limit]);
        (0, apiHelpers_1.sendSuccess)(res, rows.map((r) => r.search_query));
    }
    catch (err) {
        console.error('Error fetching popular searches:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch popular searches', err);
    }
}
