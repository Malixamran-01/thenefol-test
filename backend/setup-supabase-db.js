// Setup Supabase Database - Verify schema and create admin user
const path = require("path");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const crypto = require("crypto");

// Load .env file explicitly - clear any existing env first
delete process.env.DATABASE_URL;

const envPath = path.join(__dirname, ".env");
console.log("📂 Loading .env from:", envPath);

// Read .env file directly to verify contents BEFORE loading
const fs = require("fs");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const dbUrlMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
  if (dbUrlMatch) {
    const fileDbUrl = dbUrlMatch[1].trim();
    console.log(
      "   Found in .env file:",
      fileDbUrl.substring(0, 60).replace(/:[^:@]+@/, ":****@") + "..."
    );

    // Check if it's the old URL
    if (fileDbUrl.includes("db.hlfycrtaeaexydwaevrb.supabase.co")) {
      console.error("\n❌ ERROR: .env file contains OLD database URL!");
      console.error(
        "   Please update .env file with the new Supabase connection string."
      );
      console.error("   Expected: aws-1-ap-south-1.pooler.supabase.com");
      console.error("   Found: db.hlfycrtaeaexydwaevrb.supabase.co");
      process.exit(1);
    }
  } else {
    console.warn("   ⚠️  DATABASE_URL not found in .env file content");
  }
} else {
  console.error("❌ .env file not found at:", envPath);
  process.exit(1);
}

// Load ONLY the .env file (not .env.test or others)
// Use override: true to ensure we replace any existing values
const envResult = dotenv.config({
  path: envPath,
  override: true,
});

if (envResult.error) {
  console.warn("⚠️  Warning loading .env:", envResult.error.message);
} else {
  console.log("✅ .env file loaded successfully");
}

// Get DATABASE_URL from environment
// Check both loaded env and system env
let connectionString = process.env.DATABASE_URL;

// Debug: Show what we loaded
console.log("🔍 Environment check:");
console.log("   .env file exists:", require("fs").existsSync(envPath));
console.log("   DATABASE_URL loaded:", connectionString ? "✅ Yes" : "❌ No");

if (connectionString) {
  // Show first 50 chars to verify it's the right one
  const preview = connectionString
    .substring(0, 50)
    .replace(/:[^:@]+@/, ":****@");
  console.log("   Connection preview:", preview + "...");

  // Check if it's the old URL
  if (connectionString.includes("db.hlfycrtaeaexydwaevrb.supabase.co")) {
    console.error("\n⚠️  WARNING: Detected OLD database URL!");
    console.error("   The .env file might not be loading correctly.");
    console.error("   Or there's a system environment variable overriding it.");
    console.error("\n   Try:");
    console.error(
      "   1. Check if DATABASE_URL is set in system environment variables"
    );
    console.error("   2. Restart your terminal/PowerShell");
    console.error(
      "   3. Or run: $env:DATABASE_URL=$null (to clear system env)"
    );
  }
}

if (!connectionString) {
  console.error("\n❌ DATABASE_URL not found in environment variables");
  console.error("   Please set DATABASE_URL in your .env file");
  console.error("   Expected location:", envPath);
  console.error(
    "\n   Current process.env keys:",
    Object.keys(process.env)
      .filter((k) => k.includes("DATABASE"))
      .join(", ") || "none"
  );
  process.exit(1);
}

// Log connection details (without password)
const connectionInfo = connectionString.replace(/:[^:@]+@/, ":****@");
console.log("\n📡 Database connection:", connectionInfo);

// Check which database to use
// If connection string points to 'postgres', we'll try 'nefol' first, then fallback to 'postgres'
let originalConnectionString = connectionString;
let tryNefolFirst = false;

if (
  connectionString.endsWith("/postgres") ||
  (connectionString.includes("/postgres") &&
    !connectionString.includes("/nefol"))
) {
  console.log('⚠️  Connection string points to "postgres" database.');
  console.log(
    '   Will try "nefol" first, then fallback to "postgres" if needed...\n'
  );
  tryNefolFirst = true;
  // Try nefol first
  connectionString = connectionString.replace(/\/postgres$/, "/nefol");
}

// Check if this is a Supabase connection (requires SSL)
const isSupabase =
  connectionString.includes("supabase.co") ||
  connectionString.includes("pooler.supabase.com");
const poolConfig = isSupabase
  ? {
      connectionString,
      ssl: { rejectUnauthorized: false }, // Supabase requires SSL
    }
  : { connectionString };

