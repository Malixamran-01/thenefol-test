/**
 * Meta Business Suite–style Graph API proxy for the admin panel (user access token).
 * Token: getMetaGraphAccessToken → META_GRAPH_ACCESS_TOKEN / DB (see metaAccessToken).
 *
 * Also mounted at `/api/admin/meta/graph/*` (see metaGraphUser.ts). Page inbox lives under
 * `/api/admin/meta/page/*` and uses META_PAGE_ACCESS_TOKEN only.
 */
import { Request, Response } from 'express'
import { Pool } from 'pg'
import { getMetaAdsAppId, getMetaPageAccessTokenFromEnv } from '../config/metaAdsEnv'
import { sendError, sendSuccess } from '../utils/apiHelpers'
import { getMetaGraphAccessToken } from '../utils/metaAccessToken'

const GRAPH_VERSION = 'v21.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

function actId(raw: string): string {
  const t = String(raw || '').trim()
  if (!t) return ''
  return t.startsWith('act_') ? t : `act_${t.replace(/^act_/i, '')}`
}

async function graphGet(pool: Pool, path: string, query: Record<string, string> = {}): Promise<any> {
  const token = await getMetaGraphAccessToken(pool)
  if (!token) {
    throw new Error('No Meta access token configured. Set it in Admin → Meta Ads → Settings or META_ADS_ACCESS_TOKEN.')
  }
  const clean = path.replace(/^\//, '')
  const u = new URL(`${GRAPH_BASE}/${clean}`)
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v))
  }
  u.searchParams.set('access_token', token)
  const res = await fetch(u.toString())
  const data = await res.json()
  if ((data as any).error) {
    const err = (data as any).error
    throw new Error(err.message || err.type || 'Graph API error')
  }
  return data
}

/** GET /api/admin/meta-business/overview */
export async function suiteOverview(pool: Pool, _req: Request, res: Response) {
  try {
    const token = await getMetaGraphAccessToken(pool)
    if (!token) {
      return sendError(res, 400, 'No Meta access token configured.')
    }
    const me = await graphGet(pool, 'me', { fields: 'id,name,email' })
    let businesses: any = { data: [] }
    let businessesErr: string | null = null
    try {
      businesses = await graphGet(pool, 'me/businesses', {
        fields: 'id,name,verification_status,primary_page{id,name,link}',
        limit: '50',
      })
    } catch (e: any) {
      businessesErr = e.message || String(e)
    }
    sendSuccess(res, {
      meta_app_id: getMetaAdsAppId() || null,
      token_configured: true,
      page_access_token_set: !!getMetaPageAccessTokenFromEnv(),
      me,
      businesses: businesses.data || [],
      businesses_error: businessesErr,
    })
  } catch (err: any) {
    sendError(res, 500, err.message || 'Overview failed', err)
  }
}

/** GET /api/admin/meta-business/me */
export async function suiteMe(pool: Pool, _req: Request, res: Response) {
  try {
    const data = await graphGet(pool, 'me', {
      fields: 'id,name,email,first_name,last_name,short_name',
    })
    sendSuccess(res, data)
  } catch (err: any) {
    sendError(res, 400, err.message || 'Failed to fetch me', err)
  }
}

/** GET /api/admin/meta-business/businesses */
export async function suiteBusinesses(pool: Pool, _req: Request, res: Response) {
  try {
    const data = await graphGet(pool, 'me/businesses', {
      fields:
        'id,name,verification_status,created_time,timezone_id,primary_page{id,name,link},owned_ad_accounts{id,name,account_status,currency}',
      limit: '50',
    })
    sendSuccess(res, data)
  } catch (err: any) {
    sendError(res, 400, err.message || 'Failed to list businesses', err)
  }
}

/** GET /api/admin/meta-business/pages — Facebook Pages this user can access */
export async function suitePages(pool: Pool, _req: Request, res: Response) {
  try {
    const data = await graphGet(pool, 'me/accounts', {
      fields:
        'id,name,category,category_list,tasks,fan_count,link,is_published,verification_status,picture{url},instagram_business_account{id,username,profile_picture_url}',
      limit: '50',
    })
    sendSuccess(res, data)
  } catch (err: any) {
    sendError(res, 400, err.message || 'Failed to list pages', err)
  }
}

