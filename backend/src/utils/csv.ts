/**
 * RFC 4180 CSV parser: quoted fields may contain commas, doubled quotes ("") and line breaks.
 * Returns one object per record keyed by the trimmed header row; blank records are dropped.
 */
export function parseCSV(text: string): Record<string, string>[] {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const records: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQuotes = false

  const endRow = () => {
    row.push(cur)
    if (row.some(c => c.trim() !== '')) records.push(row)
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

  const [header, ...body] = records
  if (!header) return []
  const headers = header.map(h => h.trim())
  return body.map(cells => {
    const obj: Record<string, string> = {}
    headers.forEach((h, j) => { obj[h] = (cells[j] ?? '').trim() })
    return obj
  })
}