let pool = new Pool(poolConfig);

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function checkDatabaseConnection() {
  try {
    const result = await pool.query(
      "SELECT NOW() as current_time, version() as pg_version, current_database() as db_name"
    );
    console.log("✅ Database connection successful!");
    console.log(`   Database: ${result.rows[0].db_name}`);
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(",")[0]}\n`);
    return true;
  } catch (error) {
    if (error.message.includes("does not exist") && tryNefolFirst) {
      console.log(
        "⚠️  'nefol' database doesn't exist, trying 'postgres' database...\n"
      );
      // Close current pool
      await pool.end();

      // Try connecting to 'postgres' database instead
      const postgresConnectionString = originalConnectionString;
      const isSupabase =
        postgresConnectionString.includes("supabase.co") ||
        postgresConnectionString.includes("pooler.supabase.com");
      const postgresPoolConfig = isSupabase
        ? {
            connectionString: postgresConnectionString,
            ssl: { rejectUnauthorized: false },
          }
        : { connectionString: postgresConnectionString };

      const postgresPool = new Pool(postgresPoolConfig);

      try {
        const result = await postgresPool.query(
          "SELECT NOW() as current_time, version() as pg_version, current_database() as db_name"
        );
        console.log("✅ Connected to 'postgres' database!");
        console.log(`   Database: ${result.rows[0].db_name}`);
        console.log(`   Time: ${result.rows[0].current_time}`);
        console.log(
          `   PostgreSQL: ${result.rows[0].pg_version.split(",")[0]}\n`
        );

        // Replace the pool with the postgres one
        pool = postgresPool;
        return true;
      } catch (postgresError) {
        console.error(
          "❌ Failed to connect to 'postgres' database too:",
          postgresError.message
        );
        await postgresPool.end();
        return false;
      }
    } else {
      console.error("❌ Database connection failed:", error.message);
      return false;
    }
  }
}

async function checkTablesExist() {
  const requiredTables = [
    "products",
    "users",
    "orders",
    "staff_users",
    "roles",
    "permissions",
    "staff_sessions",
    "cart",
    "wishlist",
  ];

  console.log("🔍 Checking if tables exist...\n");

  const existingTables = [];
  const missingTables = [];

  for (const table of requiredTables) {
    try {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );

      if (result.rows[0].exists) {
        existingTables.push(table);
        // Count rows
        const countResult = await pool.query(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        const count = parseInt(countResult.rows[0].count);
        console.log(`  ✅ ${table}: exists (${count} rows)`);
      } else {
        missingTables.push(table);
        console.log(`  ❌ ${table}: MISSING`);
      }
    } catch (error) {
      console.error(`  ❌ Error checking ${table}:`, error.message);
      missingTables.push(table);
    }
  }

  console.log(
    `\n📊 Summary: ${existingTables.length}/${requiredTables.length} tables exist`
  );

  if (missingTables.length > 0) {
    console.log(`\n⚠️  Missing tables: ${missingTables.join(", ")}`);
    console.log(
      "   The schema should be created automatically when the backend starts."
    );
    console.log(
      "   Make sure your backend is running and has run ensureSchema()\n"
    );
    return false;
  }

  return true;
}

async function checkAdminStaffUser() {
  console.log("\n🔍 Checking for admin staff user...\n");

  try {
    const result = await pool.query(
      "SELECT id, name, email, is_active FROM staff_users"
    );

    if (result.rows.length === 0) {
      console.log("  ❌ No admin staff users found");
      return null;
    }

    console.log(`  ✅ Found ${result.rows.length} staff user(s):`);
    result.rows.forEach((user) => {
      console.log(
        `     - ${user.email} (${user.name}) - ${
          user.is_active ? "Active" : "Inactive"
        }`
      );
    });

    return result.rows[0];
  } catch (error) {
    console.error("  ❌ Error checking staff_users:", error.message);
    return null;
  }
}

async function createAdminStaffUser() {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@thenefol.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
  const ADMIN_NAME = process.env.ADMIN_NAME || "Admin User";

  console.log("\n👤 Creating admin staff user...\n");
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Name: ${ADMIN_NAME}`);
  console.log(`   Password: ${ADMIN_PASSWORD}\n`);

  try {
    // Check if user already exists
    const existing = await pool.query(
      "SELECT id FROM staff_users WHERE email = $1",
      [ADMIN_EMAIL]
    );

    if (existing.rows.length > 0) {
      console.log("  ✅ Admin user already exists, updating password...");
      const hashedPassword = hashPassword(ADMIN_PASSWORD);
      await pool.query(
        "UPDATE staff_users SET password = $1, name = $2, is_active = true, updated_at = NOW() WHERE email = $3",
        [hashedPassword, ADMIN_NAME, ADMIN_EMAIL]
      );
      console.log("  ✅ Admin password updated!\n");
    } else {
      console.log("  ✅ Creating new admin user...");
      const hashedPassword = hashPassword(ADMIN_PASSWORD);
      const result = await pool.query(
        `INSERT INTO staff_users (name, email, password, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, true, NOW(), NOW())
         RETURNING id, name, email`,
        [ADMIN_NAME, ADMIN_EMAIL, hashedPassword]
      );
      console.log(`  ✅ Admin user created! ID: ${result.rows[0].id}\n`);
    }

    // Check if admin role exists and assign it
    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE name = 'admin'"
    );

    if (roleResult.rows.length > 0) {
      const roleId = roleResult.rows[0].id;
      const userResult = await pool.query(
        "SELECT id FROM staff_users WHERE email = $1",
        [ADMIN_EMAIL]
      );
      const userId = userResult.rows[0].id;

      // Check if role is already assigned
      const assigned = await pool.query(
        "SELECT * FROM staff_roles WHERE staff_id = $1 AND role_id = $2",
        [userId, roleId]
      );

      if (assigned.rows.length === 0) {
        await pool.query(
          "INSERT INTO staff_roles (staff_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [userId, roleId]
        );
        console.log("  ✅ Admin role assigned!\n");
      } else {
        console.log("  ✅ Admin role already assigned\n");
      }
    } else {
      console.log("  ⚠️  Admin role not found. Creating standard roles...\n");
      // Create admin role if it doesn't exist
      try {
        const adminRoleResult = await pool.query(
          `INSERT INTO roles (name, description, created_at, updated_at)
           VALUES ('admin', 'Administrator with full access', NOW(), NOW())
           ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
           RETURNING id`
        );
        const roleId = adminRoleResult.rows[0].id;
        const userResult = await pool.query(
          "SELECT id FROM staff_users WHERE email = $1",
          [ADMIN_EMAIL]
        );
        const userId = userResult.rows[0].id;

        await pool.query(
          "INSERT INTO staff_roles (staff_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [userId, roleId]
        );
        console.log("  ✅ Admin role created and assigned!\n");
      } catch (err) {
        console.error("  ❌ Error creating admin role:", err.message);
      }
    }

    return {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
    };
  } catch (error) {
    console.error("  ❌ Error creating admin user:", error.message);
    throw error;
  }
}

