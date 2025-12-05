"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommunicationsRoutes = registerCommunicationsRoutes;
const apiHelpers_1 = require("../utils/apiHelpers");
function registerCommunicationsRoutes(app, pool, io) {
    // Forms
    app.get('/api/forms', async (_req, res) => {
        try {
            const { rows } = await pool.query(`
        SELECT f.*, 
               COALESCE(COUNT(fs.id), 0)::int as submission_count
        FROM forms f
        LEFT JOIN form_submissions fs ON f.id = fs.form_id
        GROUP BY f.id
        ORDER BY f.created_at DESC
      `);
            (0, apiHelpers_1.sendSuccess)(res, { forms: rows });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch forms', err);
        }
    });
    // IMPORTANT: This route must come BEFORE /api/forms/:id to avoid route conflicts
    app.get('/api/forms/submissions', async (_req, res) => {
        try {
            const { rows } = await pool.query(`
        SELECT fs.*, f.name as form_name
        FROM form_submissions fs JOIN forms f ON fs.form_id = f.id
        ORDER BY fs.created_at DESC
      `);
            (0, apiHelpers_1.sendSuccess)(res, { submissions: rows });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch form submissions', err);
        }
    });
    app.get('/api/forms/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { rows } = await pool.query(`
        SELECT f.*, 
               COALESCE(COUNT(fs.id), 0)::int as submission_count
        FROM forms f
        LEFT JOIN form_submissions fs ON f.id = fs.form_id
        WHERE f.id = $1
        GROUP BY f.id
      `, [id]);
            if (rows.length === 0)
                return (0, apiHelpers_1.sendError)(res, 404, 'Form not found');
            (0, apiHelpers_1.sendSuccess)(res, rows[0]);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch form', err);
        }
    });
    app.post('/api/forms', async (req, res) => {
        try {
            const { name, description, fields, settings, isPublished } = req.body;
            if (!name)
                return (0, apiHelpers_1.sendError)(res, 400, 'Form name is required');
            const formFields = fields || [];
            const formStatus = isPublished ? 'active' : 'draft';
            const { rows } = await pool.query(`
        INSERT INTO forms (name, fields, status)
        VALUES ($1, $2::jsonb, $3)
        RETURNING *
      `, [name, JSON.stringify(formFields), formStatus]);
            io.to('admin-panel').emit('update', { type: 'form_created', data: rows[0] });
            (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to create form', err);
        }
    });
    app.put('/api/forms/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, fields, settings, isPublished } = req.body;
            const formFields = fields || [];
            const formStatus = isPublished ? 'active' : 'draft';
            const formName = name || '';
            const { rows } = await pool.query(`
        UPDATE forms 
        SET name = $1, fields = $2::jsonb, status = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `, [formName, JSON.stringify(formFields), formStatus, id]);
            if (rows.length === 0)
                return (0, apiHelpers_1.sendError)(res, 404, 'Form not found');
            io.to('admin-panel').emit('update', { type: 'form_updated', data: rows[0] });
            (0, apiHelpers_1.sendSuccess)(res, rows[0]);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to update form', err);
        }
    });
    app.delete('/api/forms/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { rows } = await pool.query(`
        DELETE FROM forms WHERE id = $1 RETURNING *
      `, [id]);
            if (rows.length === 0)
                return (0, apiHelpers_1.sendError)(res, 404, 'Form not found');
            io.to('admin-panel').emit('update', { type: 'form_deleted', data: { id } });
            (0, apiHelpers_1.sendSuccess)(res, { message: 'Form deleted successfully' });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to delete form', err);
        }
    });
    app.post('/api/forms/:id/submit', async (req, res) => {
        try {
            const { id } = req.params;
            const { data, userEmail, userName } = req.body;
            if (!data)
                return (0, apiHelpers_1.sendError)(res, 400, 'Form data is required');
            // Check if form exists
            const formCheck = await pool.query('SELECT * FROM forms WHERE id = $1', [id]);
            if (formCheck.rows.length === 0)
                return (0, apiHelpers_1.sendError)(res, 404, 'Form not found');
            // Ensure form_submissions table has required columns
            try {
                await pool.query(`
          CREATE TABLE IF NOT EXISTS form_submissions (
            id SERIAL PRIMARY KEY,
            form_id INTEGER,
            data JSONB NOT NULL DEFAULT '{}'::jsonb,
            status TEXT NOT NULL DEFAULT 'new',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
                // Add columns if they don't exist
                await pool.query(`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb`);
                await pool.query(`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new'`);
                await pool.query(`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS form_id INTEGER`);
                await pool.query(`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
                await pool.query(`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
                // Add foreign key constraint if it doesn't exist
                try {
                    await pool.query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'form_submissions_form_id_fkey'
              ) THEN
                ALTER TABLE form_submissions 
                ADD CONSTRAINT form_submissions_form_id_fkey 
                FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE SET NULL;
              END IF;
            END $$;
          `);
                }
                catch (fkError) {
                    // Foreign key might already exist, ignore
                    console.log('Foreign key constraint already exists or could not be added');
                }
            }
            catch (migrationError) {
                console.error('Migration error (continuing anyway):', migrationError);
                // Continue even if migration fails - table might already be correct
            }
            // Insert submission
            const { rows } = await pool.query(`
        INSERT INTO form_submissions (form_id, data, status)
        VALUES ($1, $2::jsonb, 'new')
        RETURNING *
      `, [id, JSON.stringify(data)]);
            // Try to find user by email if provided
            let userId = null;
            if (userEmail) {
                try {
                    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [userEmail]);
                    if (userResult.rows.length > 0) {
                        userId = userResult.rows[0].id;
                    }
                }
                catch { }
            }
            // Track form submission in user activities
            try {
                await pool.query(`
          INSERT INTO user_activities (user_id, activity_type, activity_subtype, form_type, form_data, page_url, user_agent, ip_address)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
        `, [
                    userId,
                    'form_submit',
                    'custom_form',
                    formCheck.rows[0].name,
                    JSON.stringify(data),
                    req.headers.referer || '/',
                    req.headers['user-agent'],
                    req.ip || req.connection?.remoteAddress
                ]);
            }
            catch { }
            // Create notification for admin
            try {
                await pool.query(`
          INSERT INTO admin_notifications (user_id, notification_type, title, message, link, icon, priority, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
                    null,
                    'form_submission',
                    'New Form Submission',
                    `New submission for form: ${formCheck.rows[0].name}${userName ? ` from ${userName}` : ''}`,
                    `/admin/form-builder`,
                    '📋',
                    'medium',
                    JSON.stringify({ form_id: id, submission_id: rows[0].id, user_email: userEmail })
                ]);
                io.to('admin-panel').emit('new-notification', { notification_type: 'form_submission' });
            }
            catch { }
            io.to('admin-panel').emit('update', { type: 'form_submission_created', data: rows[0] });
            (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to submit form', err);
        }
    });
    app.get('/api/forms/:id/submissions', async (req, res) => {
        try {
            const { id } = req.params;
            const { rows } = await pool.query(`
        SELECT fs.*, f.name as form_name
        FROM form_submissions fs 
        JOIN forms f ON fs.form_id = f.id
        WHERE fs.form_id = $1
        ORDER BY fs.created_at DESC
      `, [id]);
            (0, apiHelpers_1.sendSuccess)(res, { submissions: rows });
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch form submissions', err);
        }
    });
    // Contact
    app.post('/api/contact/submit', async (req, res) => {
        try {
            const { name, email, phone, message } = req.body;
            if (!name || !email || !message)
                return (0, apiHelpers_1.sendError)(res, 400, 'Name, email and message are required');
            const { rows } = await pool.query(`
        INSERT INTO contact_messages (name, email, phone, message)
        VALUES ($1, $2, $3, $4) RETURNING *
      `, [name, email, phone || null, message]);
            io.to('admin-panel').emit('update', { type: 'contact_message_created', data: rows[0] });
            try {
                await pool.query(`
          INSERT INTO admin_notifications (user_id, notification_type, title, message, link, icon, priority, metadata)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [null, 'contact', 'New Contact Message', `Message from ${name} (${email})`, `/admin/contact-messages`, '📧', 'medium', JSON.stringify({ message_id: rows[0].id, name, email })]);
                io.to('admin-panel').emit('new-notification', { notification_type: 'contact' });
            }
            catch { }
            try {
                const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
                const userId = userResult.rows.length > 0 ? userResult.rows[0].id : null;
                await pool.query(`
          INSERT INTO user_activities (user_id, activity_type, activity_subtype, form_type, form_data, page_url, user_agent, ip_address)
          VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8)
        `, [userId, 'form_submit', 'contact', 'Contact Form', JSON.stringify({ name, email, phone, message }), req.headers.referer || '/contact', req.headers['user-agent'], req.ip || req.connection?.remoteAddress]);
            }
            catch { }
            (0, apiHelpers_1.sendSuccess)(res, rows[0], 201);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to submit contact message', err);
        }
    });
    app.get('/api/contact/messages', async (req, res) => {
        try {
            const { status } = req.query;
            let query = 'SELECT * FROM contact_messages';
            const values = [];
            if (status) {
                query += ' WHERE status = $1';
                values.push(status);
            }
            query += ' ORDER BY created_at DESC';
            const { rows } = await pool.query(query, values);
            (0, apiHelpers_1.sendSuccess)(res, rows);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch contact messages', err);
        }
    });
    app.put('/api/contact/messages/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body || {};
            if (!status)
                return (0, apiHelpers_1.sendError)(res, 400, 'Status is required');
            const { rows } = await pool.query(`
        UPDATE contact_messages SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *
      `, [status, id]);
            if (rows.length === 0)
                return (0, apiHelpers_1.sendError)(res, 404, 'Contact message not found');
            io.to('admin-panel').emit('update', { type: 'contact_message_updated', data: rows[0] });
            (0, apiHelpers_1.sendSuccess)(res, rows[0]);
        }
        catch (err) {
            (0, apiHelpers_1.sendError)(res, 500, 'Failed to update contact message', err);
        }
    });
}
