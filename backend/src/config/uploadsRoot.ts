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
