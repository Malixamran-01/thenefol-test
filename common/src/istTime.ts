/**
 * India Standard Time helpers for admin date pickers. IST is UTC+05:30 all year (no DST), so
 * an admin's "12:00 AM" means midnight in India whatever time zone their browser is in.
 */
const IST_OFFSET_MS = 330 * 60 * 1000
const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-11-19T00:00" (a datetime-local value read as IST) → ISO instant, or null if invalid. */
export function istLocalToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(local || '').trim())
  if (!m) return null
  const [, y, mo, d, h, mi] = m.map(Number)
  const utc = Date.UTC(y, mo - 1, d, h, mi) - IST_OFFSET_MS
  const check = new Date(utc + IST_OFFSET_MS)
  // Reject impossible dates such as 2026-02-31
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null
  return new Date(utc).toISOString()
}

/** ISO instant → "YYYY-MM-DDTHH:mm" in IST (for a datetime-local input). */
export function isoToIstLocal(iso: string | Date): string {
  const t = new Date(iso).getTime() + IST_OFFSET_MS
  const d = new Date(t)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

/** 12:00 AM IST at the start of the day `days` after today (IST): 1 = tonight's midnight. */
export function istMidnightInDays(days: number, now: Date = new Date()): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  const utc = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + days) - IST_OFFSET_MS
  return new Date(utc).toISOString()
}

/** "19 Nov 2026, 12:00 am IST" */
export function formatIst(iso: string | Date): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '–'
  return `${d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })} IST`
}
