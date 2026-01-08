/**
 * Troubleshoot Supabase connection issues
 */

require("dotenv").config();
const { Pool } = require("pg");
const dns = require("dns").promises;

// Use pooler host from .env
const SUPABASE_HOST = process.env.DB_HOST;
const SUPABASE_PORT = process.env.DB_PORT || 5432;
const SUPABASE_USER = process.env.DB_USER;
const SUPABASE_PASSWORD = process.env.DB_PASSWORD;
const SUPABASE_DB = process.env.DB_NAME;

async function troubleshoot() {
  console.log("🔍 Troubleshooting Supabase Connection\n");

  // Test 1: DNS Resolution
  console.log("1️⃣ Testing DNS resolution...");
  try {
    const addresses = await dns.resolve4(SUPABASE_HOST);
    console.log(`   ✅ DNS resolved: ${addresses.join(", ")}`);
  } catch (err) {
    console.log(`   ❌ DNS resolution failed: ${err.message}`);
    console.log("   💡 Check:");
    console.log("      - DB_HOST must be the pooler host from Supabase");
    console.log("      - You selected 'Session pooling' in Supabase");
    return;
  }

  // Test 2: Connection with SSL
  console.log("\n2️⃣ Testing database connection...");
  const pool = new Pool({
    host: SUPABASE_HOST,
    port: SUPABASE_PORT,
    user: SUPABASE_USER,
    password: SUPABASE_PASSWORD,
    database: SUPABASE_DB,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const result = await pool.query("SELECT version(), current_database()");
    console.log("   ✅ Connection successful!");
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   Version: ${result.rows[0].version.split(",")[0]}\n`);

    await pool.end();

    console.log("\n📝 Connection string:");
    console.log(
      `postgresql://${SUPABASE_USER}:${SUPABASE_PASSWORD}@${SUPABASE_HOST}:${SUPABASE_PORT}/${SUPABASE_DB}`
    );
  } catch (err) {
    console.log(`   ❌ Connection failed: ${err.message}`);
    await pool.end();
  }
}

troubleshoot().catch(console.error);
