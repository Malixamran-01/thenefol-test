// Fix database schema issues
require('dotenv/config');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol';
const pool = new Pool({ connectionString });

async function fixSchema() {
  console.log('🔧 Fixing database schema...');
  
  try {
    // Drop and recreate user_actions table with correct schema
    console.log('📝 Fixing user_actions table...');
    await pool.query(`
      DROP TABLE IF EXISTS user_actions CASCADE;
      CREATE TABLE user_actions (
        id serial primary key,
        user_id integer,
        action varchar(100),
        action_data jsonb default '{}'::jsonb,
        page varchar(500),
        session_id varchar(255),
        timestamp timestamptz default now()
      );
      CREATE INDEX idx_user_actions_user_id ON user_actions(user_id);
      CREATE INDEX idx_user_actions_action ON user_actions(action);
      CREATE INDEX idx_user_actions_timestamp ON user_actions(timestamp);
      CREATE INDEX idx_user_actions_session_id ON user_actions(session_id);
    `);
    console.log('✅ user_actions table fixed');
    
    // Create products table if it doesn't exist
    console.log('📝 Creating products table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id serial primary key,
        title text not null,
        slug text,
        category text default '',
        price text default '',
        list_image text default '',
        description text default '',
        details jsonb default '{}'::jsonb,
        brand text default '',
        key_ingredients text default '',
        skin_type text default '',
        hair_type text default '',
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
    `);
    
    // Ensure products has slug column
    console.log('📝 Checking products table...');
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS slug text,
      ADD COLUMN IF NOT EXISTS brand text default '',
      ADD COLUMN IF NOT EXISTS key_ingredients text default '',
      ADD COLUMN IF NOT EXISTS skin_type text default '',
      ADD COLUMN IF NOT EXISTS hair_type text default '';
    `);
    
    // Generate slugs for products that don't have them
    console.log('📝 Generating slugs for existing products...');
    const { rows: productsWithoutSlugs } = await pool.query(`
      SELECT id, title FROM products WHERE slug IS NULL OR slug = '';
    `);
    
    for (const product of productsWithoutSlugs) {
      // Generate slug from title
      const slug = product.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim();
      
      // Ensure slug is unique
      let finalSlug = slug;
      let counter = 1;
      while (true) {
        const { rows: existing } = await pool.query(
          'SELECT id FROM products WHERE slug = $1 AND id != $2',
          [finalSlug, product.id]
        );
        if (existing.length === 0) break;
        finalSlug = `${slug}-${counter}`;
        counter++;
      }
      
      await pool.query(
        'UPDATE products SET slug = $1 WHERE id = $2',
        [finalSlug, product.id]
      );
      console.log(`  Generated slug "${finalSlug}" for product "${product.title}"`);
    }
    
    // Drop existing constraint if any
    await pool.query(`
      ALTER TABLE products DROP CONSTRAINT IF EXISTS products_slug_key;
    `);
    
    // Add unique constraint on slug
    await pool.query(`
      ALTER TABLE products ADD CONSTRAINT products_slug_key UNIQUE (slug);
    `);
    console.log('✅ products table fixed and slugs generated');
    
    // Ensure cart_events has price column
    console.log('📝 Checking cart_events table...');
    await pool.query(`
      ALTER TABLE cart_events 
      ADD COLUMN IF NOT EXISTS price text;
    `);
    console.log('✅ cart_events table fixed');
    
    console.log('🎉 Schema fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing schema:', error.message);
    process.exit(1);
  }
}

fixSchema();

