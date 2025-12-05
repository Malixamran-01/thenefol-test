"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProducts = searchProducts;
exports.getSearchFilters = getSearchFilters;
exports.logSearchQuery = logSearchQuery;
const apiHelpers_1 = require("../utils/apiHelpers");
// Simple search with basic filters
async function searchProducts(pool, req, res) {
    try {
        const { q } = req.query;
        const query = typeof q === 'string' ? q : '';
        // Simple query that works with or without search term
        let sqlQuery = `
      SELECT p.*, 
             COALESCE(
               json_agg(
                 json_build_object('url', pi.url)
               ) FILTER (WHERE pi.url IS NOT NULL), 
               '[]'::json
             ) as pdp_images
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
    `;
        let queryParams = [];
        if (query && query.trim()) {
            sqlQuery += ` WHERE LOWER(p.title) LIKE LOWER($1) OR LOWER(p.description) LIKE LOWER($1) OR LOWER(p.category) LIKE LOWER($1)`;
            queryParams.push(`%${query}%`);
        }
        sqlQuery += ` GROUP BY p.id ORDER BY p.title ASC LIMIT 20`;
        const { rows } = await pool.query(sqlQuery, queryParams);
        // Transform the data
        const products = rows.map((product) => ({
            ...product,
            pdp_images: product.pdp_images.filter((img) => img.url)
        }));
        (0, apiHelpers_1.sendSuccess)(res, {
            products,
            pagination: {
                page: 1,
                limit: 20,
                total: products.length,
                totalPages: 1,
                hasNext: false,
                hasPrev: false
            },
            suggestions: [],
            popularSearches: [
                'face serum', 'moisturizer', 'vitamin c', 'hyaluronic acid',
                'face wash', 'hair oil', 'body lotion', 'sunscreen'
            ],
            filters: { query }
        });
    }
    catch (err) {
        console.error('Search error:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to search products', err);
    }
}
// Get search filters
async function getSearchFilters(pool, req, res) {
    try {
        // Get all categories
        const { rows: categories } = await pool.query(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM products 
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY count DESC, category ASC
    `);
        // Get price ranges
        const { rows: priceRanges } = await pool.query(`
      SELECT 
        MIN(CAST(price AS NUMERIC)) as min_price,
        MAX(CAST(price AS NUMERIC)) as max_price,
        AVG(CAST(price AS NUMERIC)) as avg_price
      FROM products 
      WHERE price IS NOT NULL AND price != '' AND CAST(price AS NUMERIC) > 0
    `);
        (0, apiHelpers_1.sendSuccess)(res, {
            categories: categories.map((row) => ({
                name: row.category,
                count: row.count
            })),
            priceRanges: priceRanges[0] || { min_price: 0, max_price: 0, avg_price: 0 },
            ingredients: [],
            skinTypes: [],
            hairTypes: []
        });
    }
    catch (err) {
        console.error('Error getting search filters:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to get search filters', err);
    }
}
// Log search query
async function logSearchQuery(pool, req, res) {
    try {
        const { query, filters, results_count } = req.body;
        console.log('Search logged:', {
            query,
            filters,
            results_count,
            timestamp: new Date().toISOString()
        });
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Search logged successfully' });
    }
    catch (err) {
        console.error('Error logging search:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to log search', err);
    }
}
