import { useMemo } from 'react'
import { useCart } from '../contexts/CartContext'

const giftingCollections = [
  {
    id: 'festive-rituals',
    title: 'Festive Rituals',
    description:
      'Curated spa-inspired routines featuring blue tea, saffron, and moringa actives—perfect for Diwali and wedding gifting.',
    price: '₹2,499',
    perks: ['Complimentary gift wrap', 'Personalised message card', 'Earn 250 Nefol Coins'],
    image: '/IMAGES/gifting-festive.jpg'
  },
  {
    id: 'self-care-edit',
    title: 'Self-Care Edit',
    description:
      'An at-home facial ritual with cleanser, toner, concentrate, and sleeping mask inspired by Minimalist’s regimen kits.',
    price: '₹1,799',
    perks: ['Auto-replenish option', 'Eligible for Subscribe & Save', 'Ships with travel minis'],
    image: '/IMAGES/gifting-selfcare.jpg'
  },
  {
    id: 'ayurvedic-luxury',
    title: 'Ayurvedic Luxury Trunk',
    description:
      'Handcrafted brass vanity trunk with oils, ubtan, and incense reminiscent of Forest Essentials’ Trousseau trunk.',
    price: '₹4,999',
    perks: ['Limited edition packaging', 'Invitation to Nefol Lounge webinar', 'Premium tote included'],
    image: '/IMAGES/gifting-ayurveda.jpg'
  }
]

const addOns = [
  {
    id: 'wrap',
    title: 'Heritage Wrap',
    description: 'Reusable banana-fibre cloth wrap with hand-block prints from Jaipur artisans.',
    price: '₹149'
  },
  {
    id: 'engraving',
    title: 'Box Engraving',
    description: 'Gold foiled initials or monogram on keepsake boxes—delivered within 5 working days.',
    price: '₹199'
  },
  {
    id: 'note',
    title: 'Handwritten Note',
    description: 'Curated poetry or personalised notes penned by our in-house storytellers.',
    price: 'Complimentary'
  }
]

export default function Gifting() {
  const { items } = useCart()

  const giftableItems = useMemo(() => {
    return items.filter(item => (item.category || '').toLowerCase().includes('combo'))
  }, [items])

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-rose-50 to-amber-50 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center rounded-full bg-rose-100 px-4 py-1 text-sm font-semibold text-rose-600">
            Gifting Studio
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            Curate Your Luxe Gift Experience
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
            Inspired by the gift boutiques of Forest Essentials, Kama Ayurveda, and Plum, craft meaningful rituals wrapped in sustainable elegance.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {giftingCollections.map(collection => (
            <article
              key={collection.id}
              className="flex h-full flex-col overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-48 overflow-hidden bg-rose-50">
                <img
                  src={collection.image}
                  alt={collection.title}
                  className="h-full w-full object-cover"
                  onError={event => {
                    const target = event.currentTarget
                    target.style.display = 'none'
                  }}
                />
                <span className="absolute right-5 top-5 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Curated
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h2 className="text-xl font-semibold text-slate-900">{collection.title}</h2>
                <p className="mt-3 text-sm text-slate-600">{collection.description}</p>
                <p className="mt-4 text-lg font-semibold text-slate-900">{collection.price}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-500">
                  {collection.perks.map(perk => (
                    <li key={perk} className="flex items-start gap-2">
                      <span aria-hidden className="mt-1 h-2 w-2 rounded-full bg-rose-400" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                  <button
                    onClick={() => (window.location.hash = '#/user/cart')}
                    className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Build This Gift
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-16 grid gap-8 rounded-3xl border border-rose-100 bg-white p-8 shadow-sm md:grid-cols-5">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-semibold text-slate-900">Complete the Gesture</h2>
            <p className="mt-2 text-slate-600">
              Select from artisan add-ons inspired by WOW Skin Science’s personalised gifting hub.
            </p>
          </div>
          <div className="md:col-span-3 grid gap-4">
            {addOns.map(addOn => (
              <div
                key={addOn.id}
                className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-slate-600"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">{addOn.title}</h3>
                  <span className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                    {addOn.price}
                  </span>
                </div>
                <p className="mt-2 text-slate-500">{addOn.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 rounded-3xl border border-rose-100 bg-slate-900 p-8 text-white md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">Need Help Curating?</h2>
            <p className="mt-3 text-slate-200">
              Book a 20-minute virtual consultation with our gifting concierge—similar to the personalised services by Kama Ayurveda—and craft bespoke rituals for weddings, baby showers, or corporate hampers.
            </p>
          </div>
          <form className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-200 focus:border-white focus:outline-none"
            />
            <input
              type="email"
              placeholder="Email or phone"
              className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-200 focus:border-white focus:outline-none"
            />
            <textarea
              rows={3}
              placeholder="Tell us about the occasion"
              className="w-full rounded-3xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-200 focus:border-white focus:outline-none"
            />
            <button className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
              Request Consultation
            </button>
          </form>
        </section>

        {giftableItems.length > 0 && (
          <section className="mt-16 rounded-3xl border border-rose-100 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Gift-Ready In Your Cart</h2>
            <p className="mt-2 text-slate-600">
              We spotted combo products in your bag. Add custom wrap or notes before checkout.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {giftableItems.map(item => (
                <div
                  key={item.slug}
                  className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                    <span className="text-xs text-rose-500">Qty {item.quantity}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.category}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => (window.location.hash = '#/user/cart')}
              className="mt-6 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Proceed to Cart
            </button>
          </section>
        )}
      </div>
    </main>
  )
}


