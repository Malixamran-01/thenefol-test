// Reset Admin Credentials Script
require('dotenv/config');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol';
const pool = new Pool({ connectionString });

// Default admin credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@nefol.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';

async function resetAdminCredentials() {
  console.log('🔄 Resetting admin credentials...');
  console.log(`📧 Email: ${ADMIN_EMAIL}`);
  console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
  console.log(`👤 Name: ${ADMIN_NAME}`);
  
  try {
    // Check if admin user exists
    const { rows: existingUsers } = await pool.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (existingUsers.length > 0) {
      // Update existing admin user
      console.log('✅ Admin user found, updating password...');
      await pool.query(
        'UPDATE users SET password = $1, name = $2, updated_at = NOW() WHERE email = $3',
        [ADMIN_PASSWORD, ADMIN_NAME, ADMIN_EMAIL]
      );
      console.log(`✅ Admin credentials updated successfully!`);
      console.log(`   User ID: ${existingUsers[0].id}`);
    } else {
      // Create new admin user
      console.log('✅ Creating new admin user...');
      const { rows: newUser } = await pool.query(
        `INSERT INTO users (name, email, password, is_verified, created_at, updated_at)
         VALUES ($1, $2, $3, true, NOW(), NOW())
         RETURNING id, email, name`,
        [ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD]
      );
      console.log(`✅ Admin user created successfully!`);
      console.log(`   User ID: ${newUser[0].id}`);
    }

    // Display final credentials
    console.log('\n📋 Admin Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin credentials:', error);
    await pool.end();
    process.exit(1);
  }
}

resetAdminCredentials();

