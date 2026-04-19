/**
 * Page-scoped Graph calls for Meta Business inbox (Messenger + linked Instagram).
 * Must use a Page access token — never the user Graph token.
 */

const GRAPH_VERSION = 'v21.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

export type MetaPageConversationPlatform = 'MESSENGER' | 'INSTAGRAM'

export async function listPageConversations(opts: {
  pageId: string
  platform: MetaPageConversationPlatform
  limit: number
  pageAccessToken: string
}): Promise<unknown> {
  const { pageId, platform, limit, pageAccessToken } = opts
  const id = String(pageId || '').replace(/^\//, '')
  if (!id) throw new Error('Invalid page id')
  const u = new URL(`${GRAPH_BASE}/${encodeURIComponent(id)}/conversations`)
  u.searchParams.set('fields', 'id,updated_time,snippet,message_count,senders{name,email,id}')
  u.searchParams.set('platform', platform)
  u.searchParams.set('limit', String(limit))
  u.searchParams.set('access_token', pageAccessToken)
  const res = await fetch(u.toString())
  const data = (await res.json()) as { error?: { message?: string; type?: string } }
  if (data.error) {
    const err = data.error
    throw new Error(err.message || err.type || 'Graph API error')
  }
  return data
}
