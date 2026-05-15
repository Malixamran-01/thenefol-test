#!/usr/bin/env node
/**
 * Print minified source context around column positions in the latest bootstrapApp bundle.
 *
 * Usage (from repo root):
 *   node scripts/findBundleLine.mjs 3243 51054 85122
 *   npm run debug:bundle -- 3243 51054 85122
 *
 * Column numbers are 1-based (same as browser stack traces).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CONTEXT_RADIUS = 40
const BUNDLE_GLOB_PREFIX = 'bootstrapApp-'
const BUNDLE_GLOB_SUFFIX = '.js'

const SEARCH_ROOTS = [
  path.join(repoRoot, 'user-panel', 'dist', 'assets'),
  path.join(repoRoot, 'dist', 'assets'),
]

function walkJsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkJsFiles(full, out)
    } else if (
      entry.isFile() &&
      entry.name.startsWith(BUNDLE_GLOB_PREFIX) &&
      entry.name.endsWith(BUNDLE_GLOB_SUFFIX)
    ) {
      out.push(full)
    }
  }
  return out
}

function findLatestBootstrapBundle() {
  const candidates = SEARCH_ROOTS.flatMap((root) => walkJsFiles(root))
  if (candidates.length === 0) {
    throw new Error(
      `No ${BUNDLE_GLOB_PREFIX}*${BUNDLE_GLOB_SUFFIX} under:\n` +
        SEARCH_ROOTS.map((p) => `  - ${p}`).join('\n') +
        '\nRun: npm run build:user'
    )
  }
  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  return candidates[0]
}

function parseColumns(argv) {
  const cols = []
  for (const arg of argv) {
    if (arg === '--0-based') continue
    if (arg.startsWith('-')) {
      console.error(`Unknown flag: ${arg}`)
      process.exit(1)
    }
    const n = Number(arg)
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      console.error(`Invalid column (expected non-negative integer): ${arg}`)
      process.exit(1)
    }
    cols.push(n)
  }
  if (cols.length === 0) {
    console.error('Usage: node scripts/findBundleLine.mjs [--0-based] <column> [column...]')
    console.error('Example: node scripts/findBundleLine.mjs 3243 51054 85122')
    process.exit(1)
  }
  return cols
}

function snippetAt(source, columnOneBased, radius = CONTEXT_RADIUS) {
  const len = source.length
  const col0 = columnOneBased - 1
  if (col0 < 0 || col0 >= len) {
    return {
      columnOneBased,
      length: len,
      inRange: false,
      before: '',
      at: '',
      after: '',
      window: `(column ${columnOneBased} out of range; file length ${len})`,
    }
  }

  const start = Math.max(0, col0 - radius)
  const end = Math.min(len, col0 + radius)
  const window = source.slice(start, end)
  const pointer = ' '.repeat(col0 - start) + '^'

  return {
    columnOneBased,
    length: len,
    inRange: true,
    start,
    end,
    before: source.slice(start, col0),
    at: source[col0],
    after: source.slice(col0 + 1, end),
    window,
    pointer,
  }
}

function main() {
  const zeroBased = process.argv.includes('--0-based')
  const columnsRaw = parseColumns(process.argv.slice(2).filter((a) => a !== '--0-based'))
  const columns = columnsRaw.map((c) => (zeroBased ? c + 1 : c))

  const bundlePath = findLatestBootstrapBundle()
  const source = fs.readFileSync(bundlePath, 'utf8')
  const stat = fs.statSync(bundlePath)

  console.log(`Bundle: ${bundlePath}`)
  console.log(`Size: ${source.length} chars | Modified: ${stat.mtime.toISOString()}`)
  console.log(`Columns: 1-based${zeroBased ? ' (input was 0-based)' : ''}\n`)

  for (const col of columns) {
    const s = snippetAt(source, col)
    console.log(`--- column ${col} ---`)
    if (!s.inRange) {
      console.log(s.window)
      console.log()
      continue
    }
    console.log(`range: [${s.start}..${s.end}) (${s.end - s.start} chars, ±${CONTEXT_RADIUS} around col)`)
    console.log(s.window)
    console.log(s.pointer)
    console.log(
      `char at column: ${JSON.stringify(s.at)} (U+${s.at.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`
    )
    console.log()
  }
}

main()
