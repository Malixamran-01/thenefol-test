// Centralized route configuration with optimized endpoints
import { Router } from 'express'
import { Pool } from 'pg'
import { authenticateToken } from '../utils/apiHelpers'
import * as productRoutes from './products'
import * as cartRoutes from './cart'

export function createRoutes(pool: Pool) {
  const router = Router()
  
  // ==================== PRODUCTS API ====================
  router.get('/api/products', (req, res) => productRoutes.getProducts(pool, res))
  router.get('/api/products/:id', (req, res) => productRoutes.getProductById(pool, req, res))
  router.get('/api/products/slug/:slug', (req, res) => productRoutes.getProductBySlug(pool, req, res))
  router.post('/api/products', (req, res) => productRoutes.createProduct(pool, req, res))
  router.put('/api/products/:id', (req, res) => productRoutes.updateProduct(pool, req, res))
  
  // CSV endpoints
  router.get('/api/products-csv', (req, res) => productRoutes.getProductsCSV(res))
  
  // ==================== CART API ====================
  router.get('/api/cart', authenticateToken, (req, res) => cartRoutes.getCart(pool, req, res))
  router.post('/api/cart', authenticateToken, (req, res) => cartRoutes.addToCart(pool, req, res))
  router.put('/api/cart/:cartItemId', authenticateToken, (req, res) => cartRoutes.updateCartItem(pool, req, res))
  router.delete('/api/cart/:cartItemId', authenticateToken, (req, res) => cartRoutes.removeFromCart(pool, req, res))
  
  // ==================== AUTHENTICATION API ====================
  router.post('/api/auth/login', (req, res) => cartRoutes.login(pool, req, res))
  router.post('/api/auth/register', (req, res) => cartRoutes.register(pool, req, res))
  
  // ==================== USER PROFILE API ====================
  router.get('/api/user/profile', authenticateToken, (req, res) => cartRoutes.getUserProfile(pool, req, res))
  router.put('/api/user/profile', authenticateToken, (req, res) => cartRoutes.updateUserProfile(pool, req, res))
  
  return router
}

// Generic CRUD routes for simple tables
export function createCRUDRoutes(pool: Pool, tableName: string, requiredFields: string[] = []) {
  const router = Router()
  
  // GET all
  router.get(`/api/${tableName}`, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${tableName} ORDER BY created_at DESC`)
      res.json(rows)
    } catch (err) {
      res.status(500).json({ error: `Failed to fetch ${tableName}` })
    }
  })
  
  // GET by ID
  router.get(`/api/${tableName}/:id`, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id])
      if (rows.length === 0) {
        return res.status(404).json({ error: `${tableName} not found` })
      }
      res.json(rows[0])
    } catch (err) {
      res.status(500).json({ error: `Failed to fetch ${tableName}` })
    }
  })
  
  // POST create
  router.post(`/api/${tableName}`, async (req, res) => {
    try {
      const body = req.body || {}
      
      // Validate required fields
      for (const field of requiredFields) {
        if (!body[field]) {
          return res.status(400).json({ error: `${field} is required` })
        }
      }
      
      const fields = Object.keys(body)
      const values = fields.map(field => body[field])
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ')
      
      const { rows } = await pool.query(
        `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      )
      
      res.status(201).json(rows[0])
    } catch (err: any) {
      if (err?.code === '23505') {
        res.status(409).json({ error: `${tableName} already exists` })
      } else {
        res.status(500).json({ error: `Failed to create ${tableName}` })
      }
    }
  })
  
  // PUT update
  router.put(`/api/${tableName}/:id`, async (req, res) => {
    try {
      const body = req.body || {}
      const fields = Object.keys(body).filter(key => body[key] !== undefined)
      
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' })
      }
      
      // Filter out read-only fields that shouldn't be updated
      const readonlyFields = ['id', 'created_at']
      const updatableFields = fields.filter(field => !readonlyFields.includes(field))
      
      if (updatableFields.length === 0) {
        return res.status(400).json({ error: 'No updatable fields provided' })
      }
      
      const setClause = updatableFields.map((field, i) => `${field} = $${i + 2}`).join(', ')
      const values = [req.params.id, ...updatableFields.map(field => body[field])]
      
      const { rows } = await pool.query(
        `UPDATE ${tableName} SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        values
      )
      
      if (rows.length === 0) {
        return res.status(404).json({ error: `${tableName} not found` })
      }
      
      res.json(rows[0])
    } catch (err: any) {
      console.error(`Error updating ${tableName}:`, err)
      const errorMessage = err?.message || `Failed to update ${tableName}`
      res.status(500).json({ error: errorMessage, details: err?.code })
    }
  })
  
  // DELETE
  router.delete(`/api/${tableName}/:id`, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`,
        [req.params.id]
      )
      
      if (rows.length === 0) {
        return res.status(404).json({ error: `${tableName} not found` })
      }
      
      res.json({ message: `${tableName} deleted successfully` })
    } catch (err) {
      res.status(500).json({ error: `Failed to delete ${tableName}` })
    }
  })
  
  return router
}
