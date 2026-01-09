// Create nefol database in Supabase if it doesn't exist
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const { Pool } = require("pg");

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL not found in environment variables");
  process.exit(1);
}

// Connect to default 'postgres' database first to create 'nefol'
const defaultConnectionString = connectionString.replace(/\/[^/]+$/, "/postgres");

console.log("🔧 Creating 'nefol' database in Supabase...\n");

// Check if this is a Supabase connection (requires SSL)
const isSupabase =
  defaultConnectionString.includes("supabase.co") ||
  defaultConnectionString.includes("pooler.supabase.com");

const poolConfig = isSupabase
  ? {
      connectionString: defaultConnectionString,
      ssl: { rejectUnauthorized: false }, // Supabase requires SSL
    }
  : { connectionString: defaultConnectionString };

const pool = new Pool(poolConfig);

async function createDatabase() {
  try {
    // Check if nefol database already exists
    const checkResult = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      ["nefol"]
    );

    if (checkResult.rows.length > 0) {
      console.log("✅ Database 'nefol' already exists!");
      await pool.end();
      return;
    }

    // Create the database
    // Note: PostgreSQL doesn't allow creating databases in a transaction
    // So we need to use a different approach
    console.log("📦 Creating 'nefol' database...");

    // For Supabase, we might need to use a different method
    // Try to create it directly
    await pool.query('CREATE DATABASE nefol');

    console.log("✅ Database 'nefol' created successfully!\n");
    await pool.end();
  } catch (error) {
    if (error.code === "42P04") {
      // Database already exists
      console.log("✅ Database 'nefol' already exists!\n");
      await pool.end();
      return;
    } else if (error.code === "42501" || error.message.includes("permission")) {
      console.error(
        "❌ Permission denied. You may need to create the database manually in Supabase."
      );
      console.error("\n📝 To create it manually:");
      console.error("   1. Go to Supabase Dashboard");
      console.error("   2. Go to SQL Editor");
      console.error("   3. Run: CREATE DATABASE nefol;");
      console.error("\n   Or use the Supabase web interface to create it.\n");
      await pool.end();
      process.exit(1);
    } else {
      console.error("❌ Error creating database:", error.message);
      console.error("\n💡 The database might already exist, or you need to create it manually.");
      console.error("   Try running the setup script again, or create it in Supabase dashboard.\n");
      await pool.end();
      process.exit(1);
    }
  }
}

createDatabase();
