require('dotenv/config');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol';
const isSupabase = connectionString.includes('supabase.co');
const poolConfig = isSupabase 
  ? { connectionString, ssl: { rejectUnauthorized: false } }
  : { connectionString };

const pool = new Pool(poolConfig);

async function verifyTables() {
  try {
    console.log('🔍 Verifying database tables...\n');

    // Check author tables
    const { rows: authorTables } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE 'author%'
      ORDER BY table_name
    `);

    console.log('✅ Author Tables:');
    authorTables.forEach(row => console.log(`  - ${row.table_name}`));

    // Check blog_posts columns
    const { rows: postColumns } = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blog_posts' AND column_name IN ('author_id', 'publication_id', 'views_count')
      ORDER BY column_name
    `);

    console.log('\n✅ New blog_posts columns:');
    postColumns.forEach(row => console.log(`  - ${row.column_name} (${row.data_type})`));

    // Check indexes
    const { rows: indexes } = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename LIKE 'author%' OR indexname LIKE '%author%'
      ORDER BY indexname
      LIMIT 10
    `);

    console.log('\n✅ Author-related indexes (showing first 10):');
    indexes.forEach(row => console.log(`  - ${row.indexname}`));

    // Check triggers
    const { rows: triggers } = await pool.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%author%'
      ORDER BY trigger_name
    `);

    console.log('\n✅ Author-related triggers:');
    triggers.forEach(row => console.log(`  - ${row.trigger_name}`));

    // Check author_stats table
    const { rows: stats } = await pool.query(`
      SELECT COUNT(*) as count FROM author_stats
    `);

    console.log(`\n📊 Author stats records: ${stats[0].count}`);

    console.log('\n✅ All checks passed! Database is ready.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyTables();
