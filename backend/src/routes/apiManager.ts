import { Router } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, authenticateToken, requireRole } from '../utils/apiHelpers'

export function createAPIManagerRouter(pool: Pool) {
  const router = Router()

  // Helper function to transform database row to frontend format
  function transformToFrontend(row: any) {
    const config = row.configuration || {}
    const fields = config.fields || []
    
    return {
      id: row.id.toString(),
      name: row.name,
      description: config.description || '',
      category: row.category as any,
      status: (config.status || 'inactive') as 'active' | 'inactive' | 'testing',
      lastUpdated: row.updated_at || row.created_at,
      fields: fields.map((f: any) => ({
        id: f.id || f.name,
        name: f.name,
        label: f.label || f.name,
        type: f.type || 'text',
        value: f.value || '',
        placeholder: f.placeholder,
        required: f.required || false,
        description: f.description,
        options: f.options,
        sensitive: f.sensitive || false
      })),
      // Legacy fields for backward compatibility
      api_key: row.api_key,
      api_secret: row.api_secret,
      base_url: row.base_url
    }
  }

  // Helper function to transform frontend format to database format
  function transformToDatabase(data: any) {
    const { id, fields, description, status, ...rest } = data
    
    return {
      name: data.name,
      category: data.category,
      api_key: data.api_key || (fields?.find((f: any) => f.name.includes('key') || f.name.includes('api_key'))?.value) || null,
      api_secret: data.api_secret || (fields?.find((f: any) => f.name.includes('secret') || f.name.includes('token'))?.value) || null,
      base_url: data.base_url || (fields?.find((f: any) => f.name.includes('url') || f.name.includes('endpoint'))?.value) || null,
      configuration: {
        description: description || data.description || '',
        status: status || data.status || 'inactive',
        fields: fields || []
      }
    }
  }

  // GET all API configurations
  router.get('/api/api-manager', authenticateToken, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM api_configurations ORDER BY created_at DESC`
      )
      
      const transformed = rows.map(transformToFrontend)
      sendSuccess(res, transformed)
    } catch (err: any) {
      console.error('Error fetching API configurations:', err)
      sendError(res, 500, 'Failed to fetch API configurations', err)
    }
  })

  // GET single API configuration by ID
  router.get('/api/api-manager/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params
      const { rows } = await pool.query(
        `SELECT * FROM api_configurations WHERE id = $1`,
        [id]
      )
      
      if (rows.length === 0) {
        return sendError(res, 404, 'API configuration not found')
      }
      
      const transformed = transformToFrontend(rows[0])
      sendSuccess(res, transformed)
    } catch (err: any) {
      console.error('Error fetching API configuration:', err)
      sendError(res, 500, 'Failed to fetch API configuration', err)
    }
  })

  // POST create new API configuration
  router.post('/api/api-manager', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const data = transformToDatabase(req.body)
      
      if (!data.name || !data.category) {
        return sendError(res, 400, 'Name and category are required')
      }

      const { rows } = await pool.query(
        `INSERT INTO api_configurations (name, category, api_key, api_secret, base_url, configuration)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         RETURNING *`,
        [
          data.name,
          data.category,
          data.api_key,
          data.api_secret,
          data.base_url,
          JSON.stringify(data.configuration)
        ]
      )
      
      const transformed = transformToFrontend(rows[0])
      sendSuccess(res, transformed, 201)
    } catch (err: any) {
      console.error('Error creating API configuration:', err)
      if (err.code === '23505') {
        sendError(res, 409, 'API configuration with this name already exists')
      } else {
        sendError(res, 500, 'Failed to create API configuration', err)
      }
    }
  })

  // PUT update API configuration
  router.put('/api/api-manager/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params
      const data = transformToDatabase(req.body)
      
      // Check if configuration exists
      const checkResult = await pool.query(
        `SELECT id FROM api_configurations WHERE id = $1`,
        [id]
      )
      
      if (checkResult.rows.length === 0) {
        return sendError(res, 404, 'API configuration not found')
      }

      const { rows } = await pool.query(
        `UPDATE api_configurations 
         SET name = $1, category = $2, api_key = $3, api_secret = $4, base_url = $5, 
             configuration = $6::jsonb, updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [
          data.name,
          data.category,
          data.api_key,
          data.api_secret,
          data.base_url,
          JSON.stringify(data.configuration),
          id
        ]
      )
      
      const transformed = transformToFrontend(rows[0])
      sendSuccess(res, transformed)
    } catch (err: any) {
      console.error('Error updating API configuration:', err)
      sendError(res, 500, 'Failed to update API configuration', err)
    }
  })

  // PATCH update specific fields in API configuration
  router.patch('/api/api-manager/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params
      const updates = req.body
      
      // Get current configuration
      const { rows: currentRows } = await pool.query(
        `SELECT * FROM api_configurations WHERE id = $1`,
        [id]
      )
      
      if (currentRows.length === 0) {
        return sendError(res, 404, 'API configuration not found')
      }
      
      const current = currentRows[0]
      const currentConfig = current.configuration || {}
      
      // Update fields if provided
      if (updates.fields) {
        currentConfig.fields = updates.fields
      }
      if (updates.status !== undefined) {
        currentConfig.status = updates.status
      }
      if (updates.description !== undefined) {
        currentConfig.description = updates.description
      }
      
      // Update main fields
      const name = updates.name || current.name
      const category = updates.category || current.category
      const api_key = updates.api_key !== undefined ? updates.api_key : current.api_key
      const api_secret = updates.api_secret !== undefined ? updates.api_secret : current.api_secret
      const base_url = updates.base_url !== undefined ? updates.base_url : current.base_url
      
      const { rows } = await pool.query(
        `UPDATE api_configurations 
         SET name = $1, category = $2, api_key = $3, api_secret = $4, base_url = $5, 
             configuration = $6::jsonb, updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [
          name,
          category,
          api_key,
          api_secret,
          base_url,
          JSON.stringify(currentConfig),
          id
        ]
      )
      
      const transformed = transformToFrontend(rows[0])
      sendSuccess(res, transformed)
    } catch (err: any) {
      console.error('Error patching API configuration:', err)
      sendError(res, 500, 'Failed to update API configuration', err)
    }
  })

  // DELETE API configuration
  router.delete('/api/api-manager/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params
      
      const { rows } = await pool.query(
        `DELETE FROM api_configurations WHERE id = $1 RETURNING id`,
        [id]
      )
      
      if (rows.length === 0) {
        return sendError(res, 404, 'API configuration not found')
      }
      
      sendSuccess(res, { id: rows[0].id, message: 'API configuration deleted successfully' })
    } catch (err: any) {
      console.error('Error deleting API configuration:', err)
      sendError(res, 500, 'Failed to delete API configuration', err)
    }
  })

  // POST test API configuration
  router.post('/api/api-manager/:id/test', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params
      const { testType = 'connection' } = req.body
      
      const { rows } = await pool.query(
        `SELECT * FROM api_configurations WHERE id = $1`,
        [id]
      )
      
      if (rows.length === 0) {
        return sendError(res, 404, 'API configuration not found')
      }
      
      const config = transformToFrontend(rows[0])
      
      // TODO: Implement actual API testing logic based on category
      // For now, return a mock response
      sendSuccess(res, {
        success: true,
        testType,
        message: `Test for ${config.name} completed`,
        timestamp: new Date().toISOString()
      })
    } catch (err: any) {
      console.error('Error testing API configuration:', err)
      sendError(res, 500, 'Failed to test API configuration', err)
    }
  })

  return router
}

