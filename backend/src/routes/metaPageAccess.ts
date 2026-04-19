/**
 * Routes backed by META_PAGE_ACCESS_TOKEN (Page access token only).
 * For user-token Graph proxies see metaBusinessSuite.ts and /api/admin/meta/graph/*.
 */
import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess } from '../utils/apiHelpers'
import { getMetaPageAccessToken } from '../utils/metaAccessToken'
import { listPageConversations, MetaPageConversationPlatform } from '../services/metaPageMessagingService'

function parsePlatform(raw: string): MetaPageConversationPlatform {
  const p = raw.toLowerCase()
  if (p === 'instagram' || p === 'ig') return 'INSTAGRAM'
  return 'MESSENGER'
}

/** GET /api/admin/meta/page/conversations?page_id=&platform=messenger|instagram&limit= */
export async function pageConversations(pool: Pool, req: Request, res: Response) {
  try {
    const pageId = String(req.query.page_id || '').trim()
    if (!pageId) {
      return sendError(res, 400, 'Missing query parameter: page_id')
    }
    const platform = parsePlatform(String(req.query.platform || 'messenger'))
    const limitRaw = parseInt(String(req.query.limit || '25'), 10)
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 25

    const token = await getMetaPageAccessToken(pool)
    if (!token) {
      return sendError(
        res,
        400,
        'META_PAGE_ACCESS_TOKEN is not set. Inbox conversations require a Page access token for that Page (not META_GRAPH_ACCESS_TOKEN).'
      )
    }

    const data = await listPageConversations({
      pageId,
      platform,
      limit,
      pageAccessToken: token,
    })
    sendSuccess(res, data)
  } catch (err: any) {
    sendError(res, 400, err.message || 'Failed to load conversations', err)
  }
}
