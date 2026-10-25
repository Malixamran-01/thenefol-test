/**
 * Web-optimisation for uploaded videos (product PDP media, CMS, etc).
 *
 * When ffmpeg/ffprobe are installed on the server (`sudo apt install ffmpeg`):
 *   - Already web-friendly H.264 MP4/MOV within limits → remux only (seconds):
 *     moves the `moov` atom to the front (`+faststart`) so playback starts
 *     before the whole file downloads.
 *   - Anything else (HEVC, 4K, very high bitrate, AVI, …) → transcode to
 *     H.264/AAC MP4, longest side ≤ VIDEO_MAX_DIMENSION, faststart.
 *   - Extracts a poster frame as WebP (`<name>.poster.webp`) so the PDP can
 *     show an instant thumbnail without downloading any video bytes.
 *
 * Without ffmpeg the original file is kept untouched (still streamable via
 * HTTP Range requests) and no poster is produced.
 *
 * Env:
 *   FFMPEG_PATH / FFPROBE_PATH   binary overrides (default: on PATH)
 *   VIDEO_MAX_DIMENSION          longest side in px (default 1280)
 *   VIDEO_CRF                    x264 quality, lower = better (default 26)
 *   VIDEO_MAX_BITRATE_KBPS       above this we re-encode (default 4000)
 */
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

const FFMPEG = process.env.FFMPEG_PATH?.trim() || 'ffmpeg'
const FFPROBE = process.env.FFPROBE_PATH?.trim() || 'ffprobe'
const MAX_DIM = Math.max(320, parseInt(process.env.VIDEO_MAX_DIMENSION || '1280', 10) || 1280)
const CRF = Math.min(40, Math.max(16, parseInt(process.env.VIDEO_CRF || '26', 10) || 26))
const MAX_BITRATE_KBPS = Math.max(500, parseInt(process.env.VIDEO_MAX_BITRATE_KBPS || '4000', 10) || 4000)
const JOB_TIMEOUT_MS = 10 * 60 * 1000

export const VIDEO_EXT_RE = /\.(mp4|webm|ogg|ogv|mov|m4v|avi)(\?|#|$)/i

export function isVideoFile(file: Pick<Express.Multer.File, 'mimetype' | 'originalname'>): boolean {
  return file.mimetype?.startsWith('video/') || VIDEO_EXT_RE.test(file.originalname || '')
}

function run(bin: string, args: string[], timeoutMs = JOB_TIMEOUT_MS): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`${bin} timed out after ${timeoutMs / 1000}s`))
    }, timeoutMs)
    child.stdout.on('data', (d) => { stdout += d })
    // ffmpeg is chatty on stderr — keep only the tail for error messages
    child.stderr.on('data', (d) => { stderr = (stderr + d).slice(-4000) })
    child.on('error', (err) => { clearTimeout(timer); reject(err) })
    child.on('close', (code) => { clearTimeout(timer); resolve({ code: code ?? 1, stdout, stderr }) })
  })
}

let ffmpegAvailable: Promise<boolean> | null = null
export function hasFfmpeg(): Promise<boolean> {
  if (!ffmpegAvailable) {
    ffmpegAvailable = Promise.all([run(FFMPEG, ['-version'], 10000), run(FFPROBE, ['-version'], 10000)])
      .then(([a, b]) => a.code === 0 && b.code === 0)
      .catch(() => false)
      .then((ok) => {
        if (!ok) {
          console.warn('[video] ffmpeg/ffprobe not found — uploaded videos are stored as-is (no faststart/poster). Install with: sudo apt install ffmpeg')
        }
        return ok
      })
  }
  return ffmpegAvailable
}

// Transcoding is CPU-heavy: run one job at a time so shoppers' requests aren't starved.
let queue: Promise<unknown> = Promise.resolve()
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job)
  queue = next.catch(() => undefined)
  return next
}

type ProbeInfo = { vcodec?: string; acodec?: string; width: number; height: number; bitrateKbps: number; formatName: string }

async function probe(filePath: string): Promise<ProbeInfo | null> {
  const { code, stdout } = await run(FFPROBE, [
    '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', filePath,
  ], 60000)
  if (code !== 0) return null
  try {
    const data = JSON.parse(stdout)
    const streams: any[] = data.streams || []
    const v = streams.find((s) => s.codec_type === 'video')
    const a = streams.find((s) => s.codec_type === 'audio')
    if (!v) return null
    // Rotated phone videos report pre-rotation dimensions; max() covers both orientations
    const width = Number(v.width) || 0
    const height = Number(v.height) || 0
    const bitrate = Number(data.format?.bit_rate) || Number(v.bit_rate) || 0
    return {
      vcodec: v.codec_name,
      acodec: a?.codec_name,
      width,
      height,
      bitrateKbps: Math.round(bitrate / 1000),
      formatName: String(data.format?.format_name || ''),
    }
  } catch {
    return null
  }
}

function safeUnlink(p: string) {
  try { fs.unlinkSync(p) } catch { /* ignore */ }
}

/**
 * Optimise a multer-written video in place. Mutates `file.filename`, `file.path`,
 * `file.mimetype`, `file.size` when the output name changes (e.g. .mov → .mp4).
 * Returns the poster filename (same directory) when one was produced.
 * Never throws — on any failure the original upload is kept as-is.
 */
