// Migration script for discount features update
// Adds: usage_limit_per_user, product_id, is_one_time_use columns
// Updates: discount type constraint to include 'fixed_price'

require('dotenv/config');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol';

// Check if this is a Supabase connection (requires SSL)
const isSupabase = connectionString.includes('supabase.co');
const poolConfig = isSupabase 
  ? { 
      connectionString,
      ssl: { rejectUnauthorized: false } // Supabase requires SSL
    }
  : { connectionString };

const pool = new Pool(poolConfig);

async function runMigration() {
  console.log('🔄 Running discount features migration...');
  
  try {
    await pool.query(`
      DO $$ 
      BEGIN
        -- Add usage_limit_per_user column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'discounts' AND column_name = 'usage_limit_per_user'
        ) THEN
          ALTER TABLE discounts ADD COLUMN usage_limit_per_user integer;
          RAISE NOTICE 'Added usage_limit_per_user column';
        ELSE
          RAISE NOTICE 'usage_limit_per_user column already exists';
        END IF;
        
        -- Add product_id column for product-specific discounts
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'discounts' AND column_name = 'product_id'
        ) THEN
          ALTER TABLE discounts ADD COLUMN product_id integer references products(id) on delete set null;
          CREATE INDEX IF NOT EXISTS idx_discounts_product_id ON discounts(product_id);
          RAISE NOTICE 'Added product_id column';
        ELSE
          RAISE NOTICE 'product_id column already exists';
        END IF;
        
        -- Add is_one_time_use column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'discounts' AND column_name = 'is_one_time_use'
        ) THEN
          ALTER TABLE discounts ADD COLUMN is_one_time_use boolean default false;
          RAISE NOTICE 'Added is_one_time_use column';
        ELSE
          RAISE NOTICE 'is_one_time_use column already exists';
        END IF;
        
        -- Update type check constraint to include 'fixed_price'
        -- First drop the old constraint if it exists
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'discounts_type_check' 
          AND conrelid = 'discounts'::regclass
        ) THEN
          ALTER TABLE discounts DROP CONSTRAINT discounts_type_check;
          RAISE NOTICE 'Dropped old type constraint';
        END IF;
        
        -- Add new constraint with fixed_price
        ALTER TABLE discounts ADD CONSTRAINT discounts_type_check 
          CHECK (type IN ('percentage', 'fixed', 'free_shipping', 'fixed_price'));
        RAISE NOTICE 'Added updated type constraint with fixed_price';
      END $$;
    `);
    
    console.log('✅ Discount features migration completed successfully!');
    console.log('   - Added usage_limit_per_user column');
    console.log('   - Added product_id column');
    console.log('   - Added is_one_time_use column');
    console.log('   - Updated type constraint to include fixed_price');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