/** GET /api/admin/meta-business/page/:pageId — single page + IG link */
export async function suitePageDetail(pool: Pool, req: Request, res: Response) {
  try {
    const { pageId } = req.params
    const data = await graphGet(pool, pageId, {
      fields:
        'id,name,about,category,fan_count,link,is_published,phone,website,instagram_business_account{id,username,ig_id,name,profile_picture_url}',
    })
    sendSuccess(res, data)
  } catch (err: any) {
    sendError(res, 400, err.message || 'Failed to load page', err)
  }
}

/** GET /api/admin/meta-business/instagram/:igUserId/media */
export async function suiteIgMedia(pool: Pool, req: Request, res: Response) {
  try {
    const { igUserId } = req.params
    const limit = String(req.query.limit || '25')
    const data = await graphGet(pool, `${igUserId}/media`, {
      fields:
        'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count',
      limit,
    })
    sendSuccess(res, data)
  } catch (err: any) {
    sendError(res, 400, err.message || 'Failed to load Instagram media', err)
  }
}

/** GET /api/admin/meta-business/instagram/:igUserId/insights */
export async function suiteIgInsights(pool: Pool, req: Request, res: Response) {
  try {
    const { igUserId } = req.params
    const period = String(req.query.period || 'day')
    const metric = String(req.query.metric || 'impressions,reach,profile_views,website_clicks')
    const data = await graphGet(pool, `${igUserId}/insights`, {
      metric,
      period,
    })
    sendSuccess(res, data)
  } catch (err: any) {
    sendError(res, 400, err.message || 'Failed to load Instagram insights', err)
  }
}

/** GET /api/admin/meta-business/ad-account/:adAccountId — ad account profile */
export async function suiteAdAccount(pool: Pool, req: Request, res: Response) {
  try {
    const id = actId(req.params.adAccountId || '')
    if (!id) return sendError(res, 400, 'Invalid ad account id')
    const data = await graphGet(pool, id, {
      fields: 'id,name,account_id,currency,account_status,timezone_name,business{ id,name },capabilities',
    })
    sendSuccess(res, data)
  } catch (err: any) {
    sendError(res, 400, err.message || 'Failed to load ad account', err)
  }
}

/** GET /api/admin/meta-business/ad-account/:adAccountId/pixels */
export async function suiteAdPixels(pool: Pool, req: Request, res: Response) {
  try {
    const id = actId(req.params.adAccountId || '')
    if (!id) return sendError(res, 400, 'Invalid ad account id')
    const data = await graphGet(pool, `${id}/adspixels`, {
      fields: 'id,name,last_fired_time,owner_ad_account',
      limit: '50',
    })
    sendSuccess(res, data)
  } catch (err: any) {
    sendError(res, 400, err.message || 'Failed to load pixels', err)
  }
}

/** GET /api/admin/meta-business/ad-account/:adAccountId/product-catalogs */
export async function suiteProductCatalogs(pool: Pool, req: Request, res: Response) {
  try {
    const id = actId(req.params.adAccountId || '')
    if (!id) return sendError(res, 400, 'Invalid ad account id')
    const data = await graphGet(pool, `${id}/product_catalogs`, {
      fields: 'id,name,vertical,business{id,name}',
      limit: '25',
    })
    sendSuccess(res, data)
  } catch (err: any) {
    sendError(res, 400, err.message || 'Failed to load catalogs (needs catalog permission)', err)
  }
}

/** GET /api/admin/meta-business/business/:businessId/owned-ad-accounts */
export async function suiteBusinessOwnedAdAccounts(pool: Pool, req: Request, res: Response) {
  try {
    const { businessId } = req.params
    const data = await graphGet(pool, `${businessId}/owned_ad_accounts`, {
      fields: 'id,name,account_id,currency,account_status',
      limit: '50',
    })
    sendSuccess(res, data)
  } catch (err: any) {
    sendError(res, 400, err.message || 'Failed to list owned ad accounts', err)
  }
}
