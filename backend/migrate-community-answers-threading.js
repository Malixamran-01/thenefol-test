/**
 * Migration: Add infinite-nesting threading columns to community_answers.
 * Safe to run multiple times (all statements use IF NOT EXISTS / DO NOTHING).
 *
 * Adds:  parent_id, depth, path, root_answer_id, score,
 *        is_verified, verified_by, verified_at, updated_at
 * Then backfills path / root_answer_id for any existing rows.
 */

const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl:
    process.env.DATABASE_URL?.includes('supabase') ||
    process.env.POSTGRES_URL?.includes('supabase')
      ? { rejectUnauthorized: false }
      : false,
})

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    console.log('🔄 Adding threading columns to community_answers…')

    const ddl = `
      ALTER TABLE community_answers
        ADD COLUMN IF NOT EXISTS parent_id       integer        REFERENCES community_answers(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS depth           integer        NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS path            text,
        ADD COLUMN IF NOT EXISTS root_answer_id  integer        REFERENCES community_answers(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS score           integer        NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_verified     boolean        NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS verified_by     integer,
        ADD COLUMN IF NOT EXISTS verified_at     timestamptz,
        ADD COLUMN IF NOT EXISTS updated_at      timestamptz    NOT NULL DEFAULT now()
      ;
    `
    await client.query(ddl)
    console.log('✅ Columns added (or already existed)')

    // Indexes for tree queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ca_question_id  ON community_answers(question_id);
      CREATE INDEX IF NOT EXISTS idx_ca_parent_id    ON community_answers(parent_id);
      CREATE INDEX IF NOT EXISTS idx_ca_path         ON community_answers(path text_pattern_ops);
      CREATE INDEX IF NOT EXISTS idx_ca_root_id      ON community_answers(root_answer_id);
    `)
    console.log('✅ Indexes ensured')

    // Sync score = likes_count for existing rows
    await client.query(`
      UPDATE community_answers
      SET score = likes_count
      WHERE score = 0 AND likes_count > 0
    `)

    // Backfill path & root_answer_id for top-level answers (parent_id IS NULL)
    await client.query(`
      UPDATE community_answers
      SET path = id::text,
          root_answer_id = id
      WHERE parent_id IS NULL AND path IS NULL
    `)
    console.log('✅ Backfilled root answers')

    // Backfill nested answers iteratively (up to 20 levels)
    let iterations = 0
    let updated = true
    while (updated && iterations < 20) {
      const result = await client.query(`
        UPDATE community_answers child
        SET path           = parent.path || '.' || child.id::text,
            root_answer_id = parent.root_answer_id,
            depth          = parent.depth + 1
        FROM community_answers parent
        WHERE child.parent_id = parent.id
          AND parent.path IS NOT NULL
          AND child.path IS NULL
        RETURNING child.id
      `)
      updated = (result.rowCount ?? 0) > 0
      iterations++
      if (updated) console.log(`  Backfilled ${result.rowCount} nested answers (pass ${iterations})`)
    }
    console.log('✅ Backfilled nested answers')

    await client.query('COMMIT')
    console.log('✅ Migration completed successfully!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
