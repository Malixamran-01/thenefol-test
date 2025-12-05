const pressFeatures = [
  {
    outlet: 'Vogue India',
    headline: '“Nefol brings blue tea adaptogens to modern skincare rituals.”',
    date: 'Oct 2025',
    link: '#'
  },
  {
    outlet: 'Elle India',
    headline: '“Meet the Indian beauty brand elevating slow beauty.”',
    date: 'Sep 2025',
    link: '#'
  },
  {
    outlet: 'YourStory',
    headline: '“How Nefol is building a circular ecosystem for botanicals.”',
    date: 'Aug 2025',
    link: '#'
  }
]

const mediaAssets = [
  {
    title: 'Brand Story Deck',
    description: 'Overview of Nefol’s philosophy, botanicals, and key metrics.',
    size: '8 MB',
    link: '#'
  },
  {
    title: 'Product Imagery Pack',
    description: 'High-res visuals of hero products, textures, and campaign stills.',
    size: '22 MB',
    link: '#'
  },
  {
    title: 'Founder Portraits',
    description: 'Press-ready headshots and candid shots from the lab.',
    size: '5 MB',
    link: '#'
  }
]

const contactCards = [
  {
    title: 'PR & Collaborations',
    person: 'Aisha Kapoor',
    email: 'press@nefol.com',
    phone: '+91-98100-12345'
  },
  {
    title: 'Influencer Partnerships',
    person: 'Rahul Menon',
    email: 'creator@nefol.com',
    phone: '+91-96633-56789'
  }
]

export default function PressMedia() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 py-12">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-4 py-1 text-sm font-semibold text-indigo-600">
            Press & Media
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            Nefol In The News
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-lg text-slate-600">
            Inspired by the media lounges of Lakmé and Sugar Cosmetics, explore press mentions, campaign highlights, and media resources.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {pressFeatures.map(feature => (
            <article
              key={feature.headline}
              className="flex h-full flex-col rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{feature.outlet}</p>
              <h2 className="mt-3 text-lg font-semibold text-slate-900">{feature.headline}</h2>
              <p className="mt-2 text-xs text-slate-500">{feature.date}</p>
              <a
                href={feature.link}
                className="mt-auto inline-flex items-center text-sm font-semibold text-indigo-600 transition hover:text-indigo-500"
              >
                Read Article →
              </a>
            </article>
          ))}
        </section>

        <section className="mt-16 rounded-3xl border border-indigo-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Media Asset Library</h2>
          <p className="mt-2 text-sm text-slate-600">
            Download ready-to-use assets for editorials, social collaborations, and retail partnerships.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {mediaAssets.map(asset => (
              <div
                key={asset.title}
                className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-slate-600"
              >
                <p className="font-semibold text-slate-900">{asset.title}</p>
                <p className="mt-2 text-xs text-slate-500">{asset.description}</p>
                <p className="mt-2 text-xs text-slate-400">{asset.size}</p>
                <button
                  onClick={() => window.open(asset.link)}
                  className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-slate-100"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 rounded-3xl border border-indigo-200 bg-slate-900 p-8 text-white md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">Looking To Collaborate?</h2>
            <p className="mt-3 text-slate-200">
              Reach out for interviews, product features, or campaign partnerships. Our team responds within 24 hours.
            </p>
          </div>
          <div className="space-y-3">
            {contactCards.map(card => (
              <div key={card.title} className="rounded-2xl bg-white/10 p-4 text-sm text-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{card.title}</p>
                <p className="mt-1 text-base font-semibold text-white">{card.person}</p>
                <p className="mt-1 text-xs">{card.email} · {card.phone}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}


