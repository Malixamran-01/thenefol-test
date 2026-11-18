import type { Pool } from 'pg'
import { ALL_RBAC_SEED_CODES } from '../config/rbacCatalog'
import { PERMISSION_SPLITS } from '../config/adminNavCatalog'

/**
 * Adds any permission codes the catalog knows about but the database doesn't. When a code was
 * split out of a broader one (e.g. Reviews out of Products), roles holding the broader code get
 * the new one too, once, so nobody loses access. Safe to run on every start.
 */
export async function syncRbacPermissionCodes(pool: Pool): Promise<number> {
  let added = 0
  for (const code of ALL_RBAC_SEED_CODES) {
    const r = await pool.query(
      `insert into permissions (code) values ($1) on conflict (code) do nothing returning id`,
      [code]
    )
    if (!r.rowCount) continue
    added += 1
    const source = PERMISSION_SPLITS[code]
    if (source) {
      await pool.query(
        `insert into role_permissions (role_id, permission_id)
         select rp.role_id, $1 from role_permissions rp
         join permissions p on p.id = rp.permission_id
         where p.code = $2
         on conflict do nothing`,
        [r.rows[0].id, source]
      )
    }
  }
  return added
}
