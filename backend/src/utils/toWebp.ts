/**
 * WebP conversion utility for all image uploads.
 *
 * - Converts JPEG, PNG, GIF (first frame), and BMP to WebP.
 * - SVG and video files are passed through as-is (they cannot be losslessly
 *   converted to WebP and are already well-compressed or vector).
 * - Already-WebP files are re-encoded at the configured quality to normalise
 *   metadata / strip unnecessary chunks.
 * - Returns the final file path and the new public URL segment (filename).
 *
 * Quality defaults:
 *   WEBP_QUALITY  (env, default 82) — lossy quality for photos
 *   WEBP_LOSSLESS (env, "1" = lossless mode, default off)
 */
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

/** MIME types we intentionally skip (pass through unchanged). */
const SKIP_MIMES = new Set([
  'image/svg+xml',
  'image/gif',       // sharp turns animated GIFs into a single-frame WebP — skip for safety
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
])

const QUALITY = Math.min(100, Math.max(1, parseInt(process.env.WEBP_QUALITY || '82', 10)))
const LOSSLESS = process.env.WEBP_LOSSLESS === '1' || process.env.WEBP_LOSSLESS === 'true'

/**
 * Convert an uploaded image file to WebP in-place (replaces the original file).
 *
 * @param filePath  Absolute path to the file on disk (written by multer already)
 * @param mimetype  MIME type reported by the browser
 * @returns The final filename (with .webp extension when converted).
 *          The original file is removed after successful conversion.
 */
export async function convertToWebp(filePath: string, mimetype: string): Promise<string> {
  if (SKIP_MIMES.has(mimetype)) {
    return path.basename(filePath)
  }

  const dir  = path.dirname(filePath)
  const base = path.basename(filePath, path.extname(filePath))
  const dest = path.join(dir, `${base}.webp`)

  try {
    await sharp(filePath)
      .webp({ quality: QUALITY, lossless: LOSSLESS })
      .toFile(dest)

    // Remove the original (multer-written) file only after conversion succeeds
    try { fs.unlinkSync(filePath) } catch { /* ignore race */ }

    return `${base}.webp`
  } catch (err) {
    // If sharp fails (e.g. corrupt file), keep the original and log the error
    console.warn(`[toWebp] Could not convert ${path.basename(filePath)} to WebP — serving original`, err)
    return path.basename(filePath)
  }
}

/**
 * Process every file in a multer `req.files` map or array and replace each
 * file's `filename` and `path` with the converted WebP equivalents.
 *
 * Call this immediately after the multer middleware resolves.
 */
export async function convertFilesToWebp(
  files: Express.Multer.File | Express.Multer.File[] | { [field: string]: Express.Multer.File[] } | undefined
): Promise<void> {
  if (!files) return

  if (!Array.isArray(files) && typeof files === 'object' && !(files as any).fieldname) {
    // multer fields map: { coverImage: [File], images: [File, File], … }
    const map = files as { [field: string]: Express.Multer.File[] }
    await Promise.all(
      Object.values(map).flat().map((f) => processSingleFile(f))
    )
  } else if (Array.isArray(files)) {
    await Promise.all(files.map((f) => processSingleFile(f)))
  } else {
    await processSingleFile(files as Express.Multer.File)
  }
}

async function processSingleFile(file: Express.Multer.File): Promise<void> {
  const newName = await convertToWebp(file.path, file.mimetype)
  if (newName !== file.filename) {
    file.filename = newName
    file.path     = path.join(path.dirname(file.path), newName)
    file.mimetype = 'image/webp'
  }
}
