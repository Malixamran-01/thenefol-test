import type { PoolConfig } from 'pg'

export type PgPoolBuildResult = {
  config: PoolConfig
  meta: {
    useSupabaseSsl: boolean
    isSupabasePooler: boolean
    isSupabaseTransactionPooler: boolean
    isSupabaseSessionPooler: boolean
    pgPoolMax: number
    connectionTimeoutMillis: number
    idleTimeoutMillis: number
    hostHint: string
  }
}

/**
 * Build `pg.Pool` options for Supabase / PgBouncer / plain Postgres.
 *
 * Supabase pooler limits (e.g. max 15 clients on smaller plans): keep `PGPOOL_MAX` low.
 * Prefer **transaction** pooler (port 6543, `*.pooler.supabase.com:6543`) over session mode (5432).
 * Session mode holds a DB connection for the whole client session and exhausts the pool fast.
 */
export function buildPgPoolConfig(connectionString: string): PgPoolBuildResult {
  const supabaseFlag = process.env.USE_SUPABASE_DB?.trim().toLowerCase()
  const looksLikeSupabaseHost =
    /\bsupabase\.com\b/i.test(connectionString) || connectionString.includes('supabase.co')
  const useSupabaseSsl =
    supabaseFlag === '1' || supabaseFlag === 'true'
      ? true
      : supabaseFlag === '0' || supabaseFlag === 'false'
        ? false
        : looksLikeSupabaseHost

  const isSupabasePooler = /pooler\.supabase\.com/i.test(connectionString)
  const isSupabaseTransactionPooler =
    isSupabasePooler &&
    (/:6543\b/.test(connectionString) || /[?&]pgbouncer=true/i.test(connectionString))
  const isSupabaseSessionPooler = isSupabasePooler && !isSupabaseTransactionPooler

  /** Session pooler + many Node connections = "max clients reached" quickly. */
  const defaultMax = isSupabaseSessionPooler ? 8 : isSupabasePooler ? 10 : 20
  const poolerCap = isSupabasePooler ? 15 : 100
  const pgPoolMax = Math.min(
    poolerCap,
    Math.max(1, parseInt(process.env.PGPOOL_MAX || String(defaultMax), 10) || defaultMax)
  )

  const idleTimeoutMillis = Math.max(
    1000,
    parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10) || 30_000
  )

  const connTimeoutDefault = isSupabaseSessionPooler ? 5000 : useSupabaseSsl ? 15_000 : 5000
  const pgConnTimeoutRaw = Math.min(
    120_000,
    Math.max(2000, parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || String(connTimeoutDefault), 10) || connTimeoutDefault)
  )
  const connectionTimeoutMillis = useSupabaseSsl
    ? Math.max(pgConnTimeoutRaw, isSupabaseTransactionPooler ? 5000 : 15_000)
    : pgConnTimeoutRaw

  const hostMatch = connectionString.match(/@([^/?]+)/)
  const hostHint = hostMatch ? hostMatch[1].split(':')[0] : '?'

  const config: PoolConfig = {
    connectionString,
    max: pgPoolMax,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    ...(useSupabaseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  }

  return {
    config,
    meta: {
      useSupabaseSsl,
      isSupabasePooler,
      isSupabaseTransactionPooler,
      isSupabaseSessionPooler,
      pgPoolMax,
      connectionTimeoutMillis,
      idleTimeoutMillis,
      hostHint,
    },
  }
}

export function logPgPoolStartup(meta: PgPoolBuildResult['meta']): void {
  const mode = meta.isSupabaseTransactionPooler
    ? 'transaction pooler (recommended)'
    : meta.isSupabaseSessionPooler
      ? 'SESSION pooler — consider switching to transaction mode (port 6543) in Supabase dashboard'
      : meta.useSupabaseSsl
        ? 'TLS (Supabase-style)'
        : 'direct Postgres'

  console.log(
    `[DB] ${mode} → ${meta.hostHint} · pool max=${meta.pgPoolMax} idleMs=${meta.idleTimeoutMillis} connectTimeoutMs=${meta.connectionTimeoutMillis}`
  )

  if (meta.isSupabaseSessionPooler) {
    console.warn(
      '[DB] ⚠️ Supabase session pooler detected. Use the transaction pooler URL (port 6543) to avoid "max clients reached".'
    )
  }
}