async function checkProducts() {
  console.log("🔍 Checking products...\n");

  try {
    const result = await pool.query("SELECT COUNT(*) as count FROM products");
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      console.log("  ⚠️  No products found in database");
      console.log("   You can import products via the admin panel or API\n");
    } else {
      console.log(`  ✅ Found ${count} product(s) in database\n`);
    }

    return count;
  } catch (error) {
    console.error("  ❌ Error checking products:", error.message);
    return 0;
  }
}

async function main() {
  console.log("🚀 Supabase Database Setup Script\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Step 1: Check database connection
  const connected = await checkDatabaseConnection();
  if (!connected) {
    await pool.end();
    process.exit(1);
  }

  // Step 2: Check if tables exist
  const tablesExist = await checkTablesExist();
  if (!tablesExist) {
    console.log("\n⚠️  Some tables are missing.");
    console.log(
      "   Please make sure your backend server has started and run ensureSchema()"
    );
    console.log("   Or run: npm run migrate\n");
  }

  // Step 3: Check products
  await checkProducts();

  // Step 4: Check/create admin user
  const adminUser = await checkAdminStaffUser();

  if (!adminUser) {
    console.log("\n📝 Creating admin staff user...\n");
    try {
      const credentials = await createAdminStaffUser();

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ SETUP COMPLETE!\n");
      console.log("📋 Admin Panel Login Credentials:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   Email:    ${credentials.email}`);
      console.log(`   Password: ${credentials.password}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      console.log("💡 You can change these by setting environment variables:");
      console.log("   ADMIN_EMAIL=your@email.com");
      console.log("   ADMIN_PASSWORD=yourpassword\n");
    } catch (error) {
      console.error("\n❌ Failed to create admin user:", error.message);
      await pool.end();
      process.exit(1);
    }
  } else {
    console.log("\n✅ Admin user already exists!");
    console.log("   If you need to reset the password, run:");
    console.log(
      "   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword node setup-supabase-db.js\n"
    );
  }

  await pool.end();
  process.exit(0);
}

main().catch((error) => {
  console.error("\n❌ Unexpected error:", error);
  process.exit(1);
});
