import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'nefol',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
})

async function seedData() {
  console.log('🌱 Seeding Phase 1-4 data...')

  // Seed variants for a product
  console.log('Creating variants...')
  const { rows: products } = await pool.query('select id from products limit 1')
  if (products.length > 0) {
    const productId = products[0].id
    await pool.query(
      `insert into variant_options (product_id, name, values) values ($1, 'Size', ARRAY['S', 'M', 'L']) on conflict do nothing`,
      [productId]
    )
    await pool.query(
      `insert into variant_options (product_id, name, values) values ($1, 'Color', ARRAY['Red', 'Blue', 'Green']) on conflict do nothing`,
      [productId]
    )
    console.log('✅ Variant options created')
  }

  // Seed warehouses
  console.log('Creating warehouses...')
  const { rows: warehouses } = await pool.query(
    `insert into warehouses (name, address, is_active) values 
     ('Main Warehouse', '{"city": "Delhi", "state": "Delhi"}', true),
     ('Secondary Warehouse', '{"city": "Mumbai", "state": "Maharashtra"}', true)
     on conflict (name) do nothing
     returning id, name`
  )
  console.log('✅ Warehouses created')

  // Seed suppliers
  console.log('Creating suppliers...')
  await pool.query(
    `insert into suppliers (name, email, phone, is_active) values 
     ('Supplier A', 'suppliera@example.com', '1234567890', true),
     ('Supplier B', 'supplierb@example.com', '0987654321', true)
     on conflict do nothing`
  )
  console.log('✅ Suppliers created')

  // Seed roles and permissions
  console.log('Creating roles...')
  await pool.query(
    `insert into roles (name, description) values 
     ('Admin', 'Full system access'),
     ('Manager', 'Limited admin access'),
     ('Staff', 'Order processing and inventory'),
     ('Viewer', 'Read-only access')
     on conflict (name) do nothing`
  )
  console.log('✅ Roles created')

  // Seed Shiprocket config stub
  console.log('Creating Shiprocket config...')
  await pool.query(
    `insert into shiprocket_config (api_key, api_secret, is_active) 
     values ('demo_key', 'demo_secret', true)
     on conflict do nothing`
  )
  console.log('✅ Shiprocket config created')

  // Seed marketplace accounts
  console.log('Creating marketplace accounts...')
  await pool.query(
    `insert into marketplace_accounts (channel, name, credentials, is_active) values 
     ('amazon', 'Main Amazon Account', '{"api_key": "demo", "api_secret": "demo"}', true),
     ('flipkart', 'Main Flipkart Account', '{"api_key": "demo", "api_secret": "demo"}', true)
     on conflict (channel, name) do nothing`
  )
  console.log('✅ Marketplace accounts created')

  console.log('✅ Seed data complete!')
  await pool.end()
}

seedData().catch(console.error)

