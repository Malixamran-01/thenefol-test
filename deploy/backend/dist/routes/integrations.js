"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIntegrationsRoutes = registerIntegrationsRoutes;
const apiHelpers_1 = require("../utils/apiHelpers");
function registerIntegrationsRoutes(app, pool) {
    // Google
    app.get('/api/google/connection-status', async (_req, res) => {
        try {
            const { rows } = await pool.query(`SELECT * FROM google_connections WHERE service = 'youtube'`);
            const isConnected = rows.length > 0 && rows[0].is_connected;
            (0, apiHelpers_1.sendSuccess)(res, { isConnected });
        }
        catch (err) {
            // If table doesn't exist yet, return default disconnected state
            (0, apiHelpers_1.sendSuccess)(res, { isConnected: false });
        }
    });
    app.get('/api/google/analytics', async (_req, res) => {
        try {
            const { rows } = await pool.query(`SELECT * FROM google_analytics ORDER BY date_recorded DESC LIMIT 10`);
            (0, apiHelpers_1.sendSuccess)(res, rows);
        }
        catch (err) {
            // Return empty array if table doesn't exist
            (0, apiHelpers_1.sendSuccess)(res, []);
        }
    });
    app.get('/api/google/campaigns', async (_req, res) => {
        try {
            const { rows } = await pool.query(`SELECT * FROM google_campaigns ORDER BY created_at DESC`);
            (0, apiHelpers_1.sendSuccess)(res, rows);
        }
        catch (err) {
            // Return empty array if table doesn't exist
            (0, apiHelpers_1.sendSuccess)(res, []);
        }
    });
    // Social
    app.get('/api/social/connection-status', async (_req, res) => {
        try {
            const { rows } = await pool.query(`SELECT platform, is_connected FROM social_connections WHERE platform IN ('facebook', 'instagram')`);
            const connections = rows.reduce((acc, row) => { acc[row.platform] = row.is_connected; return acc; }, {});
            (0, apiHelpers_1.sendSuccess)(res, connections);
        }
        catch (err) {
            // Return default disconnected state for all platforms
            (0, apiHelpers_1.sendSuccess)(res, { facebook: false, instagram: false });
        }
    });
    app.get('/api/social/posts', async (_req, res) => {
        try {
            const { rows } = await pool.query(`SELECT * FROM social_posts ORDER BY posted_at DESC LIMIT 20`);
            (0, apiHelpers_1.sendSuccess)(res, rows);
        }
        catch (err) {
            // Return empty array if table doesn't exist
            (0, apiHelpers_1.sendSuccess)(res, []);
        }
    });
    app.get('/api/social/stats', async (_req, res) => {
        try {
            const { rows } = await pool.query(`SELECT platform, followers, following, posts, engagement_rate FROM social_stats WHERE date_recorded = CURRENT_DATE ORDER BY platform`);
            (0, apiHelpers_1.sendSuccess)(res, rows);
        }
        catch (err) {
            // Return empty array if table doesn't exist
            (0, apiHelpers_1.sendSuccess)(res, []);
        }
    });
    // Store settings
    app.get('/api/settings', async (_req, res) => {
        try {
            const { rows } = await pool.query(`
        SELECT setting_key, setting_value, setting_type, description, is_public
        FROM store_settings ORDER BY setting_key
      `);
            const settings = rows.reduce((acc, row) => { acc[row.setting_key] = row.setting_value; return acc; }, {});
            (0, apiHelpers_1.sendSuccess)(res, settings);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch settings', err);
        }
    });
    app.put('/api/settings', async (req, res) => {
        try {
            const settings = req.body || {};
            for (const [key, value] of Object.entries(settings)) {
                await pool.query(`
          INSERT INTO store_settings (setting_key, setting_value)
          VALUES ($1, $2)
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = NOW()
        `, [key, value]);
            }
            (0, apiHelpers_1.sendSuccess)(res, { message: 'Settings updated successfully' });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to update settings', err);
        }
    });
    // Themes
    app.get('/api/themes', async (_req, res) => {
        try {
            const { rows } = await pool.query(`SELECT * FROM store_themes ORDER BY is_active DESC, created_at DESC`);
            (0, apiHelpers_1.sendSuccess)(res, rows);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch themes', err);
        }
    });
}
