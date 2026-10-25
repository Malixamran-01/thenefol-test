import { Request, Response, NextFunction } from 'express'
import { attachStaffContext, getStaffContext, resolveStaffContext, sendError } from '../utils/apiHelpers'
import { extractBearerToken } from '../utils/authTokens'

type Rule = { methods?: string[]; pattern: RegExp }

const WRITE = ['POST', 'PUT', 'PATCH', 'DELETE']

/** Paths under admin-only prefixes that the storefront or third parties must still reach. */
const PUBLIC_EXCEPTIONS: Rule[] = [
  // Storefront affiliate application form posts here
  { methods: ['POST'], pattern: /^\/api\/admin\/affiliate-applications\/?$/ },
  // Browser redirect from the admin panel; the handler validates ?token= itself
  { methods: ['GET'], pattern: /^\/api\/admin\/instagram\/connect\/?$/ },
  // Storefront Meta pixel events
  { methods: ['POST'], pattern: /^\/api\/meta-ads\/pixel\/events\/?$/ },
  // Called by Meta servers
  { methods: ['POST'], pattern: /^\/api\/facebook\/webhook\/?$/ },
  { methods: ['GET'], pattern: /^\/api\/facebook\/catalog\.csv$/ },
]

/** Endpoints only the admin panel uses. A valid staff session is required for these. */
const ADMIN_ONLY: Rule[] = [
  { pattern: /^\/api\/admin(\/|$)/ },
  { pattern: /^\/api\/blog\/admin(\/|$)/ },
  { pattern: /^\/api\/community\/admin(\/|$)/ },
  { methods: ['PATCH', 'DELETE'], pattern: /^\/api\/community\/(questions|answers)\/[^/]+\/admin\/?$/ },
  { methods: ['POST'], pattern: /^\/api\/community\/questions\/bulk-delete\/?$/ },

  // Customer records (GET/PUT /api/users/:id are handled per-route: public summary / self-update)
  { methods: ['GET', 'POST'], pattern: /^\/api\/users\/?$/ },
  { methods: ['GET'], pattern: /^\/api\/users\/(search|segments)\/?$/ },
  { methods: ['GET'], pattern: /^\/api\/users\/\d+\/activity\/?$/ },
  { methods: ['POST', 'DELETE'], pattern: /^\/api\/users\/\d+\/(notes|tags)\/?$/ },
  { methods: ['DELETE'], pattern: /^\/api\/users\/\d+\/?$/ },

  // Catalog & stock management
  { methods: ['POST'], pattern: /^\/api\/products\/?$/ },
  { methods: ['PUT', 'PATCH', 'DELETE'], pattern: /^\/api\/products\/.+/ },
  { methods: ['POST'], pattern: /^\/api\/products\/(bulk-delete|bulk-update-gst)\/?$/ },
  { methods: ['POST'], pattern: /^\/api\/products\/[^/]+\/(images|variant-options|variants)(\/.*)?$/ },
  { methods: WRITE, pattern: /^\/api\/variants(\/|$)/ },
  { methods: ['POST'], pattern: /^\/api\/products-csv\/upload\/?$/ },
  { pattern: /^\/api\/inventory(\/|$)/ },
  { pattern: /^\/api\/(warehouses|suppliers|purchase-orders|pos|barcodes)(\/|$)/ },

  // Shipping admin
  { methods: ['GET'], pattern: /^\/api\/shiprocket\/shipments\/?$/ },
  { methods: ['POST'], pattern: /^\/api\/shiprocket\/create-shipment\/?$/ },

  // Marketing & communications
  { methods: ['GET'], pattern: /^\/api\/(email-campaigns|sms-campaigns)\/?$/ },
  { pattern: /^\/api\/(email-marketing|sms-marketing|whatsapp-chat|push-notifications)(\/|$)/ },
  { pattern: /^\/api\/whatsapp\/(config|templates|automations|scheduled-messages|subscriptions|stats)(\/|$)/ },
  { methods: ['GET'], pattern: /^\/api\/live-chat\/(sessions|agents|widgets)\/?$/ },
  { methods: ['GET'], pattern: /^\/api\/marketing\/(campaigns|templates)\/?$/ },
  { methods: ['GET'], pattern: /^\/api\/contact\/messages\/?$/ },
  { methods: ['PUT'], pattern: /^\/api\/contact\/messages\/[^/]+\/?$/ },
  { methods: ['GET'], pattern: /^\/api\/forms\/submissions\/?$/ },
  { methods: ['GET'], pattern: /^\/api\/forms\/[^/]+\/submissions\/?$/ },
  { methods: ['POST'], pattern: /^\/api\/forms\/?$/ },
  { methods: ['PUT', 'DELETE'], pattern: /^\/api\/forms\/[^/]+\/?$/ },
  { pattern: /^\/api\/alerts(\/|$)/ },
  { methods: ['POST'], pattern: /^\/api\/notifications\/order\/?$/ },

  // Meta / Facebook management
  { pattern: /^\/api\/meta-ads(\/|$)/ },
  { pattern: /^\/api\/(facebook|fb-shop)(\/|$)/ },

  // Content & settings
  { methods: WRITE, pattern: /^\/api\/cms(\/|$)/ },
  { methods: ['POST'], pattern: /^\/api\/carousel-settings\/?$/ },
  { methods: ['POST', 'PUT'], pattern: /^\/api\/loyalty-program(\/|$)/ },
  { methods: ['PUT'], pattern: /^\/api\/invoice-settings(\/|$)/ },
  { pattern: /^\/api\/api-manager(\/|$)/ },
  { pattern: /^\/api\/settings\/?$/ },
  { methods: ['GET'], pattern: /^\/api\/(google|social)(\/|$)/ },

  // Reporting
  { pattern: /^\/api\/dashboard(\/|$)/ },
  {
    methods: ['GET'],
    pattern: /^\/api\/(analytics|analytics-data|journey-tracking|tax-report|payment-methods|payment-transactions|payment-report|invoices)\/?$/,
  },
  { pattern: /^\/api\/ai(\/|$)/ },
]

