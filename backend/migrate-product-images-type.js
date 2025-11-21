// Migration script to add 'type' column to product_images table
require('dotenv/config');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol';
const pool = new Pool({ connectionString });

async function migrate() {
  console.log('🔄 Migrating product_images table to add type column...');
  
  try {
    // Add type column if it doesn't exist
    await pool.query(`
      ALTER TABLE product_images 
      ADD COLUMN IF NOT EXISTS type text DEFAULT 'pdp';
    `);
    console.log('✅ Added type column to product_images table');
    
    // Add check constraint
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'product_images_type_check'
        ) THEN
          ALTER TABLE product_images 
          ADD CONSTRAINT product_images_type_check 
          CHECK (type IN ('pdp', 'banner'));
        END IF;
      END $$;
    `);
    console.log('✅ Added check constraint for type column');
    
    // Set default value for existing rows
    await pool.query(`
      UPDATE product_images 
      SET type = 'pdp' 
      WHERE type IS NULL;
    `);
    console.log('✅ Set default type for existing images');
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();


