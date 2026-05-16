import type { ICity, ICountry, IState } from 'country-state-city'

/** Minimal list if `country-state-city` fails to load on Safari. */
const FALLBACK_COUNTRIES: ICountry[] = [
  {
    isoCode: 'IN',
    name: 'India',
    phonecode: '91',
    flag: '🇮🇳',
    currency: 'INR',
    latitude: '20.5937',
    longitude: '78.9629',
  },
]

type GeoModule = typeof import('country-state-city')

let geoModulePromise: Promise<GeoModule> | null = null

function afterModuleReady<T>(work: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      try {
        resolve(work())
      } catch (err) {
        reject(err)
      }
    }
    if (typeof window !== 'undefined' && typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => run())
    } else {
      setTimeout(run, 0)
    }
  })
}

/** Single dynamic import; defer reading exports past Safari geo-vendor TDZ. */
function loadGeoModule(): Promise<GeoModule> {
  if (!geoModulePromise) {
    geoModulePromise = import('country-state-city')
      .then((mod) => afterModuleReady(() => mod))
      .catch((err) => {
        geoModulePromise = null
        throw err
      })
  }
  return geoModulePromise
}

export async function loadAllCountries(): Promise<ICountry[]> {
  try {
    const mod = await loadGeoModule()
    return await afterModuleReady(() => mod.Country.getAllCountries())
  } catch (err) {
    console.warn('[collabGeo] countries load failed, using fallback:', err)
    return FALLBACK_COUNTRIES
  }
}

export async function loadStatesForCountry(countryCode: string): Promise<IState[]> {
  try {
    const mod = await loadGeoModule()
    return await afterModuleReady(() => mod.State.getStatesOfCountry(countryCode))
  } catch (err) {
    console.warn('[collabGeo] states load failed:', err)
    return []
  }
}

export async function loadCitiesForState(countryCode: string, stateCode: string): Promise<ICity[]> {
  try {
    const mod = await loadGeoModule()
    return await afterModuleReady(() => mod.City.getCitiesOfState(countryCode, stateCode))
  } catch (err) {
    console.warn('[collabGeo] cities load failed:', err)
    return []
  }
}
