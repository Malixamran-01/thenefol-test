"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCMSRouter = createCMSRouter;
const express_1 = require("express");
function createCMSRouter(pool, io) {
    const router = (0, express_1.Router)();
    // Helper function to broadcast CMS updates
    const broadcastCMSUpdate = (event, data) => {
        if (io) {
            io.emit('cms-update', { event, data, timestamp: Date.now() });
            console.log('📡 Broadcasting CMS update:', event);
        }
    };
    // Initialize CMS tables
    const initTables = async () => {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS cms_pages (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        content JSONB DEFAULT '{}'::jsonb,
        meta_description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cms_sections (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
        section_type TEXT NOT NULL,
        title TEXT,
        content JSONB DEFAULT '{}'::jsonb,
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cms_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    };
    initTables().catch(console.error);
    // GET all pages
    router.get('/pages', async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT * FROM cms_pages ORDER BY slug');
            res.json(rows);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // GET single page with all sections
    router.get('/pages/:slug', async (req, res) => {
        try {
            const { slug } = req.params;
            const pageResult = await pool.query('SELECT * FROM cms_pages WHERE slug = $1', [slug]);
            const sectionsResult = await pool.query('SELECT * FROM cms_sections WHERE page_id = $1 AND is_active = true ORDER BY order_index', [pageResult.rows[0]?.id]);
            res.json({
                page: pageResult.rows[0] || null,
                sections: sectionsResult.rows
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // CREATE or UPDATE page
    router.post('/pages', async (req, res) => {
        try {
            const { slug, title, content, meta_description } = req.body;
            const existingResult = await pool.query('SELECT id FROM cms_pages WHERE slug = $1', [slug]);
            if (existingResult.rows.length > 0) {
                await pool.query(`UPDATE cms_pages 
           SET title = $1, content = $2, meta_description = $3, updated_at = CURRENT_TIMESTAMP
           WHERE slug = $4`, [title, content, meta_description, slug]);
                broadcastCMSUpdate('page_updated', { slug, title });
                res.json({ message: 'Page updated successfully', id: existingResult.rows[0].id });
            }
            else {
                const result = await pool.query(`INSERT INTO cms_pages (slug, title, content, meta_description)
           VALUES ($1, $2, $3, $4) RETURNING id`, [slug, title, content, meta_description]);
                broadcastCMSUpdate('page_created', { slug, title });
                res.json({ message: 'Page created successfully', id: result.rows[0].id });
            }
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // DELETE page
    router.delete('/pages/:slug', async (req, res) => {
        try {
            const { slug } = req.params;
            // Delete all sections for this page
            await pool.query(`
        DELETE FROM cms_sections 
        WHERE page_id = (SELECT id FROM cms_pages WHERE slug = $1)
      `, [slug]);
            // Delete the page
            await pool.query('DELETE FROM cms_pages WHERE slug = $1', [slug]);
            broadcastCMSUpdate('page_deleted', { slug });
            res.json({ message: 'Page and all sections deleted successfully' });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // GET all sections for a page
    router.get('/sections/:pageSlug', async (req, res) => {
        try {
            const { pageSlug } = req.params;
            // Optional query parameter to filter by is_active (default: show all for admin, active only for user panel)
            const activeOnly = req.query.active === 'true' || req.query.activeOnly === 'true';
            const query = activeOnly
                ? `SELECT s.* FROM cms_sections s
           JOIN cms_pages p ON s.page_id = p.id
           WHERE p.slug = $1 AND s.is_active = true ORDER BY s.order_index`
                : `SELECT s.* FROM cms_sections s
           JOIN cms_pages p ON s.page_id = p.id
           WHERE p.slug = $1 ORDER BY s.order_index`;
            const { rows } = await pool.query(query, [pageSlug]);
            res.json(rows);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // CREATE or UPDATE section
    router.post('/sections', async (req, res) => {
        try {
            const { page_slug, section_type, title, content, order_index, is_active } = req.body;
            // Get page ID
            const pageResult = await pool.query('SELECT id FROM cms_pages WHERE slug = $1', [page_slug]);
            if (pageResult.rows.length === 0) {
                return res.status(404).json({ error: 'Page not found' });
            }
            const pageId = pageResult.rows[0].id;
            // Check if section exists (by page_id and section_type)
            const existingResult = await pool.query('SELECT id FROM cms_sections WHERE page_id = $1 AND section_type = $2', [pageId, section_type]);
            if (existingResult.rows.length > 0) {
                await pool.query(`UPDATE cms_sections 
           SET title = $1, content = $2, order_index = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
           WHERE page_id = $5 AND section_type = $6`, [title, content, order_index || 0, is_active !== false, pageId, section_type]);
                broadcastCMSUpdate('section_updated', { page_slug, section_type, title, content });
                res.json({ message: 'Section updated successfully', id: existingResult.rows[0].id });
            }
            else {
                const result = await pool.query(`INSERT INTO cms_sections (page_id, section_type, title, content, order_index, is_active)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [pageId, section_type, title, content, order_index || 0, is_active !== false]);
                broadcastCMSUpdate('section_created', { page_slug, section_type, title, content });
                res.json({ message: 'Section created successfully', id: result.rows[0].id });
            }
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // DELETE section
    router.delete('/sections/:id', async (req, res) => {
        try {
            const { id } = req.params;
            // Get section info before deleting for broadcast
            const sectionResult = await pool.query('SELECT page_name, section_key FROM cms_sections WHERE id = $1', [id]);
            await pool.query('DELETE FROM cms_sections WHERE id = $1', [id]);
            if (sectionResult.rows.length > 0) {
                broadcastCMSUpdate('section_deleted', {
                    id,
                    page_name: sectionResult.rows[0].page_name,
                    section_key: sectionResult.rows[0].section_key
                });
            }
            res.json({ message: 'Section deleted successfully' });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // GET all settings
    router.get('/settings', async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT * FROM cms_settings');
            const settingsObj = rows.reduce((acc, setting) => {
                let value = setting.setting_value;
                if (setting.setting_type === 'json' && value) {
                    try {
                        value = JSON.parse(value);
                    }
                    catch (e) {
                        // Keep as string if parse fails
                    }
                }
                else if (setting.setting_type === 'number' && value) {
                    value = parseFloat(value);
                }
                else if (setting.setting_type === 'boolean') {
                    value = value === 'true' || value === '1';
                }
                acc[setting.setting_key] = value;
                return acc;
            }, {});
            res.json(settingsObj);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // CREATE or UPDATE setting
    router.post('/settings', async (req, res) => {
        try {
            const { setting_key, setting_value, setting_type } = req.body;
            let valueString = setting_value;
            if (setting_type === 'json' && typeof setting_value !== 'string') {
                valueString = JSON.stringify(setting_value);
            }
            else if (setting_type === 'boolean') {
                valueString = setting_value ? 'true' : 'false';
            }
            else if (setting_type === 'number') {
                valueString = String(setting_value);
            }
            const existingResult = await pool.query('SELECT id FROM cms_settings WHERE setting_key = $1', [setting_key]);
            if (existingResult.rows.length > 0) {
                await pool.query(`UPDATE cms_settings 
           SET setting_value = $1, setting_type = $2, updated_at = CURRENT_TIMESTAMP
           WHERE setting_key = $3`, [valueString, setting_type || 'text', setting_key]);
                broadcastCMSUpdate('setting_updated', { setting_key, setting_value: valueString });
                res.json({ message: 'Setting updated successfully' });
            }
            else {
                await pool.query(`INSERT INTO cms_settings (setting_key, setting_value, setting_type)
           VALUES ($1, $2, $3)`, [setting_key, valueString, setting_type || 'text']);
                broadcastCMSUpdate('setting_created', { setting_key, setting_value: valueString });
                res.json({ message: 'Setting created successfully' });
            }
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // DELETE setting
    router.delete('/settings/:key', async (req, res) => {
        try {
            const { key } = req.params;
            await pool.query('DELETE FROM cms_settings WHERE setting_key = $1', [key]);
            res.json({ message: 'Setting deleted successfully' });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    return router;
}
exports.default = createCMSRouter;
