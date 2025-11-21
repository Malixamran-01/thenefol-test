import { useMemo, useState } from 'react'

type Undertone = 'cool' | 'neutral' | 'warm'
type Coverage = 'light' | 'medium' | 'full'

interface ShadeRecommendation {
  name: string
  description: string
  undertone: Undertone
  intensity: 'fair' | 'light' | 'medium' | 'tan' | 'deep'
  finish: 'dewy' | 'natural' | 'matte'
  productSlug: string
}

const recommendations: ShadeRecommendation[] = [
  {
    name: 'Shade 01 Himalayan Pearl',
    description: 'Best for fair to light skin with cool undertones. Vitamin C brightens for a lit-from-within glow.',
    undertone: 'cool',
    intensity: 'light',
    finish: 'dewy',
    productSlug: 'radiant-veil-serum-foundation'
  },
  {
    name: 'Shade 06 Sundew Amber',
    description: 'Balanced for medium skin with neutral undertones. Adaptogens help blur imperfections.',
    undertone: 'neutral',
    intensity: 'medium',
    finish: 'natural',
    productSlug: 'adaptogen-skin-tint'
  },
  {
    name: 'Shade 10 Desert Sandalwood',
    description: 'Perfect for tan skin with warm undertones. Matte finish inspired by Sugar Cosmetics velvet base.',
    undertone: 'warm',
    intensity: 'tan',
    finish: 'matte',
    productSlug: 'matte-balance-complexion-elixir'
  },
  {
    name: 'Shade 14 Cocoa Nectar',
    description: 'Deep intensity with red-warm undertones; enriched with niacinamide for all-day comfort.',
    undertone: 'warm',
    intensity: 'deep',
    finish: 'natural',
    productSlug: 'hydra-serum-foundation'
  }
]

export default function ShadeFinder() {
  const [undertone, setUndertone] = useState<Undertone>('neutral')
  const [intensity, setIntensity] = useState<'fair' | 'light' | 'medium' | 'tan' | 'deep'>('medium')
  const [finish, setFinish] = useState<'dewy' | 'natural' | 'matte'>('natural')
  const [coverage, setCoverage] = useState<Coverage>('medium')

  const result = useMemo(() => {
    return (
      recommendations.find(
        rec => rec.undertone === undertone && rec.intensity === intensity && rec.finish === finish
      ) || recommendations.find(rec => rec.undertone === undertone) || recommendations[0]
    )
  }, [undertone, intensity, finish])

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-blue-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-600">
            Shade Finder
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            Find Your Perfect Complexion Match
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
            Inspired by Lakmé’s shade studio and Sugar Cosmetics’ shade finder, our 60-second quiz matches you with the ideal tone and finish.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <fieldset>
                <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Undertone
                </legend>
                <div className="mt-3 flex flex-wrap gap-3">
                  {(['cool', 'neutral', 'warm'] as Undertone[]).map(value => (
                    <button
                      key={value}
                      onClick={() => setUndertone(value)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                        undertone === value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Complexion Intensity
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(['fair', 'light', 'medium', 'tan', 'deep'] as const).map(value => (
                    <button
                      key={value}
                      onClick={() => setIntensity(value)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                        intensity === value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Desired Finish
                </legend>
                <div className="mt-3 flex flex-wrap gap-3">
                  {(['dewy', 'natural', 'matte'] as const).map(value => (
                    <button
                      key={value}
                      onClick={() => setFinish(value)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                        finish === value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Coverage Preference
                </legend>
                <div className="mt-3 flex flex-wrap gap-3">
                  {(['light', 'medium', 'full'] as Coverage[]).map(value => (
                    <button
                      key={value}
                      onClick={() => setCoverage(value)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                        coverage === value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Match</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{result.name}</h2>
              <p className="mt-3 text-sm text-slate-600">{result.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-xs text-slate-500">
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Undertone</dt>
                  <dd className="capitalize text-slate-700">{result.undertone}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Intensity</dt>
                  <dd className="capitalize text-slate-700">{result.intensity}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Finish</dt>
                  <dd className="capitalize text-slate-700">{result.finish}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Coverage</dt>
                  <dd className="capitalize text-slate-700">{coverage}</dd>
                </div>
              </dl>
              <button
                onClick={() => (window.location.hash = `#/user/product/${result.productSlug}`)}
                className="mt-6 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                View Recommended Product
              </button>

              <div className="mt-6 rounded-2xl bg-white p-4 text-xs text-slate-500">
                <p className="font-semibold text-slate-700">Pro Tips</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>Swipe two closest shades along your jawline and blend—pick the one that disappears.</li>
                  <li>Match base makeup to your neck for seamless coverage under natural light.</li>
                  <li>Need assistance? Book a virtual consult inspired by Kama Ayurveda skin consultations.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}


