// Check existing users in database
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Load .env file explicitly - clear any existing env first
delete process.env.DATABASE_URL;

const envPath = path.join(__dirname, '.env');
console.log('📂 Loading .env from:', envPath);

const envResult = dotenv.config({ 
  path: envPath, 
  override: true
});

if (envResult.error) {
  console.warn('⚠️  Warning loading .env:', envResult.error.message);
}

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('   Please set DATABASE_URL in your .env file');
  process.exit(1);
}

// Log connection details (without password)
const connectionInfo = connectionString.replace(/:[^:@]+@/, ':****@');
console.log('📡 Database connection:', connectionInfo);

// Fix database name if pointing to 'postgres' instead of 'nefol'
let tryNefolFirst = false;
if (connectionString.endsWith('/postgres') || (connectionString.includes('/postgres') && !connectionString.includes('/nefol'))) {
  console.log('⚠️  Connection string points to "postgres" database.');
  console.log('   Will try "nefol" first, then fallback to "postgres" if needed...\n');
  tryNefolFirst = true;
  connectionString = connectionString.replace(/\/postgres$/, '/nefol');
}

const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com');
const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined
});

async function checkUsers() {
  let currentPool = pool;
  
  try {
    console.log('🔍 Checking existing users in database...\n');
    
    const result = await currentPool.query(`
      SELECT id, name, email, phone, created_at, is_verified
      FROM users
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ No users found in database\n');
    } else {
      console.log(`✅ Found ${result.rows.length} user(s):\n`);
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Phone: ${user.phone || 'N/A'}`);
        console.log(`   Verified: ${user.is_verified ? 'Yes' : 'No'}`);
        console.log(`   Created: ${user.created_at}`);
        console.log('');
      });
    }
    
    await currentPool.end();
    process.exit(0);
  } catch (error) {
    if (error.message.includes('does not exist') && tryNefolFirst) {
      console.log('⚠️  nefol database doesn\'t exist, trying postgres...\n');
      
      // Close current pool
      await currentPool.end();
      
      // Try connecting to 'postgres' database instead
      const originalConnectionString = process.env.DATABASE_URL;
      const postgresConnectionString = originalConnectionString;
      const postgresIsSupabase = postgresConnectionString.includes('supabase.co') || postgresConnectionString.includes('pooler.supabase.com');
      const postgresPool = new Pool({
        connectionString: postgresConnectionString,
        ssl: postgresIsSupabase ? { rejectUnauthorized: false } : undefined
      });
      
      try {
        const result = await postgresPool.query(`
          SELECT id, name, email, phone, created_at, is_verified
          FROM users
          ORDER BY created_at DESC
          LIMIT 20
        `);
        
        if (result.rows.length === 0) {
          console.log('✅ No users found in postgres database\n');
        } else {
          console.log(`✅ Found ${result.rows.length} user(s) in postgres database:\n`);
          result.rows.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email}`);
            console.log(`   Name: ${user.name || 'N/A'}`);
            console.log(`   Phone: ${user.phone || 'N/A'}`);
            console.log(`   Verified: ${user.is_verified ? 'Yes' : 'No'}`);
            console.log(`   Created: ${user.created_at}`);
            console.log('');
          });
        }
        
        await postgresPool.end();
        process.exit(0);
      } catch (postgresError) {
        console.error('❌ Error:', postgresError.message);
        await postgresPool.end();
        process.exit(1);
      }
    } else {
      console.error('❌ Error:', error.message);
      await currentPool.end();
      process.exit(1);
    }
  }
}

checkUsers();
