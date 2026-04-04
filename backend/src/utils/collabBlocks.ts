import { Pool } from 'pg'

/** One row per user (unique_user_id); toggled with is_active. */
export async function ensureCollabBlockSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collab_program_blocks (
      id SERIAL PRIMARY KEY,
      unique_user_id TEXT NOT NULL UNIQUE,
      user_email TEXT,
      internal_reason TEXT,
      public_message TEXT NOT NULL DEFAULT 'Your access to the Creator Program has been restricted. If you believe this is a mistake, you can submit an appeal below.',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      appeal_status VARCHAR(32) NOT NULL DEFAULT 'none',
      appeal_text TEXT,
      appeal_submitted_at TIMESTAMPTZ,
      appeal_resolved_at TIMESTAMPTZ,
      appeal_resolution_note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_collab_program_blocks_active ON collab_program_blocks (is_active) WHERE is_active = TRUE;
    CREATE INDEX IF NOT EXISTS idx_collab_program_blocks_email ON collab_program_blocks (LOWER(TRIM(user_email)));
  `)
}

export type CollabBlockRow = {
  id: number
  unique_user_id: string
  user_email: string | null
  internal_reason: string | null
  public_message: string
  is_active: boolean
  blocked_at: string
  updated_at: string
  appeal_status: string
  appeal_text: string | null
  appeal_submitted_at: string | null
  appeal_resolved_at: string | null
  appeal_resolution_note: string | null
}

/** Block applies to the entire Creator Program (Collab, Affiliate, Revenue), not only Collab. */
export async function getCreatorProgramBlockForUserId(
  pool: Pool,
  userId: string | number | undefined | null
): Promise<CollabBlockRow | null> {
  if (userId == null || userId === '') return null
  await ensureCollabBlockSchema(pool)
  const res = await pool.query<{ unique_user_id: string | null; email: string | null }>(
    `SELECT unique_user_id, email FROM users WHERE id = $1`,
    [userId]
  )
  if (!res.rows.length) return null
  const row = res.rows[0]
  return getActiveCollabBlock(pool, row.unique_user_id || null, row.email || null)
}

export async function getActiveCollabBlock(
  pool: Pool,
  uniqueUserId: string | null,
  email: string | null
): Promise<CollabBlockRow | null> {
  await ensureCollabBlockSchema(pool)
  if (!uniqueUserId && !email) return null
  const res = await pool.query(
    `SELECT * FROM collab_program_blocks
     WHERE is_active = TRUE
       AND (
         ($1::text IS NOT NULL AND unique_user_id = $1)
         OR ($2::text IS NOT NULL AND LOWER(TRIM(COALESCE(user_email,''))) = LOWER(TRIM($2::text)))
       )
     LIMIT 1`,
    [uniqueUserId || null, email || null]
  )
  return (res.rows[0] as CollabBlockRow) || null
}

/** Use when you only have collab_application id (Instagram, platform OAuth, submit reel, etc.). */
export async function assertCollabNotBlockedByAppId(
  pool: Pool,
  collabApplicationId: number | string | undefined
): Promise<{ ok: true } | { ok: false; message: string }> {
  await ensureCollabBlockSchema(pool)
  const id = Number(collabApplicationId)
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, message: 'Invalid collab request.' }
  }
  const r = await pool.query(`SELECT unique_user_id, email FROM collab_applications WHERE id = $1`, [id])
  if (!r.rows.length) return { ok: true }
  const { unique_user_id, email } = r.rows[0] as { unique_user_id: string | null; email: string | null }
  const block = await getActiveCollabBlock(pool, unique_user_id, email)
  if (block) return { ok: false, message: block.public_message || 'Creator Collab access is restricted.' }
  return { ok: true }
}
