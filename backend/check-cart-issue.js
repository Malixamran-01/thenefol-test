// Check cart issue
require('dotenv').config()
const { Pool } = require('pg')

const connectionString = 'postgresql://nofol_users:Jhx82ndc9g@j@localhost:5432/nefol'
const pool = new Pool({ connectionString })

async function checkCart() {
  try {
    console.log('🔍 Checking cart table...\n')
    
    // Check if cart table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'cart'
      )
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Cart table does not exist!')
      console.log('Creating cart table...\n')
      
      await pool.query(`
        CREATE TABLE cart (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, product_id)
        )
      `)
      
      console.log('✅ Cart table created!')
    } else {
      console.log('✅ Cart table exists')
    }
    
    // Check cart table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cart'
      ORDER BY ordinal_position
    `)
    
    console.log('\n📋 Cart table columns:')
    console.log('─'.repeat(60))
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(20)} ${col.data_type.padEnd(20)} ${col.is_nullable}`)
    })
    console.log('─'.repeat(60))
    
    // Check cart data
    const cartCount = await pool.query('SELECT COUNT(*) FROM cart')
    console.log(`\n📊 Total cart items: ${cartCount.rows[0].count}`)
    
    // Show sample cart items
    const sampleCart = await pool.query(`
      SELECT c.*, u.name as user_name, u.email, p.title as product_name
      FROM cart c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN products p ON c.product_id = p.id
      LIMIT 5
    `)
    
    if (sampleCart.rows.length > 0) {
      console.log('\n🛒 Sample cart items:')
      sampleCart.rows.forEach(item => {
        console.log(`  User: ${item.user_name} (${item.email})`)
        console.log(`  Product: ${item.product_name}`)
        console.log(`  Quantity: ${item.quantity}`)
        console.log(`  Created: ${item.created_at}`)
        console.log('  ' + '─'.repeat(58))
      })
    } else {
      console.log('\n📭 No cart items found')
    }
    
    // Check users
    const usersCount = await pool.query('SELECT COUNT(*) FROM users')
    console.log(`\n👥 Total users: ${usersCount.rows[0].count}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await pool.end()
  }
}

checkCart()

