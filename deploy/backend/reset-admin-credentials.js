// Reset Admin Credentials Script

require('dotenv/config')

const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL || 'postgresql://nofol_users:Anoopnefoldb@localhost:5432/nefol'

const pool = new Pool({ connectionString })

const parseArgs = () => {
  const args = process.argv.slice(2)
  const result = {}
  for (let i = 0; i < args.length; i += 1) {
    const current = args[i]
    if (!current.startsWith('--')) continue
    const key = current.replace(/^--/, '').toLowerCase()
    const next = args[i + 1]
    if (!next || next.startsWith('--')) {
      result[key] = 'true'
    } else {
      result[key] = next
      i += 1
    }
  }
  return result
}

const argMap = parseArgs()

const ADMIN_EMAIL = argMap.email || process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = argMap.password || process.env.ADMIN_PASSWORD
const ADMIN_NAME = argMap.name || process.env.ADMIN_NAME || 'Admin User'

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Missing required credentials.')
  console.error('   Provide values via environment variables or CLI flags:')
  console.error('   ADMIN_EMAIL / --email <value>')
  console.error('   ADMIN_PASSWORD / --password <value>')
  process.exit(1)
}

if (!process.env.ADMIN_PASSWORD && !argMap.password) {
  console.warn('⚠️  Using ADMIN_PASSWORD from environment. Consider passing --password for ad-hoc resets.')
}

async function resetAdminCredentials() {
  console.log('🔄 Resetting admin credentials...');
  console.log(`📧 Email: ${ADMIN_EMAIL}`);
  console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
  console.log(`👤 Name: ${ADMIN_NAME}`);
  
  try {
    // Check if admin user exists
    const { rows: existingUsers } = await pool.query(
      'SELECT id, email, name, password FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (existingUsers.length > 0) {
      // Update existing admin user
      console.log('✅ Admin user found, updating password...');
      console.log(`   Existing User ID: ${existingUsers[0].id}`);
      const result = await pool.query(
        'UPDATE users SET password = $1, name = $2, updated_at = NOW() WHERE email = $3 RETURNING id, email, name',
        [ADMIN_PASSWORD, ADMIN_NAME, ADMIN_EMAIL]
      );
      console.log(`✅ Admin credentials updated successfully!`);
      console.log(`   User ID: ${result.rows[0].id}`);
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

    // Verify the user was created/updated correctly
    const { rows: verifyUsers } = await pool.query(
      'SELECT id, email, name, password FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (verifyUsers.length === 0) {
      throw new Error('User was not created/updated successfully!');
    }

    const user = verifyUsers[0];
    console.log('\n✅ Verification:');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Password stored: ${user.password === ADMIN_PASSWORD ? '✅ Match' : '❌ Mismatch'}`);

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
    console.error('   Error details:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    await pool.end();
    process.exit(1);
  }
}

resetAdminCredentials();