export async function optimizeUploadedVideo(file: Express.Multer.File): Promise<{ poster: string | null }> {
  if (!(await hasFfmpeg())) return { poster: null }

  return enqueue(async () => {
    const dir = path.dirname(file.path)
    const base = path.basename(file.filename, path.extname(file.filename))
    const finalName = `${base}.mp4`
    const finalPath = path.join(dir, finalName)
    const tmpPath = path.join(dir, `${base}.tmp-${process.pid}-${Date.now()}.mp4`)
    const posterName = `${base}.poster.webp`
    const posterPath = path.join(dir, posterName)
    const posterTmp = path.join(dir, `${base}.poster.tmp.jpg`)

    try {
      const info = await probe(file.path)
      if (!info) {
        console.warn(`[video] ffprobe could not read ${file.filename} — keeping original`)
        return { poster: null }
      }

      const isWebm = /webm/.test(info.formatName)
      const longest = Math.max(info.width, info.height)
      const canRemux =
        info.vcodec === 'h264' &&
        (!info.acodec || info.acodec === 'aac' || info.acodec === 'mp3') &&
        longest <= MAX_DIM &&
        (info.bitrateKbps === 0 || info.bitrateKbps <= MAX_BITRATE_KBPS) &&
        /mp4|mov|m4a|3gp/.test(info.formatName)

      // Small VP8/VP9 WebM within limits is already web-optimised — leave it alone.
      const keepWebm = isWebm && longest <= MAX_DIM && (info.bitrateKbps === 0 || info.bitrateKbps <= MAX_BITRATE_KBPS)

      if (!keepWebm) {
        const scale = `scale='if(gt(iw,ih),min(${MAX_DIM},iw),-2)':'if(gt(iw,ih),-2,min(${MAX_DIM},ih))'`
        const args = canRemux
          ? ['-y', '-i', file.path, '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', '-movflags', '+faststart', tmpPath]
          : [
              '-y', '-i', file.path,
              '-map', '0:v:0', '-map', '0:a:0?',
              '-vf', `${scale},format=yuv420p`,
              '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(CRF),
              '-maxrate', `${MAX_BITRATE_KBPS}k`, '-bufsize', `${MAX_BITRATE_KBPS * 2}k`,
              '-profile:v', 'high', '-threads', '2',
              '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
              '-movflags', '+faststart',
              tmpPath,
            ]
        const started = Date.now()
        const { code, stderr } = await run(FFMPEG, args)
        if (code !== 0 || !fs.existsSync(tmpPath)) {
          safeUnlink(tmpPath)
          console.warn(`[video] ffmpeg failed for ${file.filename} — keeping original\n${stderr}`)
          return { poster: await extractPoster(file.path, posterTmp, posterPath) ? posterName : null }
        }
        // Atomic swap: original → optimised .mp4 (same basename, URL decided before response)
        if (file.path !== finalPath) safeUnlink(file.path)
        fs.renameSync(tmpPath, finalPath)
        const stat = fs.statSync(finalPath)
        console.log(
          `[video] ${canRemux ? 'faststart remux' : 'transcoded'} ${file.originalname} ` +
          `${(file.size / 1048576).toFixed(1)}MB → ${(stat.size / 1048576).toFixed(1)}MB in ${((Date.now() - started) / 1000).toFixed(1)}s`
        )
        file.filename = finalName
        file.path = finalPath
        file.mimetype = 'video/mp4'
        file.size = stat.size
      }

      const ok = await extractPoster(file.path, posterTmp, posterPath)
      return { poster: ok ? posterName : null }
    } catch (err) {
      safeUnlink(tmpPath)
      safeUnlink(posterTmp)
      console.warn(`[video] optimisation error for ${file.filename} — keeping original`, err)
      return { poster: null }
    }
  })
}

async function extractPoster(videoPath: string, tmpJpg: string, outWebp: string): Promise<boolean> {
  try {
    // Seek a little in to skip black first frames; fall back to frame 0 for very short clips
    for (const ss of ['0.5', '0']) {
      const { code } = await run(FFMPEG, [
        '-y', '-ss', ss, '-i', videoPath, '-frames:v', '1',
        '-vf', `scale='if(gt(iw,ih),min(${MAX_DIM},iw),-2)':'if(gt(iw,ih),-2,min(${MAX_DIM},ih))'`,
        '-q:v', '3', tmpJpg,
      ], 60000)
      if (code === 0 && fs.existsSync(tmpJpg) && fs.statSync(tmpJpg).size > 0) break
    }
    if (!fs.existsSync(tmpJpg)) return false
    await sharp(tmpJpg).webp({ quality: 78 }).toFile(outWebp)
    return true
  } catch (err) {
    console.warn('[video] poster extraction failed', err)
    return false
  } finally {
    safeUnlink(tmpJpg)
  }
}

/** Delete an uploaded video and its poster from disk (used when a product video is removed). */
export function deleteUploadedVideo(uploadsRoot: string, url: string | null | undefined): void {
  if (!url || !VIDEO_EXT_RE.test(url)) return
  const m = String(url).match(/\/uploads\/([^?#]+)$/)
  if (!m) return
  let rel: string
  try { rel = decodeURIComponent(m[1]) } catch { rel = m[1] }
  const resolvedRoot = path.resolve(uploadsRoot)
  const target = path.resolve(resolvedRoot, rel)
  // Never escape the uploads root
  if (!target.startsWith(resolvedRoot + path.sep)) return
  safeUnlink(target)
  const base = target.slice(0, target.length - path.extname(target).length)
  safeUnlink(`${base}.poster.webp`)
}
