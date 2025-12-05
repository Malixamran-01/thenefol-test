import { useMemo, useState } from 'react'

type Store = {
  id: string
  name: string
  city: string
  state: string
  address: string
  phone: string
  hours: string
  services: string[]
  latitude: number
  longitude: number
}

const stores: Store[] = [
  {
    id: 'delhi-sakon',
    name: 'Nefol Experience Studio, Saket',
    city: 'New Delhi',
    state: 'Delhi',
    address: 'Select CITYWALK, 1st Floor, Saket, New Delhi – 110017',
    phone: '+91-70429-12345',
    hours: '11 AM – 9 PM (All days)',
    services: ['Skin diagnostic bar', 'Quick facial cabin', 'Gift concierge'],
    latitude: 28.528594,
    longitude: 77.219299
  },
  {
    id: 'mumbai-bandra',
    name: 'Nefol Botanical Lab, Bandra',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Pali Hill Road, Bandra West, Mumbai – 400050',
    phone: '+91-83694-56789',
    hours: '11 AM – 10 PM (Tue–Sun)',
    services: ['Mix-your-mask counter', 'Loyalty redemption', 'Refill station'],
    latitude: 19.06122,
    longitude: 72.83364
  },
  {
    id: 'blr-orion',
    name: 'Nefol Rituals, Orion Mall',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Orion Mall, 2nd Floor, Rajajinagar, Bengaluru – 560055',
    phone: '+91-99007-33445',
    hours: '10:30 AM – 9:30 PM (All days)',
    services: ['Ayurvedic consultation', 'Hair & scalp analysis', 'Workshops every weekend'],
    latitude: 13.01259,
    longitude: 77.55091
  },
  {
    id: 'kolkata-quest',
    name: 'Nefol Atelier, Quest Mall',
    city: 'Kolkata',
    state: 'West Bengal',
    address: 'Quest Mall, Park Circus, Kolkata – 700017',
    phone: '+91-81000-56780',
    hours: '11 AM – 8:30 PM (All days)',
    services: ['Makeup bar', 'Shade finder kiosk', 'Gift personalization'],
    latitude: 22.5414,
    longitude: 88.3639
  }
]

export default function StoreLocator() {
  const [query, setQuery] = useState('')
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(stores[0]?.id ?? null)

  const filteredStores = useMemo(() => {
    if (!query.trim()) return stores
    const q = query.toLowerCase()
    return stores.filter(store =>
      [store.name, store.city, store.state].some(value => value.toLowerCase().includes(q))
    )
  }, [query])

  const selectedStore = stores.find(store => store.id === selectedStoreId) ?? stores[0]

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-600">
            Store Locator
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            Experience Nefol Near You
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
            Book in-store consultations, refill your favourites, or pick up online orders—just like Forest Essentials boutiques and Sugar Cosmetics kiosks across India.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search City or Store</label>
              <input
                type="text"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="e.g. Mumbai, Bengaluru, Bandra"
                className="mt-2 w-full rounded-full border border-slate-200 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <ul className="space-y-3">
              {filteredStores.map(store => (
                <li key={store.id}>
                  <button
                    onClick={() => setSelectedStoreId(store.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition hover:border-slate-900 hover:bg-white ${
                      store.id === selectedStoreId
                        ? 'border-slate-900 bg-white shadow-sm'
                        : 'border-slate-200 bg-white/70'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{store.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                      {store.city}, {store.state}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{store.address}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">{selectedStore.name}</h2>
              <p className="mt-2 text-sm text-slate-600">{selectedStore.address}</p>
              <div className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timings</p>
                  <p className="mt-1">{selectedStore.hours}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Call</p>
                  <a href={`tel:${selectedStore.phone}`} className="mt-1 inline-block text-slate-900">
                    {selectedStore.phone}
                  </a>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available Services</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedStore.services.map(service => (
                    <span
                      key={service}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedStore.latitude},${selectedStore.longitude}`)}
                  className="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Get Directions
                </button>
                <button
                  onClick={() => (window.location.hash = '#/user/checkout')}
                  className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                >
                  Reserve In-Store Pickup
                </button>
              </div>
            </div>

            <div className="h-72 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              <iframe
                title="Store Map"
                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD-example&zoom=13&q=${selectedStore.latitude},${selectedStore.longitude}`}
                className="h-full w-full"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Nefol Pop-Up Calendar</h2>
            <p className="mt-2 text-slate-600">
              Inspired by Lakmé pop-ups and Sugar Cosmetics vanity vans, explore upcoming pop-ups for masterclasses and quick makeovers.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nov 9–10, 2025</p>
              <p className="mt-1 font-semibold text-slate-900">Phoenix Palladium Courtyard, Mumbai</p>
              <p className="mt-1 text-xs text-slate-500">Live mixology bar • Conscious gifting workshop • Exclusive minis</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nov 23, 2025</p>
              <p className="mt-1 font-semibold text-slate-900">Orion Mall Atrium, Bengaluru</p>
              <p className="mt-1 text-xs text-slate-500">Morning yoga + skincare ritual • Fresh juice shots</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}


