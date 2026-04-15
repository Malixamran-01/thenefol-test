/**
 * One-off helper: convert rigid flex header rows to admin-page-header vs admin-inline-row
 * based on whether an <h1>–<h3> appears soon after (page section header vs stat row).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.join(__dirname, '..', 'src')

function walkTsx(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walkTsx(p, acc)
    else if (ent.name.endsWith('.tsx')) acc.push(p)
  }
  return acc
}

function processContent(s, filePath) {
  let changed = false
  const next = s.replace(
    /className="flex items-center justify-between(?:\s+([^"]*))?"/g,
    (match, extra, offset, str) => {
      const rest = (extra || '').trim()
      const snippet = str.slice(offset, Math.min(offset + 600, str.length))
      const hasHeading = /<h[1-3][\s>]/.test(snippet)
      const cls = hasHeading ? 'admin-page-header' : 'admin-inline-row'
      const out = rest ? `className="${cls} ${rest}"` : `className="${cls}"`
      if (out !== match) changed = true
      return out
    }
  )
  const next2 = next.replace(
    /className="flex justify-between items-center(?:\s+([^"]*))?"/g,
    (match, extra, offset, str) => {
      const rest = (extra || '').trim()
      const snippet = str.slice(offset, Math.min(offset + 600, str.length))
      const hasHeading = /<h[1-3][\s>]/.test(snippet)
      const cls = hasHeading ? 'admin-page-header' : 'admin-inline-row'
      const out = rest ? `className="${cls} ${rest}"` : `className="${cls}"`
      return out !== match ? out : match
    }
  )
  const next3 = next2.replace(
    /className="flex justify-between items-start(?:\s+([^"]*))?"/g,
    (match, extra, offset, str) => {
      const rest = (extra || '').trim()
      const snippet = str.slice(offset, Math.min(offset + 600, str.length))
      const hasHeading = /<h[1-3][\s>]/.test(snippet)
      const cls = hasHeading ? 'admin-page-header' : 'admin-inline-row'
      const out = rest ? `className="${cls} ${rest}"` : `className="${cls}"`
      return out !== match ? out : match
    }
  )
  if (next3 !== s) changed = true
  return { text: next3, changed }
}

const files = [...walkTsx(path.join(srcRoot, 'pages')), ...walkTsx(path.join(srcRoot, 'components'))]
let n = 0
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8')
  const { text, changed } = processContent(raw, f)
  if (changed) {
    fs.writeFileSync(f, text)
    n++
    console.log('updated:', path.relative(srcRoot, f))
  }
}
console.log('files updated:', n)
