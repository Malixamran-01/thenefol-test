import { Pool } from 'pg'
import { hashPassword } from '../utils/staffPassword'
import { SUPER_ADMIN_CONFIG } from '../config/superAdmin'

export async function seedSuperAdmin(pool: Pool): Promise<void> {
  if (!SUPER_ADMIN_CONFIG.email || !SUPER_ADMIN_CONFIG.password) {
    console.warn('[seedSuperAdmin] Skipped: set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD to provision the env super admin')
    return
  }
  const { email, password, name } = SUPER_ADMIN_CONFIG
  const hashed = hashPassword(password)

  await pool.query(
    `INSERT INTO staff_users (email, name, password, is_active, is_super_admin, created_at, updated_at)
     VALUES (lower($1), $2, $3, TRUE, TRUE, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       password = EXCLUDED.password,
       is_super_admin = TRUE,
       is_active = TRUE,
       updated_at = NOW()`,
    [email, name, hashed]
  )

  console.log(`[seedSuperAdmin] Super admin ensured: ${email}`)
}
