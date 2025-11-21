const pillars = [
  {
    title: 'Plant-Powered Formulations',
    description:
      'Our actives are derived from regenerative farms in Assam, Nilgiris, and Meghalaya, echoing Forest Essentials’ farm-to-bottle ethos and Minimalist’s clean labs.',
    items: ['100% vegetarian ingredients', 'No parabens, sulphates, or phthalates', 'Cruelty free & PETA aligned']
  },
  {
    title: 'Responsible Packaging',
    description:
      'Inspired by Kama Ayurveda’s glass bottles and Plum’s recycle program, our packaging is recyclable, refill-friendly, and mindfully sourced.',
    items: ['Glass or HDPE #2 vessels', 'Free refills at Nefol stores', 'Take-back program for empties']
  },
  {
    title: 'Community & Fair Trade',
    description:
      'We partner with women-led cooperatives for blue tea, moringa, and vetiver sourcing—ensuring traceability and ethical wages.',
    items: ['Direct farmer partnerships', '1% of revenue to skill-building', 'Transparent batch-level sourcing']
  }
]

const commitments = [
  {
    label: 'Carbon Neutral Deliveries',
    copy: 'We offset door-to-door emissions with verified mangrove restoration—mirroring WOW Skin Science’s sustainability drive.'
  },
  {
    label: 'Water Stewardship',
    copy: 'Closed-loop distillation reduces water waste by 40%. Rainwater harvesting fuels our manufacturing hubs.'
  },
  {
    label: 'Recycling Rewards',
    copy: 'Return five empties at any store and earn 300 Nefol Coins, similar to MAC Back-to-M·A·C.'
  }
]

export default function Sustainability() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100 py-12">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-600">
            Conscious Beauty
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            Sustainability & Ethics
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-lg text-slate-600">
            Inspired by India’s leading clean beauty brands, Nefol is committed to holistic sustainability—from sourcing botanicals to delivering your rituals.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {pillars.map(pillar => (
            <article
              key={pillar.title}
              className="flex h-full flex-col rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-slate-900">{pillar.title}</h2>
              <p className="mt-3 text-sm text-slate-600">{pillar.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-500">
                {pillar.items.map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span aria-hidden className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-16 rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Our 2025 Roadmap</h2>
          <p className="mt-2 text-sm text-slate-600">
            Benchmarked against Lakmé’s Responsible Care policy and Sugar Cosmetics’ sustainability announcements.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {commitments.map(commitment => (
              <div
                key={commitment.label}
                className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-slate-600"
              >
                <p className="font-semibold text-slate-900">{commitment.label}</p>
                <p className="mt-2 text-xs text-slate-500">{commitment.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 rounded-3xl border border-emerald-200 bg-slate-900 p-8 text-white md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">Supply Chain Transparency</h2>
            <p className="mt-3 text-slate-200">
              Track every batch from farm to formula. Scan the QR code on your packaging to see ingredient origins, harvest dates, and lab certifications.
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 text-sm text-slate-200">
            <p className="font-semibold text-white">Certifications in Progress</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>ECOCERT Cosmos Natural (Serum & Cleanser ranges)</li>
              <li>Leaping Bunny accreditation</li>
              <li>Forest Stewardship Council (FSC) packaging</li>
            </ul>
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Join the Circularity Loop</h2>
          <p className="mt-2 text-slate-600">
            Drop your empties at Nefol stores or mail them back. Earn coins, just like Plum’s Empties program.
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50/60 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">01. Return</p>
              <p className="mt-2 text-xs text-slate-500">Collect 5 cleaned empties and drop them at our stores or courier to us.</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/60 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">02. Reward</p>
              <p className="mt-2 text-xs text-slate-500">Earn 300 Nefol Coins or claim a mini deluxe size from the sustainability bar.</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/60 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">03. Repurpose</p>
              <p className="mt-2 text-xs text-slate-500">Packaging is cleaned, shredded, and turned into vanity organisers in partnership with circular design studios.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}


