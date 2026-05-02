import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getOptimizedImage } from '../utils/imageOptimizer'

type IngredientBase = {
  id: string
  name: string
  image: string
  description: string
  detailedInfo: string
}

type IngredientsScrollytellingProps<T extends IngredientBase> = {
  ingredients: T[]
  onNavigate: (ingredient: T) => void
  useMockImages?: boolean
}

export default function IngredientsScrollytelling<T extends IngredientBase>({
  ingredients,
  onNavigate,
  useMockImages = false
}: IngredientsScrollytellingProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [offset, setOffset] = useState(0)
  const stepRefs = useRef<Array<HTMLDivElement | null>>([])
  const sectionRef = useRef<HTMLDivElement | null>(null)

  // ── Colourful SVG mocks ──────────────────────────────────────────────────
  const mockImages = useMemo(() => {
    return ingredients.map((ingredient, index) => {
      const hue = (index * 33) % 360
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
          <defs>
            <linearGradient id="g${index}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="hsl(${hue},70%,65%)"/>
              <stop offset="100%" stop-color="hsl(${(hue + 40) % 360},70%,45%)"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g${index})"/>
          <circle cx="150" cy="160" r="90" fill="rgba(255,255,255,0.18)"/>
          <circle cx="760" cy="220" r="140" fill="rgba(255,255,255,0.12)"/>
          <circle cx="580" cy="980" r="220" fill="rgba(255,255,255,0.08)"/>
          <text x="60" y="700" font-family="Inter, Arial, sans-serif" font-size="60" fill="rgba(255,255,255,0.9)" letter-spacing="4">
            ${ingredient.name.replace(/&/g, 'and').slice(0, 22)}
          </text>
          <text x="60" y="780" font-family="Inter, Arial, sans-serif" font-size="30" fill="rgba(255,255,255,0.7)">
            Mock Image ${index + 1}
          </text>
        </svg>
      `
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    })
  }, [ingredients])

  // ── Scroll listener — no fixed positioning needed ────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    let ticking = false
    const handleScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        const viewportMid = window.innerHeight / 2

        const rects = stepRefs.current
          .map(el => el?.getBoundingClientRect())
          .filter(Boolean) as DOMRect[]

        if (!rects.length) { ticking = false; return }

        let closest = 0
        let minDist = Infinity
        rects.forEach((r, i) => {
          const d = Math.abs(r.top + r.height / 2 - viewportMid)
          if (d < minDist) { minDist = d; closest = i }
        })

        const cur  = rects[closest]
        const next = rects[closest + 1]
        let nextOffset = 0
        if (cur && next) {
          const cMid = cur.top  + cur.height  / 2
          const nMid = next.top + next.height / 2
          if (nMid !== cMid)
            nextOffset = Math.max(0, Math.min(1, (viewportMid - cMid) / (nMid - cMid)))
        }

        setCurrentIndex(closest)
        setOffset(nextOffset)
        ticking = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    handleScroll()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  const total = ingredients.length

  // ── Progress bar width ──────────────────────────────────────────────────
  const progressPct = total > 1
    ? ((currentIndex + offset) / (total - 1)) * 100
    : 100

  return (
    <div ref={sectionRef} className="relative w-full">

      {/* ── DESKTOP layout: sticky right panel ─────────────────────────── */}
      <div className="hidden md:block">
        {/* Thin progress bar at the very top of the section */}
        <div className="w-full h-0.5 bg-[#bfa45a]/15 mb-0">
          <div
            className="h-full bg-[#bfa45a] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="w-full">
          <div className="grid grid-cols-12 gap-6 xl:gap-10 items-start">

            {/* ── LEFT: scrollable text steps ────────────────────────── */}
            <div className="col-span-6 xl:col-span-7 relative">
              {/* vertical timeline line */}
              <div
                className="absolute left-5 top-0 bottom-0 w-px"
                style={{ background: 'linear-gradient(to bottom, transparent, #bfa45a40 8%, #bfa45a40 92%, transparent)' }}
              />

              {ingredients.map((ingredient, index) => {
                const isActive = index === currentIndex
                let textOpacity = 0.28
                let textScale   = 0.97

                if (isActive) {
                  textOpacity = 1
                  textScale   = 1
                } else if (index === currentIndex + 1) {
                  textOpacity = 0.28 + offset * 0.72
                  textScale   = 0.97 + offset * 0.03
                } else if (index === currentIndex - 1) {
                  textOpacity = 1 - (1 - offset) * 0.72
                  textScale   = 1 - (1 - offset) * 0.03
                }

                return (
                  <div
                    key={ingredient.id}
                    ref={el => { stepRefs.current[index] = el }}
                    className="relative flex items-center"
                    style={{ minHeight: '90vh', paddingTop: '5vh', paddingBottom: '5vh' }}
                  >
                    {/* Timeline dot */}
                    <div
                      className="absolute left-[14px] w-3 h-3 rounded-full transition-all duration-400 flex-shrink-0"
                      style={{
                        backgroundColor: isActive ? '#bfa45a' : 'rgba(191,164,90,0.25)',
                        boxShadow: isActive ? '0 0 0 4px rgba(191,164,90,0.18)' : 'none',
                        transform: isActive ? 'scale(1.25)' : 'scale(1)',
                        transition: 'all 0.3s ease',
                      }}
                    />

                    {/* Text content */}
                    <button
                      type="button"
                      onClick={() => onNavigate(ingredient)}
                      className="text-left w-full ml-12 focus:outline-none group"
                      style={{
                        opacity: textOpacity,
                        transform: `scale(${textScale})`,
                        transformOrigin: 'left center',
                        transition: 'opacity 0.15s linear, transform 0.15s linear',
                      }}
                    >
                      <p className="text-xs font-medium tracking-[0.2em] mb-2" style={{ color: '#bfa45a' }}>
                        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                      </p>

                      <h3
                        className="text-4xl lg:text-5xl font-bold mb-4 leading-tight transition-colors duration-300"
                        style={{ color: isActive ? '#bfa45a' : '#1a1a1a' }}
                      >
                        {ingredient.name}
                      </h3>

                      <div
                        className="text-base lg:text-lg font-light leading-relaxed max-w-lg"
                        style={{ color: '#666' }}
                        dangerouslySetInnerHTML={{
                          __html: ingredient.description
                            .split('\n')[0]
                            .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#333;font-weight:600">$1</strong>')
                        }}
                      />

                      <span
                        className="inline-flex items-center gap-2 mt-5 text-sm font-medium tracking-wider uppercase transition-opacity duration-200"
                        style={{ color: '#bfa45a', opacity: isActive ? 1 : 0, letterSpacing: '0.12em' }}
                      >
                        Read more
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>

            {/* ── RIGHT: sticky image panel ───────────────────────────── */}
            <div className="col-span-6 xl:col-span-5">
              {/*
                sticky: stays in view while the left column scrolls.
                top-20 = 80px, clears the h-20 navbar.
                Height = viewport minus navbar minus a little breathing room.
              */}
              <div
                className="sticky top-20"
                style={{ height: 'calc(100vh - 96px)' }}
              >
                {/* Blobs / decorative ring */}
                <div
                  className="absolute -top-6 -right-6 w-32 h-32 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(191,164,90,0.12) 0%, transparent 70%)' }}
                />
                <div
                  className="absolute -bottom-6 -left-6 w-48 h-48 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(75,151,201,0.1) 0%, transparent 70%)' }}
                />

                {/* Image frame */}
                <div
                  className="relative w-full h-full overflow-hidden shadow-2xl"
                  style={{
                    borderRadius: '48% 52% 44% 56% / 38% 42% 58% 62%',
                    border: '1px solid rgba(191,164,90,0.2)',
                    background: '#f0f9f9',
                  }}
                >
                  {/* Counter badge */}
                  <div
                    className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest backdrop-blur-sm"
                    style={{ background: 'rgba(255,255,255,0.85)', color: '#bfa45a', border: '1px solid rgba(191,164,90,0.3)' }}
                  >
                    <span>{String(currentIndex + 1).padStart(2, '0')}</span>
                    <span style={{ color: '#ccc' }}>/</span>
                    <span style={{ color: '#aaa' }}>{String(total).padStart(2, '0')}</span>
                  </div>

                  {/* Images — layered, slide-in from bottom */}
                  {ingredients.map((ingredient, index) => {
                    const isActive = index === currentIndex
                    let translateY = 100
                    let imgOpacity = 0
                    let scale = 0.96

                    if (index < currentIndex) {
                      translateY = -8
                      imgOpacity = Math.max(0, 1 - (currentIndex - index) * 0.6)
                      scale = 0.98
                    } else if (isActive) {
                      translateY = 0
                      imgOpacity = 1
                      scale = 1
                    } else if (index === currentIndex + 1) {
                      translateY = 100 - offset * 100
                      imgOpacity = offset * 0.9
                      scale = 0.96 + offset * 0.04
                    }

                    return (
                      <div
                        key={ingredient.id}
                        className="absolute inset-0"
                        style={{
                          transform: `translateY(${translateY}%) scale(${scale})`,
                          opacity: imgOpacity,
                          zIndex: 10 + index,
                          transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease',
                          pointerEvents: isActive ? 'auto' : 'none',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => onNavigate(ingredient)}
                          className="w-full h-full p-0 border-0 bg-transparent cursor-pointer"
                          aria-label={`View ${ingredient.name} details`}
                        >
                          <img
                            src={useMockImages ? mockImages[index] : getOptimizedImage(ingredient.image)}
                            alt={ingredient.name}
                            className="w-full h-full object-cover"
                            loading={index === 0 ? 'eager' : 'lazy'}
                          />
                          {/* subtle overlay so the badge is readable */}
                          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Ingredient name below image */}
                <div className="mt-5 text-center px-4">
                  <p
                    className="text-sm font-light tracking-[0.2em] uppercase transition-all duration-300"
                    style={{ color: '#bfa45a', letterSpacing: '0.18em' }}
                  >
                    {ingredients[currentIndex]?.name}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── MOBILE layout: simple stacked cards ────────────────────────── */}
      <div className="md:hidden px-4 py-8 space-y-10">
        {ingredients.map((ingredient, index) => (
          <button
            key={ingredient.id}
            type="button"
            onClick={() => onNavigate(ingredient)}
            className="w-full text-left group block focus:outline-none rounded-2xl overflow-hidden bg-white border shadow-sm active:scale-[0.99] transition-transform"
            style={{ borderColor: 'rgba(191,164,90,0.25)' }}
          >
            {/* Image */}
            <div className="aspect-[4/3] overflow-hidden relative">
              <img
                src={useMockImages ? mockImages[index] : getOptimizedImage(ingredient.image)}
                alt={ingredient.name}
                className="w-full h-full object-cover"
                loading={index < 2 ? 'eager' : 'lazy'}
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-semibold tracking-widest bg-white/80 backdrop-blur-sm" style={{ color: '#bfa45a' }}>
                {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </div>
            </div>

            {/* Text */}
            <div className="p-5">
              <h3 className="text-xl font-bold mb-2" style={{ color: '#bfa45a' }}>{ingredient.name}</h3>
              <p className="text-sm font-light leading-relaxed line-clamp-3" style={{ color: '#666' }}>
                {ingredient.description.split('\n')[0].replace(/\*\*(.*?)\*\*/g, '$1')}
              </p>
              <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium tracking-wider uppercase" style={{ color: '#bfa45a' }}>
                Read more
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
          </button>
        ))}
      </div>

    </div>
  )
}
