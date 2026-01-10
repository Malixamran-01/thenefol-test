# Migration Guide: DOB and Qualifications Fields

## Overview
The migration for Date of Birth and Qualifications fields is already included in `backend/src/utils/schema.ts` and will run automatically when your backend server starts.

## Migration Fields Added
- **Date of Birth**: `birth_day`, `birth_month`, `birth_year` (all nullable/integer)
- **Qualifications**: `education_level`, `profession`, `skills` (all nullable/text)

## Automatic Migration (Recommended)

The migration runs automatically when you start your backend server because `ensureSchema()` is called on startup (line 4905 in `backend/src/index.ts`).

### Steps:
1. **Deploy your code** to production (or restart your local server)
2. The migration will run automatically on server start
3. Check the server logs for any errors

The migration is **safe for production** because it checks if columns exist before adding them, so it won't fail if run multiple times.

## Manual Migration (If Needed)

If you want to run the migration manually without restarting the server, you can:

### Option 1: Using Node.js directly

Create a file `backend/migrate-dob-qualifications.js`:

```javascript
require('dotenv').config()
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol'

const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com')
const poolConfig = isSupabase 
  ? { 
      connectionString,
      ssl: { rejectUnauthorized: false }
    }
  : { connectionString }

const pool = new Pool(poolConfig)

async function runMigration() {
  console.log('🔄 Running DOB and Qualifications migration...')
  
  try {
    await pool.query(`
      DO $$ 
      BEGIN
        -- Add Date of Birth fields
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'affiliate_applications' AND column_name = 'birth_day'
        ) THEN
          ALTER TABLE affiliate_applications ADD COLUMN birth_day INTEGER;
          RAISE NOTICE 'Added birth_day column';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'affiliate_applications' AND column_name = 'birth_month'
        ) THEN
          ALTER TABLE affiliate_applications ADD COLUMN birth_month INTEGER;
          RAISE NOTICE 'Added birth_month column';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'affiliate_applications' AND column_name = 'birth_year'
        ) THEN
          ALTER TABLE affiliate_applications ADD COLUMN birth_year INTEGER;
          RAISE NOTICE 'Added birth_year column';
        END IF;
        
        -- Add Qualifications fields
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'affiliate_applications' AND column_name = 'education_level'
        ) THEN
          ALTER TABLE affiliate_applications ADD COLUMN education_level TEXT;
          RAISE NOTICE 'Added education_level column';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'affiliate_applications' AND column_name = 'profession'
        ) THEN
          ALTER TABLE affiliate_applications ADD COLUMN profession TEXT;
          RAISE NOTICE 'Added profession column';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'affiliate_applications' AND column_name = 'skills'
        ) THEN
          ALTER TABLE affiliate_applications ADD COLUMN skills TEXT;
          RAISE NOTICE 'Added skills column';
        END IF;
      END $$;
    `)
    
    console.log('✅ Migration completed successfully!')
    
    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'affiliate_applications' 
      AND column_name IN ('birth_day', 'birth_month', 'birth_year', 'education_level', 'profession', 'skills')
      ORDER BY column_name
    `)
    
    console.log('\n📊 Added columns:')
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`)
    })
    
    if (result.rows.length === 6) {
      console.log('\n✅ All 6 columns successfully added!')
    } else {
      console.log(`\n⚠️  Expected 6 columns, found ${result.rows.length}`)
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
```

Then run:
```bash
cd backend
node migrate-dob-qualifications.js
```

### Option 2: Using psql directly

If you have direct database access:

```bash
psql $DATABASE_URL
```

Then run:
```sql
DO $$ 
BEGIN
  -- Add Date of Birth fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'affiliate_applications' AND column_name = 'birth_day'
  ) THEN
    ALTER TABLE affiliate_applications ADD COLUMN birth_day INTEGER;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'affiliate_applications' AND column_name = 'birth_month'
  ) THEN
    ALTER TABLE affiliate_applications ADD COLUMN birth_month INTEGER;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'affiliate_applications' AND column_name = 'birth_year'
  ) THEN
    ALTER TABLE affiliate_applications ADD COLUMN birth_year INTEGER;
  END IF;
  
  -- Add Qualifications fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'affiliate_applications' AND column_name = 'education_level'
  ) THEN
    ALTER TABLE affiliate_applications ADD COLUMN education_level TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'affiliate_applications' AND column_name = 'profession'
  ) THEN
    ALTER TABLE affiliate_applications ADD COLUMN profession TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'affiliate_applications' AND column_name = 'skills'
  ) THEN
    ALTER TABLE affiliate_applications ADD COLUMN skills TEXT;
  END IF;
END $$;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'affiliate_applications' 
AND column_name IN ('birth_day', 'birth_month', 'birth_year', 'education_level', 'profession', 'skills')
ORDER BY column_name;
```

## Verify Migration

To verify the migration was successful, run:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'affiliate_applications' 
AND column_name IN ('birth_day', 'birth_month', 'birth_year', 'education_level', 'profession', 'skills')
ORDER BY column_name;
```

You should see all 6 columns listed.

## Important Notes

1. **Safe for Production**: The migration checks if columns exist before adding them, so it's safe to run multiple times
2. **No Data Loss**: All new columns are nullable, so existing records won't be affected
3. **Backward Compatible**: Existing code will continue to work even if these fields are NULL
4. **Uses DATABASE_URL**: The migration uses `DATABASE_URL` from your environment, so it will run on whichever database is configured (test or production)

## For Production Deployment

When deploying to production:

1. **Set DATABASE_URL** to your production database connection string
2. **Deploy the code** (the migration runs automatically on server start)
3. **Check server logs** to confirm migration completed successfully
4. **Verify** using the SQL query above if needed

The migration will only run on the database specified in your `DATABASE_URL` environment variable, so make sure it's set correctly for production.
