import { useMemo, useState } from 'react'

interface QuizAnswer {
  questionId: string
  value: string
}

interface RoutineSuggestion {
  id: string
  title: string
  description: string
  morning: string[]
  evening: string[]
  keyIngredients: string[]
  recommendedSlug?: string
}

const routines: RoutineSuggestion[] = [
  {
    id: 'oily-congestion',
    title: 'Clarifying & Balancing Routine',
    description:
      'Inspired by Minimalist’s salicylic rituals and Plum’s green tea range—designed to manage congestion and control shine without stripping.',
    morning: ['Blue Tea Gel Cleanser', 'Balancing Mist', 'Niacinamide + Zinc Serum', 'Aqua-Light Moisturiser', 'Mineral SPF 50'],
    evening: ['Gentle Jelly Cleanser', '2% Salicylic Treatment', 'Barrier Repair Serum', 'Mattifying Sleep Gel'],
    keyIngredients: ['Salicylic Acid', 'Green Tea Polyphenols', 'Niacinamide', 'Cica'],
    recommendedSlug: 'clarifying-balancing-kit'
  },
  {
    id: 'dry-dull',
    title: 'Hydrating & Glow Ritual',
    description:
      'Think Forest Essentials’ glow duos and Kama Ayurveda elixirs—deep hydration layered with botanical oils for luminosity.',
    morning: ['Cream Cleanser', 'Blue Tea Hydrosol', 'Vitamin C + Peptide Serum', 'Hydra-Crème', 'Dewy Sunscreen'],
    evening: ['Oil Cleanser', 'Rice Water Toner', '0.5% Retinal Serum (3x/week)', 'Overnight Sleeping Mask'],
    keyIngredients: ['Hyaluronic Acid', 'Saffron', 'Licorice', 'Retinal'],
    recommendedSlug: 'hydrating-glow-regimen'
  },
  {
    id: 'sensitive-barrier',
    title: 'Barrier-First Sensitive Routine',
    description:
      'Calming, fragrance-free routine inspired by Clinique Moisture Surge and Minimalist barrier range—ideal for reactive skin.',
    morning: ['Cream-to-Foam Cleanser', 'Centella Mist', 'Ceramide Serum', 'Barrier Cream', 'Mineral SPF 50'],
    evening: ['Milky Cleanser', 'Polyglutamic Essence', '1% Beta-Glucan Booster', 'Repair Balm'],
    keyIngredients: ['Centella', 'Ceramides', 'Beta-Glucan', 'Oat'],
    recommendedSlug: 'sensitive-skin-ritual'
  }
]

const questions = [
  {
    id: 'skin-type',
    title: 'Describe Your Current Skin Type',
    options: [
      { value: 'oily', label: 'Oily / Combination' },
      { value: 'dry', label: 'Dry / Dehydrated' },
      { value: 'normal', label: 'Normal / Balanced' },
      { value: 'sensitive', label: 'Sensitive / Reactive' }
    ]
  },
  {
    id: 'concern',
    title: 'Top Concern To Address',
    options: [
      { value: 'acne', label: 'Acne / Congestion' },
      { value: 'dullness', label: 'Dullness / Uneven Tone' },
      { value: 'aging', label: 'Fine Lines / Firmness' },
      { value: 'sensitivity', label: 'Redness / Sensitivities' }
    ]
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle Impact',
    options: [
      { value: 'outdoor', label: 'Mostly Outdoors / Pollution Exposure' },
      { value: 'desk', label: 'Indoor / AC Environments' },
      { value: 'travel', label: 'Frequent Traveller' },
      { value: 'new-parent', label: 'Postpartum / New Parent' }
    ]
  },
  {
    id: 'routine',
    title: 'Routine Comfort Level',
    options: [
      { value: 'minimal', label: '3-step minimalist' },
      { value: 'balanced', label: '5-step balanced' },
      { value: 'elaborate', label: '7+ step elaborate rituals' }
    ]
  }
]

export default function SkinQuiz() {
  const [answers, setAnswers] = useState<QuizAnswer[]>([])

  const updateAnswer = (questionId: string, value: string) => {
    setAnswers(prev => {
      const existing = prev.find(answer => answer.questionId === questionId)
      if (existing) {
        return prev.map(answer => (answer.questionId === questionId ? { ...answer, value } : answer))
      }
      return [...prev, { questionId, value }]
    })
  }

  const result = useMemo(() => {
    const skinType = answers.find(answer => answer.questionId === 'skin-type')?.value
    const concern = answers.find(answer => answer.questionId === 'concern')?.value

    if ((skinType === 'oily' && concern === 'acne') || concern === 'acne') {
      return routines[0]
    }
    if (skinType === 'sensitive' || concern === 'sensitivity') {
      return routines[2]
    }
    if (skinType === 'dry' || concern === 'dullness') {
      return routines[1]
    }
    return routines[1]
  }, [answers])

  const completion = Math.round((answers.length / questions.length) * 100)

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50 py-12">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-600">
            Skin Quiz
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            Build Your Nefol Ritual
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
            Inspired by skincare diagnostics from Minimalist, Clinique Skin School, and Plum Skin Analyzer, answer a few questions to uncover your bespoke ritual.
          </p>
        </header>

        <section className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:grid-cols-2">
          <div className="space-y-6">
            {questions.map(question => (
              <div key={question.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-sm font-semibold text-slate-900">{question.title}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {question.options.map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateAnswer(question.id, option.value)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        answers.find(answer => answer.questionId === question.id)?.value === option.value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-600">
              <p className="font-semibold uppercase tracking-wide text-emerald-700">Progress</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-emerald-600">{completion}% complete</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Ritual</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{result.title}</h2>
            <p className="mt-3 text-sm text-slate-600">{result.description}</p>

            <div className="mt-6 rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Morning</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {result.morning.map(step => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evening</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {result.evening.map(step => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Key Ingredients</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.keyIngredients.map(ingredient => (
                  <span
                    key={ingredient}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => result.recommendedSlug && (window.location.hash = `#/user/product/${result.recommendedSlug}`)}
              className="mt-6 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              View Recommended Kit
            </button>

            <div className="mt-6 rounded-2xl bg-white p-4 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Prefer Expert Guidance?</p>
              <p className="mt-1">
                Book a personalised consultation—mirroring WOW Skin Science’s skin analyzer—to review your lifestyle and tailor active percentages.
              </p>
              <button
                onClick={() => (window.location.hash = '#/user/community')}
                className="mt-3 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              >
                Join Community Session
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}


