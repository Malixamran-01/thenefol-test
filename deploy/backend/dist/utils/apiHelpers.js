"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = sendError;
exports.sendSuccess = sendSuccess;
exports.handleGetAll = handleGetAll;
exports.handleCreate = handleCreate;
exports.handleUpdate = handleUpdate;
exports.authenticateToken = authenticateToken;
exports.requireRole = requireRole;
exports.requirePermission = requirePermission;
exports.parseCSVLine = parseCSVLine;
exports.validateRequired = validateRequired;
exports.withTransaction = withTransaction;
// Standardized error response
function sendError(res, status, message, error) {
    console.error(`API Error [${status}]:`, message, error);
    res.status(status).json({ error: message });
}
// Standardized success response
function sendSuccess(res, data, status = 200) {
    res.status(status).json(data);
}
// Generic GET handler for simple table queries
async function handleGetAll(pool, res, tableName, orderBy = 'created_at DESC', additionalQuery) {
    try {
        const query = additionalQuery || `SELECT * FROM ${tableName} ORDER BY ${orderBy}`;
        const { rows } = await pool.query(query);
        sendSuccess(res, rows);
    }
    catch (err) {
        sendError(res, 500, `Failed to fetch ${tableName}`, err);
    }
}
// Generic POST handler for table creation
async function handleCreate(pool, res, tableName, fields, values, broadcastEvent, broadcastData) {
    try {
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const { rows } = await pool.query(query, values);
        if (broadcastEvent && broadcastData) {
            // Broadcast update if needed
            console.log(`Broadcasting ${broadcastEvent}:`, broadcastData);
        }
        sendSuccess(res, rows[0], 201);
    }
    catch (err) {
        if (err?.code === '23505') {
            sendError(res, 409, `${tableName} already exists`);
        }
        else {
            sendError(res, 500, `Failed to create ${tableName}`, err);
        }
    }
}
// Generic UPDATE handler
async function handleUpdate(pool, res, tableName, id, updates, idField = 'id') {
    try {
        const fields = Object.keys(updates).filter(key => updates[key] !== undefined);
        const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
        const values = [id, ...fields.map(field => updates[field])];
        const query = `UPDATE ${tableName} SET ${setClause}, updated_at = NOW() WHERE ${idField} = $1 RETURNING *`;
        const { rows } = await pool.query(query, values);
        if (rows.length === 0) {
            return sendError(res, 404, `${tableName} not found`);
        }
        sendSuccess(res, rows[0]);
    }
    catch (err) {
        sendError(res, 500, `Failed to update ${tableName}`, err);
    }
}
// Authentication middleware
function authenticateToken(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    // If admin/staff user via headers, allow through (token validation not needed)
    const role = req.headers['x-user-role'];
    const permissionsHeader = req.headers['x-user-permissions'];
    if (role && permissionsHeader) {
        // Admin/staff user - allow through without token validation
        return next();
    }
    if (!token) {
        return sendError(res, 401, 'No token provided');
    }
    const tokenParts = token.split('_');
    if (tokenParts.length < 3 || tokenParts[0] !== 'user' || tokenParts[1] !== 'token') {
        return sendError(res, 401, 'Invalid token format');
    }
    // Extract userId from token (format: user_token_{userId}_{timestamp})
    req.userId = tokenParts[2];
    next();
}
// Simple role/permission checkers (to be wired with real auth later)
function requireRole(roles) {
    return (req, res, next) => {
        // Prefer role attached by auth layer
        const role = req.userRole || req.headers['x-user-role'] || '';
        if (!role || !roles.includes(role)) {
            return sendError(res, 403, 'Forbidden');
        }
        next();
    };
}
function requirePermission(perms) {
    return (req, res, next) => {
        // First check headers (admin panel sends these)
        const role = req.headers['x-user-role'];
        const permissionsHeader = req.headers['x-user-permissions'];
        const headerPerms = permissionsHeader ? permissionsHeader.split(',').map(s => s.trim()).filter(Boolean) : [];
        // If admin/staff user with permissions via headers, check directly
        if (role && headerPerms.length > 0) {
            const hasAllPerms = perms.every(perm => headerPerms.includes(perm));
            if (hasAllPerms) {
                return next();
            }
        }
        // Otherwise check attached permissions from RBAC
        const attached = req.userPermissions;
        const userPerms = attached && Array.isArray(attached)
            ? attached
            : headerPerms;
        const ok = perms.every(perm => userPerms.includes(perm));
        if (!ok)
            return sendError(res, 403, 'Forbidden');
        next();
    };
}
// CSV parsing utility
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // Skip next quote
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
}
// Validation helpers
function validateRequired(body, fields) {
    for (const field of fields) {
        if (!body[field]) {
            return `${field} is required`;
        }
    }
    return null;
}
// Database transaction helper
async function withTransaction(pool, callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
