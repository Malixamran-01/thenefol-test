// Check the actual structure of the orders table
require('dotenv').config()
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol'
const pool = new Pool({ connectionString })

async function checkOrdersSchema() {
  try {
    console.log('🔍 Checking orders table structure...\n')
    
    // Get all columns in orders table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'orders'
      ORDER BY ordinal_position
    `)
    
    console.log('📋 Orders table columns:')
    console.log('─'.repeat(60))
    columnsResult.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable}`)
    })
    console.log('─'.repeat(60))
    console.log()
    
    // Get a sample order
    const sampleOrder = await pool.query(`
      SELECT * FROM orders LIMIT 1
    `)
    
    if (sampleOrder.rows.length > 0) {
      console.log('📦 Sample order data:')
      console.log(JSON.stringify(sampleOrder.rows[0], null, 2))
      console.log()
    }
    
    // Check for the specific order
    const specificOrder = await pool.query(`
      SELECT * FROM orders WHERE order_number = $1
    `, ['NEFOL-1761643493899'])
    
    if (specificOrder.rows.length > 0) {
      console.log('🎯 Found the specific order NEFOL-1761643493899:')
      console.log(JSON.stringify(specificOrder.rows[0], null, 2))
      console.log()
      
      // Check all columns to find user reference
      const order = specificOrder.rows[0]
      console.log('🔍 Looking for user ID 16 in order columns:')
      Object.keys(order).forEach(key => {
        if (order[key] == 16 || order[key] === '16') {
          console.log(`  ✅ Found in column: ${key} = ${order[key]}`)
        }
      })
    } else {
      console.log('❌ Order NEFOL-1761643493899 not found')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkOrdersSchema()

