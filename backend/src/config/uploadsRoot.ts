/**
 * Persistent file storage for product images, avatars, blog assets, etc.
 *
 * Do not store under the backend build tree — deploys often wipe it.
 *
 * - Production: set `UPLOADS_DIR` to an absolute path on durable disk
 *   (e.g. `/var/lib/nefol/uploads` or a mounted volume).
 * - Default: `uploads-data` next to the `backend` folder (repo root), derived from
 *   this file’s location so it stays stable even if `process.cwd()` changes.
 */
import path from 'path'
import fs from 'fs'

export function getUploadsRoot(): string {
  const fromEnv = process.env.UPLOADS_DIR?.trim()
  if (fromEnv) {
    return path.resolve(fromEnv)
  }
  // src/config or dist/config → three levels up = parent of `backend` → …/uploads-data
  return path.resolve(__dirname, '../../../uploads-data')
}

export function joinUploads(...segments: string[]): string {
  return path.join(getUploadsRoot(), ...segments)
}

/** Create root and common subfolders (e.g. blog). Idempotent. */
export function ensureUploadsTree(): void {
  const root = getUploadsRoot()
  try {
    fs.mkdirSync(root, { recursive: true })
    fs.mkdirSync(path.join(root, 'blog'), { recursive: true })
  } catch (e) {
    console.error('Failed to create uploads directories:', root, e)
    throw e
  }
}

const EPHEMERAL_DEPLOY_SEGMENTS = [
  path.sep + 'var' + path.sep + 'www' + path.sep,
  path.sep + 'backend' + path.sep + 'uploads',
  path.sep + 'backend' + path.sep + 'dist' + path.sep,
  path.sep + 'tmp' + path.sep,
]

/**
 * Warn when uploads live inside a deploy/build tree (wiped on VPS rebuild or fresh deploy).
 * Set UPLOADS_DIR=/var/lib/nefol/uploads (or S3/R2) on production.
 */
export function warnIfEphemeralUploadsPath(): void {
  if (process.env.NODE_ENV !== 'production') return

  const root = getUploadsRoot()
  const normalized = root.replace(/\\/g, '/').toLowerCase()
  const inDeployTree =
    EPHEMERAL_DEPLOY_SEGMENTS.some((seg) => normalized.includes(seg.replace(/\\/g, '/').toLowerCase())) ||
    normalized.endsWith('/uploads-data') ||
    normalized.includes('/thenefol/uploads-data')

  if (!inDeployTree) return

  console.warn(
    [
      '',
      '⚠️  [uploads] UPLOADS_DIR points at a deploy folder — files may be LOST on VPS reset or redeploy.',
      `    Current path: ${root}`,
      '    Fix on the server (one time):',
      '      sudo mkdir -p /var/lib/nefol/uploads/blog',
      '      sudo chown -R $(whoami):$(whoami) /var/lib/nefol/uploads',
      '      # copy existing files if any:',
      '      rsync -a /var/www/nefol/uploads-data/ /var/lib/nefol/uploads/ 2>/dev/null || true',
      '    Then set in backend/.env and PM2:',
      '      UPLOADS_DIR=/var/lib/nefol/uploads',
      '',
    ].join('\n')
  )
}
