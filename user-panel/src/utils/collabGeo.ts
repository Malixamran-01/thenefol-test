/**
 * Collab address + phone country data (sync, Safari-safe).
 * Replaces dynamic `country-state-city` import which failed to load in production.
 */
import { allCountries as regionRows } from 'country-region-data'
import worldCountries from 'world-countries'

export type CollabCountry = {
  isoCode: string
  name: string
  phonecode: string
}

export type CollabState = {
  isoCode: string
  name: string
}

function normalizePhoneCode(cca2: string): string {
  const row = worldCountries.find((c) => c.cca2 === cca2)
  if (!row?.idd?.root) return ''
  const root = row.idd.root.replace(/\D/g, '')
  const suffix = row.idd.suffixes?.[0]?.replace(/\D/g, '') ?? ''
  return `${root}${suffix}`
}

const phoneByIso = new Map<string, string>()
for (const c of worldCountries) {
  if (!c.cca2) continue
  phoneByIso.set(c.cca2, normalizePhoneCode(c.cca2))
}

let cachedCountries: CollabCountry[] | null = null

/** All countries for dropdowns (sorted by name). */
export function getCollabCountries(): CollabCountry[] {
  if (cachedCountries) return cachedCountries
  cachedCountries = regionRows
    .map(([name, iso]) => ({
      isoCode: iso,
      name,
      phonecode: phoneByIso.get(iso) ?? '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return cachedCountries
}

/** States / provinces for a country ISO2 code. */
export function getCollabStates(countryCode: string): CollabState[] {
  if (!countryCode) return []
  const row = regionRows.find(([, iso]) => iso === countryCode)
  if (!row?.[2]?.length) return []
  return row[2]
    .map(([name, slug]) => ({
      isoCode: slug || name,
      name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
