/**
 * Link-preview (Open Graph) images.
 *
 * Uploads are stored as WebP, which WhatsApp, LinkedIn and some Facebook surfaces
 * fail to render as a preview. This turns a local upload into a 1200×630 JPEG
 * (the size the og:image:width/height tags promise), cached on disk under
 * `<UPLOADS_DIR>/og/` so it's generated once per source image.
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { getUploadsRoot } from '../config/uploadsRoot'

const OG_WIDTH = 1200
const OG_HEIGHT = 630

/** Map `/uploads/...` (relative or absolute on our own host) to a file inside the uploads root. */
function localUploadPath(url: string): string | null {
  const m = String(url).match(/\/uploads\/([^?#]+)/)
  if (!m) return null
  let rel: string
  try { rel = decodeURIComponent(m[1]) } catch { rel = m[1] }
  const root = path.resolve(getUploadsRoot())
  const file = path.resolve(root, rel)
  if (!file.startsWith(root + path.sep)) return null
  return fs.existsSync(file) ? file : null
}

/**
 * Returns an absolute URL to a JPEG preview for `imageUrl`, or `imageUrl` unchanged when it
 * isn't a local upload (external CDN, /IMAGES/ static assets) or conversion fails.
 */
export async function toShareableOgImage(imageUrl: string, mediaBase: string): Promise<string> {
  if (!imageUrl) return imageUrl
  const src = localUploadPath(imageUrl)
  if (!src) return imageUrl
  try {
    const stat = fs.statSync(src)
    const key = crypto.createHash('sha1').update(`${src}:${stat.mtimeMs}:${stat.size}`).digest('hex').slice(0, 20)
    const outDir = path.join(getUploadsRoot(), 'og')
    const outFile = path.join(outDir, `${key}.jpg`)
    if (!fs.existsSync(outFile)) {
      fs.mkdirSync(outDir, { recursive: true })
      const tmp = `${outFile}.${process.pid}.tmp`
      await sharp(src)
        .resize(OG_WIDTH, OG_HEIGHT, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 84, mozjpeg: true })
        .toFile(tmp)
      fs.renameSync(tmp, outFile)
    }
    return `${mediaBase.replace(/\/$/, '')}/uploads/og/${key}.jpg`
  } catch (err) {
    console.warn('[og] could not build JPEG preview for', imageUrl, err)
    return imageUrl
  }
}