function matches(rules: Rule[], method: string, path: string): boolean {
  return rules.some((r) => (!r.methods || r.methods.includes(method)) && r.pattern.test(path))
}

/**
 * Generic CRUD tables (index.ts createCRUDHandler) are admin data. Only the exact CRUD shapes are
 * matched (GET/POST /api/t, GET/PUT/DELETE /api/t/:id) so specialised routes keep their own rules.
 */
function isAdminCrudRequest(req: Request, crudTables: Set<string>): boolean {
  const m = /^\/api\/([a-z_]+)(?:\/([^/]+))?\/?$/.exec(req.path)
  if (!m) return false
  const [, table, id] = m
  if (!crudTables.has(table) || table === 'users') return false

  const method = req.method
  const isCrudShape = id === undefined ? method === 'GET' || method === 'POST' : ['GET', 'PUT', 'DELETE'].includes(method)
  if (!isCrudShape) return false

  // Storefront reads
  if (method === 'GET') {
    if (table === 'videos') return false
    if (table === 'forms' && (id === undefined || /^\d+$/.test(id))) return false
    if (table === 'shiprocket_shipments' && id === undefined && req.query?.order_id) return false
  }
  return true
}

/**
 * Global middleware:
 *  - any request carrying a staff_… token gets its staff session attached (if valid);
 *  - admin-only endpoints are rejected unless such a session is present.
 */
export function createAdminGuard(getCrudTables: () => string[]) {
  let crudTableSet: Set<string> | null = null

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS' || !req.path.startsWith('/api/')) return next()

    const token = extractBearerToken(req)
    if (token && token.startsWith('staff_') && !getStaffContext(req)) {
      try {
        const ctx = await resolveStaffContext(token)
        if (ctx) attachStaffContext(req, ctx)
      } catch (err) {
        console.error('[adminGuard] staff session lookup failed:', err)
      }
    }

    if (!crudTableSet) crudTableSet = new Set(getCrudTables())

    const method = req.method.toUpperCase()
    const adminOnly =
      !matches(PUBLIC_EXCEPTIONS, method, req.path) &&
      (matches(ADMIN_ONLY, method, req.path) || isAdminCrudRequest(req, crudTableSet))

    if (!adminOnly || getStaffContext(req)) return next()

    return sendError(res, 401, 'Admin session required')
  }
}
