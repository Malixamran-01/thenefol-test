/** Routes that belong to Nefol Social (blog, author, collab, affiliate shell). Banned authors are blocked from these. */
export function isNefolSocialRoute(pathWithoutQuery: string): boolean {
  const p = pathWithoutQuery.toLowerCase().split('?')[0]
  if (p.startsWith('/user/blog')) return true
  if (p.startsWith('/user/author')) return true
  if (p === '/user/collab') return true
  if (p === '/user/affiliate' || p === '/user/affiliate-partner' || p === '/user/referral-history') return true
  return false
}
