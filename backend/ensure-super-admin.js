/**
 * Ensures the .env super admin has a staff_users row (password synced from SUPER_ADMIN_PASSWORD).
 * Super admin *privileges* come from .env at runtime — not is_super_admin in the database.
 */
require('dotenv/config')

const crypto = require('crypto')
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL is required')
  process.exit(1)
}

const email = process.env.SUPER_ADMIN_EMAIL
const password = process.env.SUPER_ADMIN_PASSWORD
const name = process.env.SUPER_ADMIN_NAME || 'Super Admin'

if (!email || !password) {
  console.error('❌ Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env')
  process.exit(1)
}

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  const pool = new Pool({ connectionString })
  const hashed = hashPassword(password)
  try {
    const { rows } = await pool.query(
      `INSERT INTO staff_users (email, name, password, is_active, created_at, updated_at)
       VALUES (lower($1), $2, $3, TRUE, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password = EXCLUDED.password,
         is_active = TRUE,
         updated_at = NOW()
       RETURNING id, email, name`,
      [email, name, hashed]
    )
    const row = rows[0]
    console.log('✅ Super admin staff account synced from .env')
    console.log(`   id: ${row.id}`)
    console.log(`   email: ${row.email}`)
    console.log(`   name: ${row.name}`)
    console.log('\n→ Privileges are granted when this email matches SUPER_ADMIN_EMAIL on login.')
    console.log('→ Log out of the admin panel and sign in again after changing .env.')
  } catch (err) {
    console.error('❌ Failed:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
