"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaffContextByToken = getStaffContextByToken;
exports.createStaffAuthMiddleware = createStaffAuthMiddleware;
exports.staffLogin = staffLogin;
exports.createRole = createRole;
exports.listRoles = listRoles;
exports.createPermission = createPermission;
exports.assignPermissionToRole = assignPermissionToRole;
exports.createStaff = createStaff;
exports.assignRoleToStaff = assignRoleToStaff;
exports.listStaff = listStaff;
exports.listPermissions = listPermissions;
exports.getRolePermissions = getRolePermissions;
exports.setRolePermissions = setRolePermissions;
exports.listStaffActivity = listStaffActivity;
exports.staffLogout = staffLogout;
exports.staffMe = staffMe;
exports.staffChangePassword = staffChangePassword;
exports.resetPassword = resetPassword;
exports.disableStaff = disableStaff;
exports.seedStandardRolesAndPermissions = seedStandardRolesAndPermissions;
const apiHelpers_1 = require("../utils/apiHelpers");
const crypto_1 = __importDefault(require("crypto"));
function hashPassword(plain) {
    const salt = crypto_1.default.randomBytes(16).toString('hex');
    const hash = crypto_1.default.scryptSync(plain, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}
function verifyPassword(stored, plain) {
    try {
        if (!stored?.includes(':'))
            return false;
        const [salt, originalHash] = stored.split(':');
        const hashed = crypto_1.default.scryptSync(plain, salt, 64).toString('hex');
        const originalBuffer = Buffer.from(originalHash, 'hex');
        const hashedBuffer = Buffer.from(hashed, 'hex');
        if (originalBuffer.length !== hashedBuffer.length)
            return false;
        return crypto_1.default.timingSafeEqual(originalBuffer, hashedBuffer);
    }
    catch {
        return false;
    }
}
function toStringArray(value) {
    if (Array.isArray(value)) {
        return value.filter((item) => typeof item === 'string');
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.filter((item) => typeof item === 'string');
            }
        }
        catch {
            return value.split(',').map((item) => item.trim()).filter(Boolean);
        }
    }
    return [];
}
const SESSION_TTL_HOURS = Number(process.env.STAFF_SESSION_TTL_HOURS || 12);
async function fetchStaffWithAccess(pool, field, value) {
    const whereClause = field === 'email' ? 'lower(su.email) = lower($1)' : 'su.id = $1';
    const { rows } = await pool.query(`
      select
        su.*,
        coalesce(json_agg(distinct r.name) filter (where r.id is not null), '[]'::json) as roles,
        coalesce(json_agg(distinct p.code) filter (where p.id is not null), '[]'::json) as permissions
      from staff_users su
      left join staff_roles sr on sr.staff_id = su.id
      left join roles r on r.id = sr.role_id
      left join role_permissions rp on rp.role_id = r.id
      left join permissions p on p.id = rp.permission_id
      where ${whereClause}
      group by su.id
    `, [value]);
    return rows[0] || null;
}
function toStaffResponse(row) {
    const roles = toStringArray(row.roles) || [];
    const permissions = toStringArray(row.permissions) || [];
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: roles[0] || 'admin',
        roles,
        permissions
    };
}
async function getStaffContextByToken(pool, token) {
    const { rows } = await pool.query(`
      select
        ss.id as session_id,
        ss.token,
        ss.staff_id,
        ss.expires_at,
        ss.revoked_at,
        su.name,
        su.email,
        su.is_active,
        coalesce(json_agg(distinct r.name) filter (where r.id is not null), '[]'::json) as roles,
        coalesce(json_agg(distinct p.code) filter (where p.id is not null), '[]'::json) as permissions
      from staff_sessions ss
      inner join staff_users su on su.id = ss.staff_id
      left join staff_roles sr on sr.staff_id = su.id
      left join roles r on r.id = sr.role_id
      left join role_permissions rp on rp.role_id = r.id
      left join permissions p on p.id = rp.permission_id
      where ss.token = $1
      group by ss.id, su.id
    `, [token]);
    const row = rows[0];
    if (!row)
        return null;
    if (!row.is_active)
        return null;
    if (row.revoked_at)
        return null;
    if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now())
        return null;
    const roles = toStringArray(row.roles);
    const permissions = toStringArray(row.permissions);
    return {
        staffId: row.staff_id,
        sessionId: row.session_id,
        token: row.token,
        name: row.name,
        email: row.email,
        roles,
        permissions,
        primaryRole: roles[0] || 'admin'
    };
}
function createStaffAuthMiddleware(pool) {
    return async (req, res, next) => {
        try {
            const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
            if (!token) {
                return (0, apiHelpers_1.sendError)(res, 401, 'Admin session token missing');
            }
            const context = await getStaffContextByToken(pool, token);
            if (!context) {
                return (0, apiHelpers_1.sendError)(res, 401, 'Invalid or expired admin session');
            }
            ;
            req.staffId = context.staffId;
            req.staffSessionId = context.sessionId;
            req.staffSessionToken = context.token;
            req.userRole = context.primaryRole;
            req.userPermissions = context.permissions;
            req.staffContext = context;
            next();
        }
        catch (err) {
            console.error('Staff auth middleware error:', err);
            (0, apiHelpers_1.sendError)(res, 401, 'Failed to authenticate admin session');
        }
    };
}
async function staffLogin(pool, req, res) {
    try {
        const { email, password } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ email, password }, ['email', 'password']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const staff = await fetchStaffWithAccess(pool, 'email', String(email));
        if (!staff || !staff.is_active) {
            return (0, apiHelpers_1.sendError)(res, 401, 'Invalid credentials');
        }
        const passwordOk = verifyPassword(staff.password, String(password));
        if (!passwordOk) {
            await pool.query(`update staff_users set failed_login_attempts = failed_login_attempts + 1, last_failed_login_at = now(), updated_at = now() where id = $1`, [staff.id]);
            await logStaff(pool, staff.id, 'login_failed', { email });
            return (0, apiHelpers_1.sendError)(res, 401, 'Invalid credentials');
        }
        const sessionToken = `staff_${crypto_1.default.randomBytes(48).toString('hex')}`;
        const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
        const userAgent = req.headers['user-agent'] || null;
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
        await pool.query(`insert into staff_sessions (staff_id, token, user_agent, ip_address, metadata, expires_at)
       values ($1, $2, $3, $4, $5, $6)`, [staff.id, sessionToken, userAgent, ipAddress, JSON.stringify({ source: 'admin-panel' }), expiresAt]);
        await pool.query(`update staff_users
       set last_login_at = now(), failed_login_attempts = 0, updated_at = now(),
           password_changed_at = coalesce(password_changed_at, now())
       where id = $1`, [staff.id]);
        await logStaff(pool, staff.id, 'login', { ipAddress });
        (0, apiHelpers_1.sendSuccess)(res, {
            token: sessionToken,
            user: toStaffResponse(staff)
        });
    }
    catch (err) {
        console.error('Failed to login staff:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to login', err);
    }
}
async function logStaff(pool, staffId, action, details) {
    try {
        await pool.query(`insert into staff_activity_logs (staff_id, action, details, created_at) values ($1, $2, $3, now())`, [staffId, action, details ? JSON.stringify(details) : null]);
    }
    catch { }
}
async function createRole(pool, req, res) {
    try {
        const { name, description } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ name }, ['name']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const { rows } = await pool.query(`insert into roles (name, description, created_at, updated_at) values ($1, $2, now(), now()) returning *`, [name, description || null]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create role', err);
    }
}
async function listRoles(pool, req, res) {
    try {
        const { rows } = await pool.query('select * from roles order by name asc');
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to list roles', err);
    }
}
async function createPermission(pool, req, res) {
    try {
        const { code, description } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ code }, ['code']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const { rows } = await pool.query(`insert into permissions (code, description) values ($1, $2) returning *`, [code, description || null]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create permission', err);
    }
}
async function assignPermissionToRole(pool, req, res) {
    try {
        const { roleId, permissionId } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ roleId, permissionId }, ['roleId', 'permissionId']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        await pool.query(`insert into role_permissions (role_id, permission_id) values ($1, $2) on conflict do nothing`, [roleId, permissionId]);
        (0, apiHelpers_1.sendSuccess)(res, { roleId, permissionId }, 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to assign permission', err);
    }
}
async function createStaff(pool, req, res) {
    try {
        const { name, email, password } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ name, email, password }, ['name', 'email', 'password']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const hashed = hashPassword(password);
        const { rows } = await pool.query(`insert into staff_users (name, email, password, is_active, created_at, updated_at) values ($1, $2, $3, true, now(), now()) returning *`, [name, email, hashed]);
        await logStaff(pool, rows[0]?.id || null, 'staff_create', { email });
        (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create staff user', err);
    }
}
async function assignRoleToStaff(pool, req, res) {
    try {
        const { staffId, roleId } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ staffId, roleId }, ['staffId', 'roleId']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        await pool.query(`insert into staff_roles (staff_id, role_id) values ($1, $2) on conflict do nothing`, [staffId, roleId]);
        await logStaff(pool, staffId, 'assign_role', { roleId });
        (0, apiHelpers_1.sendSuccess)(res, { staffId, roleId }, 201);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to assign role to staff', err);
    }
}
async function listStaff(pool, req, res) {
    try {
        const { rows } = await pool.query(`select su.*, coalesce(json_agg(r.*) filter (where r.id is not null), '[]'::json) as roles
       from staff_users su
       left join staff_roles sr on sr.staff_id = su.id
       left join roles r on r.id = sr.role_id
       group by su.id
       order by su.created_at desc`);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to list staff users', err);
    }
}
async function listPermissions(pool, req, res) {
    try {
        const { rows } = await pool.query('select * from permissions order by code asc');
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to list permissions', err);
    }
}
async function getRolePermissions(pool, req, res) {
    try {
        const { rows } = await pool.query(`
      select r.id as role_id, r.name as role_name, p.id as permission_id, p.code as permission_code
      from roles r
      left join role_permissions rp on rp.role_id = r.id
      left join permissions p on p.id = rp.permission_id
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch role-permission matrix', err);
    }
}
async function setRolePermissions(pool, req, res) {
    try {
        // Body shape: { roleId: number, permissionIds: number[] }
        const { roleId, permissionIds } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ roleId }, ['roleId']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const ids = Array.isArray(permissionIds) ? permissionIds : [];
        await pool.query('begin');
        await pool.query('delete from role_permissions where role_id = $1', [roleId]);
        for (const pid of ids) {
            await pool.query('insert into role_permissions (role_id, permission_id) values ($1, $2) on conflict do nothing', [roleId, pid]);
        }
        await pool.query('commit');
        (0, apiHelpers_1.sendSuccess)(res, { roleId, permissionIds: ids });
    }
    catch (err) {
        await pool.query('rollback');
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to set role permissions', err);
    }
}
async function listStaffActivity(pool, req, res) {
    try {
        const { staff_id, action, from, to } = (req.query || {});
        const where = [];
        const params = [];
        if (staff_id) {
            where.push(`staff_id = $${params.length + 1}`);
            params.push(staff_id);
        }
        if (action) {
            where.push(`action ilike $${params.length + 1}`);
            params.push(`%${action}%`);
        }
        if (from) {
            where.push(`created_at >= $${params.length + 1}`);
            params.push(from);
        }
        if (to) {
            where.push(`created_at <= $${params.length + 1}`);
            params.push(to);
        }
        const sql = `select * from staff_activity_logs ${where.length ? 'where ' + where.join(' and ') : ''} order by created_at desc limit 500`;
        const { rows } = await pool.query(sql, params);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch staff activity logs', err);
    }
}
async function staffLogout(pool, req, res) {
    try {
        const staffId = req.staffId;
        const sessionId = req.staffSessionId;
        if (!staffId || !sessionId) {
            return (0, apiHelpers_1.sendError)(res, 401, 'Invalid admin session');
        }
        await pool.query('update staff_sessions set revoked_at = now() where id = $1 and revoked_at is null', [sessionId]);
        await pool.query('update staff_users set last_logout_at = now(), updated_at = now() where id = $1', [staffId]);
        await logStaff(pool, staffId, 'logout');
        (0, apiHelpers_1.sendSuccess)(res, { success: true });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to logout', err);
    }
}
async function staffMe(pool, req, res) {
    try {
        const staffId = req.staffId;
        if (!staffId) {
            return (0, apiHelpers_1.sendError)(res, 401, 'Invalid admin session');
        }
        const staff = await fetchStaffWithAccess(pool, 'id', Number(staffId));
        if (!staff) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Staff account not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, { user: toStaffResponse(staff) });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch admin profile', err);
    }
}
async function staffChangePassword(pool, req, res) {
    try {
        const staffId = req.staffId;
        const sessionId = req.staffSessionId;
        if (!staffId || !sessionId) {
            return (0, apiHelpers_1.sendError)(res, 401, 'Invalid admin session');
        }
        const { currentPassword, newPassword, confirmNewPassword } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ currentPassword, newPassword, confirmNewPassword }, ['currentPassword', 'newPassword', 'confirmNewPassword']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        if (String(newPassword).length < 8) {
            return (0, apiHelpers_1.sendError)(res, 400, 'New password must be at least 8 characters long');
        }
        if (newPassword !== confirmNewPassword) {
            return (0, apiHelpers_1.sendError)(res, 400, 'New password and confirmation do not match');
        }
        const staff = await fetchStaffWithAccess(pool, 'id', Number(staffId));
        if (!staff) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Staff account not found');
        }
        const validOldPassword = verifyPassword(staff.password, String(currentPassword));
        if (!validOldPassword) {
            await logStaff(pool, staffId, 'password_change_failed');
            return (0, apiHelpers_1.sendError)(res, 400, 'Current password is incorrect');
        }
        const hashed = hashPassword(String(newPassword));
        await pool.query(`update staff_users
         set password = $2, password_changed_at = now(), updated_at = now()
       where id = $1`, [staffId, hashed]);
        await pool.query(`update staff_sessions
         set revoked_at = now()
       where staff_id = $1 and id <> $2 and revoked_at is null`, [staffId, sessionId]);
        await logStaff(pool, staffId, 'password_changed');
        (0, apiHelpers_1.sendSuccess)(res, { success: true });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to update password', err);
    }
}
async function resetPassword(pool, req, res) {
    try {
        const { staffId, newPassword } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ staffId, newPassword }, ['staffId', 'newPassword']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const hashed = hashPassword(newPassword);
        const { rows } = await pool.query(`update staff_users set password = $2, updated_at = now() where id = $1 returning id`, [staffId, hashed]);
        if (rows.length === 0)
            return (0, apiHelpers_1.sendError)(res, 404, 'Staff not found');
        await logStaff(pool, staffId, 'reset_password');
        (0, apiHelpers_1.sendSuccess)(res, { staffId });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to reset password', err);
    }
}
async function disableStaff(pool, req, res) {
    try {
        const { staffId } = req.body || {};
        const validationError = (0, apiHelpers_1.validateRequired)({ staffId }, ['staffId']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        const { rows } = await pool.query(`update staff_users set is_active = false, updated_at = now() where id = $1 returning id`, [staffId]);
        if (rows.length === 0)
            return (0, apiHelpers_1.sendError)(res, 404, 'Staff not found');
        await logStaff(pool, staffId, 'disable_account');
        (0, apiHelpers_1.sendSuccess)(res, { staffId, is_active: false });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to disable staff', err);
    }
}
async function seedStandardRolesAndPermissions(pool, req, res) {
    try {
        const standardPerms = [
            'products:read', 'products:update', 'orders:read', 'orders:update', 'shipping:read', 'shipping:update', 'invoices:read', 'returns:read', 'returns:update', 'returns:create', 'analytics:read', 'marketing:read', 'users:read', 'users:update', 'cms:read', 'payments:read', 'pos:read', 'pos:update'
        ];
        const standardRoles = {
            'admin': standardPerms,
            'manager': ['products:read', 'products:update', 'orders:read', 'orders:update', 'shipping:read', 'shipping:update', 'invoices:read', 'returns:read', 'returns:update', 'analytics:read', 'marketing:read', 'users:read'],
            'staff': ['orders:read', 'orders:update', 'shipping:read', 'shipping:update', 'invoices:read', 'returns:read', 'returns:update'],
            'viewer': ['products:read', 'orders:read', 'analytics:read']
        };
        await pool.query('begin');
        // Ensure permissions
        const permIdByCode = {};
        for (const code of standardPerms) {
            const pr = await pool.query(`insert into permissions (code) values ($1) on conflict (code) do nothing returning id`, [code]);
            if (pr.rows[0]?.id)
                permIdByCode[code] = pr.rows[0].id;
            else {
                const sel = await pool.query('select id from permissions where code = $1', [code]);
                if (sel.rows[0]?.id)
                    permIdByCode[code] = sel.rows[0].id;
            }
        }
        // Ensure roles and assignments
        for (const [roleName, codes] of Object.entries(standardRoles)) {
            const rr = await pool.query(`insert into roles (name) values ($1) on conflict (name) do nothing returning id`, [roleName]);
            const roleId = rr.rows[0]?.id || (await pool.query('select id from roles where name = $1', [roleName])).rows[0]?.id;
            if (!roleId)
                continue;
            await pool.query('delete from role_permissions where role_id = $1', [roleId]);
            for (const code of codes) {
                const pid = permIdByCode[code];
                if (pid)
                    await pool.query('insert into role_permissions (role_id, permission_id) values ($1, $2) on conflict do nothing', [roleId, pid]);
            }
        }
        await pool.query('commit');
        (0, apiHelpers_1.sendSuccess)(res, { ok: true });
    }
    catch (err) {
        await pool.query('rollback');
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to seed roles/permissions', err);
    }
}
