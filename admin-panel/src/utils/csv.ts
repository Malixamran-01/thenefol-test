/**
 * RFC 4180 CSV parser. Handles quoted fields containing commas, doubled quotes ("") and
 * line breaks (Excel exports Alt+Enter cells as quoted multi-line values), CRLF/LF endings
 * and a leading UTF-8 BOM. Returns one string[] per record; blank records are dropped.
 */
export function parseCSVRows(text: string): string[][] {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQuotes = false

  const endRow = () => {
    row.push(cur)
    if (row.some(c => c.trim() !== '')) rows.push(row)
    row = []
    cur = ''
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++ } else inQuotes = false
      } else {
        cur += ch
      }
      continue
    }
    if (ch === '"') inQuotes = true
    else if (ch === ',') { row.push(cur); cur = '' }
    else if (ch === '\n') endRow()
    else if (ch === '\r') { if (text[i + 1] === '\n') i++; endRow() }
    else cur += ch
  }
  if (cur !== '' || row.length) endRow()
  return rows
}

/** Parses CSV text into objects keyed by the (trimmed) header row. */
export function parseCSV(text: string): Record<string, string>[] {
  const [header, ...body] = parseCSVRows(text)
  if (!header) return []
  const headers = header.map(h => h.trim())
  return body.map(cells => {
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = (cells[idx] ?? '').trim() })
    return row
  })
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
