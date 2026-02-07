/**
 * Migration script to add ancestors column to blog_comments table
 * This implements Path Enumeration for efficient threaded comment queries
 */

const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') || process.env.POSTGRES_URL?.includes('supabase') 
    ? { rejectUnauthorized: false } 
    : false
})

async function migrate() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔄 Adding ancestors column to blog_comments...')
    
    // Add ancestors column if it doesn't exist
    await client.query(`
      ALTER TABLE blog_comments 
      ADD COLUMN IF NOT EXISTS ancestors integer[]
    `)
    
    console.log('✅ Added ancestors column')
    
    // Add GIN index for efficient array queries
    console.log('🔄 Creating GIN index on ancestors column...')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_comments_ancestors 
      ON blog_comments USING gin(ancestors)
    `)
    
    console.log('✅ Created GIN index')
    
    // Backfill ancestors for existing comments
    console.log('🔄 Backfilling ancestors for existing comments...')
    
    // First, set ancestors to NULL for root comments (parent_id IS NULL)
    await client.query(`
      UPDATE blog_comments 
      SET ancestors = NULL 
      WHERE parent_id IS NULL AND ancestors IS NULL
    `)
    
    // Then, recursively build ancestors for child comments
    // We'll do this in multiple passes to handle nested comments
    let updated = true
    let iterations = 0
    const maxIterations = 100 // Safety limit
    
    while (updated && iterations < maxIterations) {
      const result = await client.query(`
        WITH RECURSIVE comment_tree AS (
          -- Root comments
          SELECT id, parent_id, ARRAY[]::integer[] as ancestors
          FROM blog_comments
          WHERE parent_id IS NULL
          
          UNION ALL
          
          -- Child comments
          SELECT c.id, c.parent_id, 
                 CASE 
                   WHEN c.parent_id IS NULL THEN ARRAY[]::integer[]
                   ELSE array_append(ct.ancestors, c.parent_id)
                 END as ancestors
          FROM blog_comments c
          INNER JOIN comment_tree ct ON c.parent_id = ct.id
          WHERE c.ancestors IS NULL
        )
        UPDATE blog_comments bc
        SET ancestors = ct.ancestors
        FROM comment_tree ct
        WHERE bc.id = ct.id 
          AND bc.ancestors IS NULL
        RETURNING bc.id
      `)
      
      updated = result.rowCount > 0
      iterations++
      
      if (updated) {
        console.log(`  Updated ${result.rowCount} comments in iteration ${iterations}`)
      }
    }
    
    if (iterations >= maxIterations) {
      console.warn('⚠️  Reached max iterations. Some comments may not have ancestors set.')
    } else {
      console.log('✅ Backfilled ancestors for all existing comments')
    }
    
    await client.query('COMMIT')
    console.log('✅ Migration completed successfully!')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
  .then(() => {
    console.log('Migration script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })
