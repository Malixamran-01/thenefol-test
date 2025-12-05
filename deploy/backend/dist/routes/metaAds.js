"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAdsConfig = saveAdsConfig;
exports.getAdsConfig = getAdsConfig;
exports.getCampaigns = getCampaigns;
exports.createCampaign = createCampaign;
exports.updateCampaign = updateCampaign;
exports.deleteCampaign = deleteCampaign;
exports.getAdSets = getAdSets;
exports.createAdSet = createAdSet;
exports.updateAdSet = updateAdSet;
exports.deleteAdSet = deleteAdSet;
exports.getAds = getAds;
exports.createAdCreative = createAdCreative;
exports.createAd = createAd;
exports.updateAd = updateAd;
exports.deleteAd = deleteAd;
exports.getInsights = getInsights;
exports.syncInsights = syncInsights;
exports.trackPixelEvent = trackPixelEvent;
exports.getPixelEvents = getPixelEvents;
exports.syncCustomAudience = syncCustomAudience;
exports.getAudiences = getAudiences;
const apiHelpers_1 = require("../utils/apiHelpers");
// Meta Marketing API base URL
const META_API_VERSION = 'v21.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
// Helper function to get Meta access token from config
async function getMetaAccessToken(pool) {
    try {
        const { rows } = await pool.query('SELECT access_token FROM facebook_config ORDER BY created_at DESC LIMIT 1');
        return rows[0]?.access_token || process.env.META_ADS_ACCESS_TOKEN || null;
    }
    catch {
        return process.env.META_ADS_ACCESS_TOKEN || null;
    }
}
// Helper function to get ad account ID
async function getAdAccountId(pool) {
    try {
        const { rows } = await pool.query('SELECT value FROM facebook_field_mapping WHERE key = $1', ['ad_account_id']);
        return rows[0]?.value || process.env.META_AD_ACCOUNT_ID || null;
    }
    catch {
        return process.env.META_AD_ACCOUNT_ID || null;
    }
}
// Helper function to make Meta API calls
async function callMetaAPI(endpoint, method = 'GET', body, accessToken) {
    const token = accessToken || process.env.META_ADS_ACCESS_TOKEN;
    if (!token) {
        throw new Error('Meta access token not configured');
    }
    const url = `${META_API_BASE}/${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    try {
        if (method === 'GET') {
            // For GET requests, append params to URL
            const params = new URLSearchParams();
            if (body && typeof body === 'object') {
                for (const [key, value] of Object.entries(body)) {
                    if (value !== undefined && value !== null) {
                        if (typeof value === 'object') {
                            params.append(key, JSON.stringify(value));
                        }
                        else {
                            params.append(key, String(value));
                        }
                    }
                }
            }
            params.append('access_token', token);
            const fullUrl = `${url}?${params.toString()}`;
            const response = await fetch(fullUrl, options);
            const data = await response.json();
            if (!response.ok && data.error) {
                throw new Error(data.error.message || 'API request failed');
            }
            return data;
        }
        else {
            // For POST/PUT/DELETE, include access_token in body
            const requestBody = body ? { ...body, access_token: token } : { access_token: token };
            options.body = JSON.stringify(requestBody);
            const response = await fetch(url, options);
            const data = await response.json();
            if (!response.ok && data.error) {
                throw new Error(data.error.message || 'API request failed');
            }
            return data;
        }
    }
    catch (error) {
        console.error('Meta API call error:', error);
        throw error;
    }
}
// Ensure database tables exist
async function ensureTables(pool) {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS meta_ads_config (
      id SERIAL PRIMARY KEY,
      ad_account_id TEXT,
      pixel_id TEXT,
      access_token TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS meta_ad_campaigns (
      id SERIAL PRIMARY KEY,
      campaign_id TEXT UNIQUE,
      name TEXT NOT NULL,
      objective TEXT,
      status TEXT,
      daily_budget INTEGER,
      lifetime_budget INTEGER,
      start_time TIMESTAMPTZ,
      stop_time TIMESTAMPTZ,
      created_time TIMESTAMPTZ,
      updated_time TIMESTAMPTZ,
      meta_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS meta_ad_sets (
      id SERIAL PRIMARY KEY,
      adset_id TEXT UNIQUE,
      campaign_id TEXT,
      name TEXT NOT NULL,
      status TEXT,
      daily_budget INTEGER,
      lifetime_budget INTEGER,
      billing_event TEXT,
      optimization_goal TEXT,
      targeting JSONB,
      start_time TIMESTAMPTZ,
      end_time TIMESTAMPTZ,
      created_time TIMESTAMPTZ,
      updated_time TIMESTAMPTZ,
      meta_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS meta_ads (
      id SERIAL PRIMARY KEY,
      ad_id TEXT UNIQUE,
      adset_id TEXT,
      campaign_id TEXT,
      name TEXT NOT NULL,
      status TEXT,
      creative JSONB,
      preview_url TEXT,
      created_time TIMESTAMPTZ,
      updated_time TIMESTAMPTZ,
      meta_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS meta_ad_insights (
      id SERIAL PRIMARY KEY,
      campaign_id TEXT,
      adset_id TEXT,
      ad_id TEXT,
      date_start DATE,
      date_stop DATE,
      impressions INTEGER,
      clicks INTEGER,
      spend DECIMAL(10,2),
      reach INTEGER,
      cpm DECIMAL(10,2),
      cpc DECIMAL(10,2),
      ctr DECIMAL(5,2),
      conversions INTEGER,
      conversion_value DECIMAL(10,2),
      meta_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS meta_pixel_events (
      id SERIAL PRIMARY KEY,
      event_name TEXT NOT NULL,
      event_id TEXT,
      user_data JSONB,
      event_data JSONB,
      source_url TEXT,
      user_agent TEXT,
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}
// ==================== CONFIGURATION ====================
async function saveAdsConfig(pool, req, res) {
    try {
        await ensureTables(pool);
        const { ad_account_id, pixel_id, access_token } = req.body || {};
        if (!ad_account_id) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Ad account ID is required');
        }
        // Save to config table
        await pool.query(`
      INSERT INTO meta_ads_config (ad_account_id, pixel_id, access_token, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (id) DO UPDATE SET
        ad_account_id = EXCLUDED.ad_account_id,
        pixel_id = EXCLUDED.pixel_id,
        access_token = EXCLUDED.access_token,
        updated_at = NOW()
    `, [ad_account_id, pixel_id || null, access_token || null]);
        // Also save ad_account_id to field mapping for easy access
        await pool.query(`
      INSERT INTO facebook_field_mapping (key, value, updated_at)
      VALUES ('ad_account_id', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, [ad_account_id]);
        (0, apiHelpers_1.sendSuccess)(res, { success: true }, 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to save Meta Ads config', err);
    }
}
async function getAdsConfig(pool, req, res) {
    try {
        await ensureTables(pool);
        const { rows } = await pool.query('SELECT * FROM meta_ads_config ORDER BY created_at DESC LIMIT 1');
        (0, apiHelpers_1.sendSuccess)(res, rows[0] || {});
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to get Meta Ads config', err);
    }
}
// ==================== CAMPAIGNS ====================
async function getCampaigns(pool, req, res) {
    try {
        await ensureTables(pool);
        const { rows } = await pool.query(`
      SELECT * FROM meta_ad_campaigns 
      ORDER BY created_at DESC
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to get campaigns', err);
    }
}
async function createCampaign(pool, req, res) {
    try {
        await ensureTables(pool);
        const accessToken = await getMetaAccessToken(pool);
        const adAccountId = await getAdAccountId(pool);
        if (!accessToken || !adAccountId) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Meta Ads not configured. Please set up access token and ad account ID.');
        }
        const { name, objective, status = 'PAUSED', daily_budget, lifetime_budget, start_time, stop_time, } = req.body;
        if (!name || !objective) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Campaign name and objective are required');
        }
        // Create campaign via Meta API
        const campaignData = {
            name,
            objective,
            status,
            special_ad_categories: [],
        };
        if (daily_budget) {
            campaignData.daily_budget = daily_budget * 100; // Convert to cents
        }
        if (lifetime_budget) {
            campaignData.lifetime_budget = lifetime_budget * 100;
        }
        if (start_time) {
            campaignData.start_time = start_time;
        }
        if (stop_time) {
            campaignData.stop_time = stop_time;
        }
        const result = await callMetaAPI(`${adAccountId}/campaigns`, 'POST', campaignData, accessToken);
        if (result.error) {
            return (0, apiHelpers_1.sendError)(res, 400, result.error.message || 'Failed to create campaign');
        }
        const campaignId = result.id;
        // Fetch full campaign details
        const campaignDetails = await callMetaAPI(campaignId, 'GET', { fields: 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time' }, accessToken);
        // Save to database
        await pool.query(`
      INSERT INTO meta_ad_campaigns (
        campaign_id, name, objective, status, daily_budget, lifetime_budget,
        start_time, stop_time, created_time, updated_time, meta_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (campaign_id) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        daily_budget = EXCLUDED.daily_budget,
        lifetime_budget = EXCLUDED.lifetime_budget,
        start_time = EXCLUDED.start_time,
        stop_time = EXCLUDED.stop_time,
        updated_time = EXCLUDED.updated_time,
        meta_data = EXCLUDED.meta_data,
        updated_at = NOW()
    `, [
            campaignId,
            name,
            objective,
            status,
            daily_budget || null,
            lifetime_budget || null,
            start_time || null,
            stop_time || null,
            campaignDetails.created_time || null,
            campaignDetails.updated_time || null,
            JSON.stringify(campaignDetails),
        ]);
        (0, apiHelpers_1.sendSuccess)(res, { campaign_id: campaignId, ...campaignDetails }, 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create campaign', err);
    }
}
async function updateCampaign(pool, req, res) {
    try {
        const { id } = req.params;
        const accessToken = await getMetaAccessToken(pool);
        if (!accessToken) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Meta access token not configured');
        }
        const updateData = {};
        const allowedFields = ['name', 'status', 'daily_budget', 'lifetime_budget', 'start_time', 'stop_time'];
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                if (field === 'daily_budget' || field === 'lifetime_budget') {
                    updateData[field] = req.body[field] * 100; // Convert to cents
                }
                else {
                    updateData[field] = req.body[field];
                }
            }
        }
        const result = await callMetaAPI(id, 'POST', updateData, accessToken);
        if (result.error) {
            return (0, apiHelpers_1.sendError)(res, 400, result.error.message || 'Failed to update campaign');
        }
        // Update database
        const updateFields = [];
        const values = [id];
        let paramCount = 1;
        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                paramCount++;
                updateFields.push(`${key} = $${paramCount}`);
                values.push(value);
            }
        }
        if (updateFields.length > 0) {
            values.push(paramCount + 1);
            await pool.query(`
        UPDATE meta_ad_campaigns 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE campaign_id = $1
      `, values);
        }
        (0, apiHelpers_1.sendSuccess)(res, { success: true });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to update campaign', err);
    }
}
async function deleteCampaign(pool, req, res) {
    try {
        const { id } = req.params;
        const accessToken = await getMetaAccessToken(pool);
        if (!accessToken) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Meta access token not configured');
        }
        const result = await callMetaAPI(id, 'DELETE', {}, accessToken);
        if (result.error && !result.success) {
            return (0, apiHelpers_1.sendError)(res, 400, result.error.message || 'Failed to delete campaign');
        }
        await pool.query('DELETE FROM meta_ad_campaigns WHERE campaign_id = $1', [id]);
        (0, apiHelpers_1.sendSuccess)(res, { success: true });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete campaign', err);
    }
}
// ==================== AD SETS ====================
async function getAdSets(pool, req, res) {
    try {
        await ensureTables(pool);
        const { campaign_id } = req.query;
        let query = 'SELECT * FROM meta_ad_sets';
        const params = [];
        if (campaign_id) {
            query += ' WHERE campaign_id = $1';
            params.push(campaign_id);
        }
        query += ' ORDER BY created_at DESC';
        const { rows } = await pool.query(query, params);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to get ad sets', err);
    }
}
async function createAdSet(pool, req, res) {
    try {
        await ensureTables(pool);
        const accessToken = await getMetaAccessToken(pool);
        const adAccountId = await getAdAccountId(pool);
        if (!accessToken || !adAccountId) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Meta Ads not configured');
        }
        const { campaign_id, name, status = 'PAUSED', daily_budget, lifetime_budget, billing_event = 'IMPRESSIONS', optimization_goal, targeting, start_time, end_time, bid_strategy, promoted_object, } = req.body;
        if (!campaign_id || !name) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Campaign ID and ad set name are required');
        }
        // Build comprehensive targeting object
        const targetingObject = {
            age_min: targeting?.age_min || 18,
            age_max: targeting?.age_max || 65,
            genders: targeting?.genders || [1, 2], // 1 = male, 2 = female
            geo_locations: {
                countries: targeting?.countries || ['IN'],
                ...(targeting?.regions && { regions: targeting.regions }),
                ...(targeting?.cities && { cities: targeting.cities }),
            },
        };
        // Add interests if provided
        if (targeting?.interests && targeting.interests.length > 0) {
            targetingObject.interests = targeting.interests;
        }
        // Add behaviors if provided
        if (targeting?.behaviors && targeting.behaviors.length > 0) {
            targetingObject.behaviors = targeting.behaviors;
        }
        // Add custom audiences if provided
        if (targeting?.custom_audiences && targeting.custom_audiences.length > 0) {
            targetingObject.custom_audiences = targeting.custom_audiences.map((id) => ({ id }));
        }
        // Add lookalike audiences if provided
        if (targeting?.lookalike_audiences && targeting.lookalike_audiences.length > 0) {
            targetingObject.flexible_spec = [
                {
                    lookalike_specs: targeting.lookalike_audiences.map((aud) => ({
                        lookalike_spec: {
                            origin: [{ id: aud.source_audience_id }],
                            ratio: aud.ratio || 0.01,
                            country: aud.country || 'IN',
                        },
                    })),
                },
            ];
        }
        // Add device platforms
        if (targeting?.device_platforms) {
            targetingObject.device_platforms = targeting.device_platforms;
        }
        else {
            targetingObject.device_platforms = ['facebook', 'instagram', 'messenger', 'audience_network'];
        }
        // Add placements
        if (targeting?.placements) {
            targetingObject.publisher_platforms = targeting.placements;
        }
        const adSetData = {
            name,
            campaign_id,
            status,
            billing_event,
            optimization_goal: optimization_goal || 'LINK_CLICKS',
            targeting: targetingObject,
        };
        if (daily_budget) {
            adSetData.daily_budget = Math.round(daily_budget * 100); // Convert to cents
        }
        if (lifetime_budget) {
            adSetData.lifetime_budget = Math.round(lifetime_budget * 100);
        }
        if (start_time) {
            adSetData.start_time = start_time;
        }
        if (end_time) {
            adSetData.end_time = end_time;
        }
        if (bid_strategy) {
            adSetData.bid_strategy = bid_strategy;
        }
        if (promoted_object) {
            adSetData.promoted_object = promoted_object;
        }
        const result = await callMetaAPI(`${adAccountId}/adsets`, 'POST', adSetData, accessToken);
        if (result.error) {
            return (0, apiHelpers_1.sendError)(res, 400, result.error.message || 'Failed to create ad set', result.error);
        }
        const adsetId = result.id;
        // Fetch full ad set details
        const adSetDetails = await callMetaAPI(adsetId, 'GET', { fields: 'id,name,status,daily_budget,lifetime_budget,billing_event,optimization_goal,targeting,start_time,end_time,created_time,updated_time,bid_strategy' }, accessToken);
        // Save to database
        await pool.query(`
      INSERT INTO meta_ad_sets (
        adset_id, campaign_id, name, status, daily_budget, lifetime_budget,
        billing_event, optimization_goal, targeting, start_time, end_time,
        created_time, updated_time, meta_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (adset_id) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        daily_budget = EXCLUDED.daily_budget,
        lifetime_budget = EXCLUDED.lifetime_budget,
        targeting = EXCLUDED.targeting,
        updated_time = EXCLUDED.updated_time,
        meta_data = EXCLUDED.meta_data,
        updated_at = NOW()
    `, [
            adsetId,
            campaign_id,
            name,
            status,
            daily_budget || null,
            lifetime_budget || null,
            billing_event,
            optimization_goal || 'LINK_CLICKS',
            JSON.stringify(targetingObject),
            start_time || null,
            end_time || null,
            adSetDetails.created_time || null,
            adSetDetails.updated_time || null,
            JSON.stringify(adSetDetails),
        ]);
        (0, apiHelpers_1.sendSuccess)(res, { adset_id: adsetId, ...adSetDetails }, 201);
    }
    catch (err) {
        console.error('Ad set creation error:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create ad set', err);
    }
}
async function updateAdSet(pool, req, res) {
    try {
        const { id } = req.params;
        const accessToken = await getMetaAccessToken(pool);
        if (!accessToken) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Meta access token not configured');
        }
        const updateData = {};
        const allowedFields = ['name', 'status', 'daily_budget', 'lifetime_budget', 'start_time', 'end_time', 'targeting'];
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                if (field === 'daily_budget' || field === 'lifetime_budget') {
                    updateData[field] = Math.round(req.body[field] * 100);
                }
                else if (field === 'targeting') {
                    updateData[field] = req.body[field];
                }
                else {
                    updateData[field] = req.body[field];
                }
            }
        }
        const result = await callMetaAPI(id, 'POST', updateData, accessToken);
        if (result.error) {
            return (0, apiHelpers_1.sendError)(res, 400, result.error.message || 'Failed to update ad set');
        }
        // Update database
        const updateFields = [];
        const values = [id];
        let paramCount = 1;
        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                paramCount++;
                if (key === 'targeting') {
                    updateFields.push(`targeting = $${paramCount}::jsonb`);
                }
                else {
                    updateFields.push(`${key} = $${paramCount}`);
                }
                values.push(key === 'targeting' ? JSON.stringify(value) : value);
            }
        }
        if (updateFields.length > 0) {
            values.push(paramCount + 1);
            await pool.query(`
        UPDATE meta_ad_sets 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE adset_id = $1
      `, values);
        }
        (0, apiHelpers_1.sendSuccess)(res, { success: true });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to update ad set', err);
    }
}
async function deleteAdSet(pool, req, res) {
    try {
        const { id } = req.params;
        const accessToken = await getMetaAccessToken(pool);
        if (!accessToken) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Meta access token not configured');
        }
        const result = await callMetaAPI(id, 'DELETE', {}, accessToken);
        if (result.error && !result.success) {
            return (0, apiHelpers_1.sendError)(res, 400, result.error.message || 'Failed to delete ad set');
        }
        await pool.query('DELETE FROM meta_ad_sets WHERE adset_id = $1', [id]);
        (0, apiHelpers_1.sendSuccess)(res, { success: true });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete ad set', err);
    }
}
// ==================== ADS ====================
async function getAds(pool, req, res) {
    try {
        await ensureTables(pool);
        const { adset_id, campaign_id } = req.query;
        let query = 'SELECT * FROM meta_ads';
        const params = [];
        const conditions = [];
        if (adset_id) {
            params.push(adset_id);
            conditions.push(`adset_id = $${params.length}`);
        }
        if (campaign_id) {
            params.push(campaign_id);
            conditions.push(`campaign_id = $${params.length}`);
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY created_at DESC';
        const { rows } = await pool.query(query, params);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to get ads', err);
    }
}
async function createAdCreative(pool, req, res) {
    try {
        await ensureTables(pool);
        const accessToken = await getMetaAccessToken(pool);
        const adAccountId = await getAdAccountId(pool);
        if (!accessToken || !adAccountId) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Meta Ads not configured');
        }
        const { name, object_story_spec, // For single image/video ads
        link_url, image_url, video_id, call_to_action_type, page_id, } = req.body;
        if (!name || !link_url) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Creative name and link URL are required');
        }
        // Create ad creative
        const creativeData = {
            name,
            object_story_spec: object_story_spec || {
                page_id: page_id || (await getPageId(pool)),
                link_data: {
                    link: link_url,
                    message: req.body.message || '',
                    ...(image_url && { image_url }),
                    ...(video_id && { video_id }),
                    ...(call_to_action_type && { call_to_action: { type: call_to_action_type } }),
                },
            },
        };
        const result = await callMetaAPI(`${adAccountId}/adcreatives`, 'POST', creativeData, accessToken);
        if (result.error) {
            return (0, apiHelpers_1.sendError)(res, 400, result.error.message || 'Failed to create ad creative', result.error);
        }
        (0, apiHelpers_1.sendSuccess)(res, { creative_id: result.id, ...result }, 201);
    }
    catch (err) {
        console.error('Creative creation error:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create ad creative', err);
    }
}
async function getPageId(pool) {
    try {
        const { rows } = await pool.query('SELECT page_id FROM facebook_config ORDER BY created_at DESC LIMIT 1');
        return rows[0]?.page_id || null;
    }
    catch {
        return null;
    }
}
// Helper function to create ad creative (used internally)
async function createAdCreativeHelper(pool, accessToken, adAccountId, creativeData) {
    const result = await callMetaAPI(`${adAccountId}/adcreatives`, 'POST', creativeData, accessToken);
    if (result.error) {
        throw new Error(result.error.message || 'Failed to create ad creative');
    }
    return result;
}
async function createAd(pool, req, res) {
    try {
        await ensureTables(pool);
        const accessToken = await getMetaAccessToken(pool);
        const adAccountId = await getAdAccountId(pool);
        if (!accessToken || !adAccountId) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Meta Ads not configured');
        }
        const { adset_id, name, status = 'PAUSED', creative_id, // Use creative_id instead of full creative object
        creative, // Or use full creative object
         } = req.body;
        if (!adset_id || !name) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Ad set ID and name are required');
        }
        // Get campaign_id from adset
        const { rows: adSetRows } = await pool.query('SELECT campaign_id FROM meta_ad_sets WHERE adset_id = $1', [adset_id]);
        const campaign_id = adSetRows[0]?.campaign_id;
        // If creative_id is provided, use it; otherwise create creative from creative object
        let finalCreativeId = creative_id;
        if (!finalCreativeId && creative) {
            // Create creative first using helper function
            try {
                const pageId = await getPageId(pool);
                const creativeData = {
                    name: `${name} - Creative`,
                    object_story_spec: {
                        page_id: pageId || creative.page_id,
                        link_data: {
                            link: creative.link_url,
                            message: creative.message || '',
                            ...(creative.image_url && { image_url: creative.image_url }),
                            ...(creative.video_id && { video_id: creative.video_id }),
                            ...(creative.call_to_action_type && {
                                call_to_action: { type: creative.call_to_action_type }
                            }),
                        },
                    },
                };
                const creativeResult = await createAdCreativeHelper(pool, accessToken, adAccountId, creativeData);
                finalCreativeId = creativeResult.id;
            }
            catch (err) {
                return (0, apiHelpers_1.sendError)(res, 400, err.message || 'Failed to create creative');
            }
        }
        if (!finalCreativeId) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Creative ID or creative object is required');
        }
        const adData = {
            name,
            adset_id,
            status,
            creative: {
                creative_id: finalCreativeId,
            },
        };
        const result = await callMetaAPI(`${adAccountId}/ads`, 'POST', adData, accessToken);
        if (result.error) {
            return (0, apiHelpers_1.sendError)(res, 400, result.error.message || 'Failed to create ad', result.error);
        }
        const adId = result.id;
        // Fetch full ad details
        const adDetails = await callMetaAPI(adId, 'GET', { fields: 'id,name,status,creative,preview_url,created_time,updated_time' }, accessToken);
        // Save to database
        await pool.query(`
      INSERT INTO meta_ads (
        ad_id, adset_id, campaign_id, name, status, creative, preview_url,
        created_time, updated_time, meta_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (ad_id) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        creative = EXCLUDED.creative,
        preview_url = EXCLUDED.preview_url,
        updated_time = EXCLUDED.updated_time,
        meta_data = EXCLUDED.meta_data,
        updated_at = NOW()
    `, [
            adId,
            adset_id,
            campaign_id || null,
            name,
            status,
            JSON.stringify({ creative_id: finalCreativeId }),
            adDetails.preview_url || null,
            adDetails.created_time || null,
            adDetails.updated_time || null,
            JSON.stringify(adDetails),
        ]);
        (0, apiHelpers_1.sendSuccess)(res, { ad_id: adId, ...adDetails }, 201);
    }
    catch (err) {
        console.error('Ad creation error:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create ad', err);
    }
}
async function updateAd(pool, req, res) {
    try {
        const { id } = req.params;
        const accessToken = await getMetaAccessToken(pool);
        if (!accessToken) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Meta access token not configured');
        }
        const updateData = {};
        const allowedFields = ['name', 'status'];
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }
        const result = await callMetaAPI(id, 'POST', updateData, accessToken);
        if (result.error) {
            return (0, apiHelpers_1.sendError)(res, 400, result.error.message || 'Failed to update ad');
        }
        // Update database
        const updateFields = [];
        const values = [id];
        let paramCount = 1;
        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                paramCount++;
                updateFields.push(`${key} = $${paramCount}`);
                values.push(value);
            }
        }
        if (updateFields.length > 0) {
            values.push(paramCount + 1);
            await pool.query(`
        UPDATE meta_ads 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE ad_id = $1
      `, values);
        }
        (0, apiHelpers_1.sendSuccess)(res, { success: true });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to update ad', err);
    }
}
async function deleteAd(pool, req, res) {
    try {
        const { id } = req.params;
        const accessToken = await getMetaAccessToken(pool);
        if (!accessToken) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Meta access token not configured');
        }
        const result = await callMetaAPI(id, 'DELETE', {}, accessToken);
        if (result.error && !result.success) {
            return (0, apiHelpers_1.sendError)(res, 400, result.error.message || 'Failed to delete ad');
        }
        await pool.query('DELETE FROM meta_ads WHERE ad_id = $1', [id]);
        (0, apiHelpers_1.sendSuccess)(res, { success: true });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete ad', err);
    }
}
// ==================== INSIGHTS / PERFORMANCE ====================
async function getInsights(pool, req, res) {
    try {
        await ensureTables(pool);
        const { campaign_id, adset_id, ad_id, date_start, date_stop } = req.query;
        let query = 'SELECT * FROM meta_ad_insights WHERE 1=1';
        const params = [];
        let paramCount = 0;
        if (campaign_id) {
            paramCount++;
            query += ` AND campaign_id = $${paramCount}`;
            params.push(campaign_id);
        }
        if (adset_id) {
            paramCount++;
            query += ` AND adset_id = $${paramCount}`;
            params.push(adset_id);
        }
        if (ad_id) {
            paramCount++;
            query += ` AND ad_id = $${paramCount}`;
            params.push(ad_id);
        }
        if (date_start) {
            paramCount++;
            query += ` AND date_start >= $${paramCount}`;
            params.push(date_start);
        }
        if (date_stop) {
            paramCount++;
            query += ` AND date_stop <= $${paramCount}`;
            params.push(date_stop);
        }
        query += ' ORDER BY date_start DESC, created_at DESC';
        const { rows } = await pool.query(query, params);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to get insights', err);
    }
}
async function syncInsights(pool, req, res) {
    try {
        await ensureTables(pool);
        const accessToken = await getMetaAccessToken(pool);
        if (!accessToken) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Meta access token not configured');
        }
        const { campaign_id, adset_id, ad_id, date_start, date_stop } = req.query;
        const level = ad_id ? 'ad' : adset_id ? 'adset' : 'campaign';
        const id = ad_id || adset_id || campaign_id;
        if (!id) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Campaign ID, Ad Set ID, or Ad ID is required');
        }
        const fields = 'impressions,clicks,spend,reach,cpm,cpc,ctr,actions,conversions';
        const params = {
            fields,
            time_range: JSON.stringify({
                since: date_start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                until: date_stop || new Date().toISOString().split('T')[0],
            }),
        };
        const result = await callMetaAPI(`${id}/insights`, 'GET', params, accessToken);
        if (result.error) {
            return (0, apiHelpers_1.sendError)(res, 400, result.error.message || 'Failed to fetch insights');
        }
        const insights = Array.isArray(result.data) ? result.data : [result];
        // Save insights to database
        for (const insight of insights) {
            const conversions = insight.actions?.find((a) => a.action_type === 'purchase')?.value || 0;
            const conversionValue = insight.action_values?.find((a) => a.action_type === 'purchase')?.value || 0;
            await pool.query(`
        INSERT INTO meta_ad_insights (
          campaign_id, adset_id, ad_id, date_start, date_stop,
          impressions, clicks, spend, reach, cpm, cpc, ctr,
          conversions, conversion_value, meta_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT DO NOTHING
      `, [
                campaign_id || null,
                adset_id || null,
                ad_id || null,
                insight.date_start || null,
                insight.date_stop || null,
                insight.impressions || 0,
                insight.clicks || 0,
                insight.spend ? parseFloat(insight.spend) : 0,
                insight.reach || 0,
                insight.cpm ? parseFloat(insight.cpm) : 0,
                insight.cpc ? parseFloat(insight.cpc) : 0,
                insight.ctr ? parseFloat(insight.ctr) : 0,
                conversions,
                conversionValue,
                JSON.stringify(insight),
            ]);
        }
        (0, apiHelpers_1.sendSuccess)(res, { synced: insights.length, insights });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to sync insights', err);
    }
}
// ==================== PIXEL EVENTS ====================
async function trackPixelEvent(pool, req, res) {
    try {
        await ensureTables(pool);
        const { event_name, event_id, user_data, event_data, source_url, } = req.body;
        if (!event_name) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Event name is required');
        }
        // Save event to database
        const { rows } = await pool.query(`
      INSERT INTO meta_pixel_events (
        event_name, event_id, user_data, event_data, source_url,
        user_agent, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
            event_name,
            event_id || null,
            JSON.stringify(user_data || {}),
            JSON.stringify(event_data || {}),
            source_url || null,
            req.headers['user-agent'] || null,
            req.ip || req.socket.remoteAddress || null,
        ]);
        // Forward to Meta Pixel API if configured
        const pixelId = process.env.META_PIXEL_ID;
        const accessToken = await getMetaAccessToken(pool);
        if (pixelId && accessToken) {
            try {
                await callMetaAPI(`${pixelId}/events`, 'POST', {
                    data: [{
                            event_name,
                            event_id,
                            event_time: Math.floor(Date.now() / 1000),
                            user_data: user_data || {},
                            custom_data: event_data || {},
                            action_source: 'website',
                        }],
                    access_token: accessToken,
                }, accessToken);
            }
            catch (err) {
                console.error('Failed to forward pixel event to Meta:', err);
                // Don't fail the request if pixel forwarding fails
            }
        }
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to track pixel event', err);
    }
}
async function getPixelEvents(pool, req, res) {
    try {
        await ensureTables(pool);
        const { event_name, limit = 100 } = req.query;
        let query = 'SELECT * FROM meta_pixel_events';
        const params = [];
        if (event_name) {
            query += ' WHERE event_name = $1';
            params.push(event_name);
        }
        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
        params.push(parseInt(limit));
        const { rows } = await pool.query(query, params);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to get pixel events', err);
    }
}
// ==================== AUDIENCES ====================
async function syncCustomAudience(pool, req, res) {
    try {
        const accessToken = await getMetaAccessToken(pool);
        const adAccountId = await getAdAccountId(pool);
        if (!accessToken || !adAccountId) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Meta Ads not configured');
        }
        const { audience_id, name, description, customer_list, is_lookalike, source_audience_id, lookalike_ratio, lookalike_country } = req.body;
        if (!name) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Audience name is required');
        }
        let result;
        if (is_lookalike && source_audience_id) {
            // Create lookalike audience
            const lookalikeData = {
                name,
                subtype: 'LOOKALIKE',
                lookalike_spec: {
                    origin: [{ id: source_audience_id }],
                    ratio: lookalike_ratio || 0.01, // 1% by default
                    country: lookalike_country || 'IN',
                },
            };
            result = await callMetaAPI(`${adAccountId}/customaudiences`, 'POST', lookalikeData, accessToken);
        }
        else {
            // Create or update custom audience
            const audienceData = {
                name,
                description: description || '',
                subtype: 'CUSTOM',
            };
            if (audience_id) {
                // Update existing audience
                result = await callMetaAPI(audience_id, 'POST', audienceData, accessToken);
            }
            else {
                // Create new audience
                result = await callMetaAPI(`${adAccountId}/customaudiences`, 'POST', audienceData, accessToken);
            }
            // If customer list provided, add users to audience
            if (customer_list && Array.isArray(customer_list) && customer_list.length > 0) {
                const payload = {
                    schema: ['EMAIL', 'PHONE', 'FN', 'LN'],
                    data: customer_list.map((customer) => [
                        customer.email || '',
                        customer.phone || '',
                        customer.first_name || '',
                        customer.last_name || '',
                    ]),
                };
                await callMetaAPI(`${result.id}/users`, 'POST', { payload: JSON.stringify(payload) }, accessToken);
            }
        }
        if (result.error) {
            return (0, apiHelpers_1.sendError)(res, 400, result.error.message || 'Failed to sync audience', result.error);
        }
        (0, apiHelpers_1.sendSuccess)(res, { audience_id: result.id, ...result });
    }
    catch (err) {
        console.error('Audience sync error:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to sync custom audience', err);
    }
}
async function getAudiences(pool, req, res) {
    try {
        const accessToken = await getMetaAccessToken(pool);
        const adAccountId = await getAdAccountId(pool);
        if (!accessToken || !adAccountId) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Meta Ads not configured');
        }
        const result = await callMetaAPI(`${adAccountId}/customaudiences`, 'GET', { fields: 'id,name,subtype,approximate_count,description,created_time' }, accessToken);
        if (result.error) {
            return (0, apiHelpers_1.sendError)(res, 400, result.error.message || 'Failed to get audiences');
        }
        (0, apiHelpers_1.sendSuccess)(res, Array.isArray(result.data) ? result.data : [result]);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to get audiences', err);
    }
}
