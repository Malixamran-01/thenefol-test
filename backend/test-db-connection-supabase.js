/**
 * Test Supabase database connection
 */

const { Pool } = require("pg");
require("dotenv").config();

// Your Supabase connection string
// Format: postgresql://postgres:[YOUR-PASSWORD]@db.hlfycrtaeaexydwaevrb.supabase.co:5432/postgres
// Parameters from Supabase Dashboard:
//   host: db.hlfycrtaeaexydwaevrb.supabase.co
//   port: 5432
//   database: postgres
//   user: postgres
const SUPABASE_CONNECTION_STRING =
  "postgresql://postgres:UvI09HmgBBon89zk@db.hlfycrtaeaexydwaevrb.supabase.co:5432/postgres";

async function testConnection() {
  console.log("🔍 Testing Supabase Database Connection...\n");

  // Use password from environment or the one in connection string
  let connectionString = SUPABASE_CONNECTION_STRING;
  if (process.env.SUPABASE_PASSWORD) {
    connectionString = SUPABASE_CONNECTION_STRING.replace(
      "[YOUR-PASSWORD]",
      process.env.SUPABASE_PASSWORD
    );
  }

  if (connectionString.includes("[YOUR-PASSWORD]")) {
    console.log(
      "⚠️  Please set SUPABASE_PASSWORD in .env or replace [YOUR-PASSWORD] in the connection string"
    );
    console.log("\nTo set password:");
    console.log("1. Add to .env: SUPABASE_PASSWORD=your_actual_password");
    console.log("2. Or replace [YOUR-PASSWORD] in this file");
    return;
  }

  console.log(
    "📝 Using connection string:",
    connectionString.replace(/:[^:@]+@/, ":****@")
  );

  const pool = new Pool({ connectionString });

  try {
    // Test basic connection
    const result = await pool.query(
      "SELECT version(), current_database(), current_user"
    );
    console.log("✅ Connection successful!");
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    console.log(`   Version: ${result.rows[0].version.split(",")[0]}\n`);

    // Check if nefol database exists
    const dbCheck = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'nefol'"
    );

    if (dbCheck.rows.length === 0) {
      console.log('📦 Database "nefol" does not exist. Creating...');
      await pool.query("CREATE DATABASE nefol");
      console.log('✅ Database "nefol" created!\n');
    } else {
      console.log('✅ Database "nefol" already exists\n');
    }

    // Test connection to nefol database
    const nefolConnectionString = connectionString.replace(
      "/postgres",
      "/nefol"
    );
    const nefolPool = new Pool({ connectionString: nefolConnectionString });

    const nefolResult = await nefolPool.query("SELECT current_database()");
    console.log(
      `✅ Connected to nefol database: ${nefolResult.rows[0].current_database}\n`
    );

    console.log("✅ All checks passed!");
    console.log("\n📝 Use this connection string for test environment:");
    console.log(
      nefolConnectionString.replace(
        process.env.SUPABASE_PASSWORD || "",
        "[PASSWORD]"
      )
    );

    await nefolPool.end();
    await pool.end();

    return nefolConnectionString;
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    if (err.message.includes("password authentication failed")) {
      console.log("\n💡 Tip: Check your Supabase password");
      console.log(
        "   Get it from: Supabase Dashboard > Project Settings > Database > Connection string"
      );
    }
    await pool.end();
    return null;
  }
}

testConnection()
  .then((connString) => {
    if (connString) {
      console.log("\n✅ Ready to use for test environment!");
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
