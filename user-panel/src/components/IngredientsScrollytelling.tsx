import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getOptimizedImage } from '../utils/imageOptimizer'

type Ingredient = {
  id: string
  name: string
  image: string
  description: string
}

type IngredientsScrollytellingProps = {
  ingredients: Ingredient[]
  onNavigate: (ingredient: Ingredient) => void
  useMockImages?: boolean
}

export default function IngredientsScrollytelling({
  ingredients,
  onNavigate,
  useMockImages = false
}: IngredientsScrollytellingProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [offset, setOffset] = useState(0)
  const scrollyRef = useRef<HTMLDivElement | null>(null)
  const stepRefs = useRef<Array<HTMLDivElement | null>>([])

  const mockImages = useMemo(() => {
    return ingredients.map((ingredient, index) => {
      const hue = (index * 33) % 360
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="hsl(${hue},70%,65%)"/>
              <stop offset="100%" stop-color="hsl(${(hue + 40) % 360},70%,45%)"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
          <circle cx="150" cy="160" r="90" fill="rgba(255,255,255,0.18)"/>
          <circle cx="760" cy="220" r="140" fill="rgba(255,255,255,0.12)"/>
          <circle cx="580" cy="980" r="220" fill="rgba(255,255,255,0.08)"/>
          <text x="60" y="700" font-family="Inter, Arial, sans-serif" font-size="64" fill="rgba(255,255,255,0.9)" letter-spacing="4">
            ${ingredient.name.replace(/&/g, 'and')}
          </text>
          <text x="60" y="780" font-family="Inter, Arial, sans-serif" font-size="32" fill="rgba(255,255,255,0.7)">
            Mock Image ${index + 1}
          </text>
        </svg>
      `
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    })
  }, [ingredients])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(min-width: 768px)').matches) return

    let ticking = false
    const handleScroll = () => {
      if (!scrollyRef.current) return
      if (ticking) return
      ticking = true

      window.requestAnimationFrame(() => {
        const viewportCenter = window.innerHeight / 2
        const rects = stepRefs.current
          .map((el) => el?.getBoundingClientRect())
          .filter(Boolean) as DOMRect[]

        if (!rects.length) {
          ticking = false
          return
        }

        let closestIndex = 0
        let closestDistance = Number.POSITIVE_INFINITY
        rects.forEach((rect, index) => {
          const center = rect.top + rect.height / 2
          const distance = Math.abs(center - viewportCenter)
          if (distance < closestDistance) {
            closestDistance = distance
            closestIndex = index
          }
        })

        const currentRect = rects[closestIndex]
        const nextRect = rects[closestIndex + 1]
        let nextOffset = 0

        if (currentRect && nextRect) {
          const currentCenter = currentRect.top + currentRect.height / 2
          const nextCenter = nextRect.top + nextRect.height / 2
          if (nextCenter !== currentCenter) {
            nextOffset = (viewportCenter - currentCenter) / (nextCenter - currentCenter)
          }
          nextOffset = Math.max(0, Math.min(1, nextOffset))
        }

        setCurrentIndex(closestIndex)
        setOffset(nextOffset)
        ticking = false
      })
    }

    const handleResize = () => handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const totalSteps = ingredients.length

  return (
    <div ref={scrollyRef} className="hidden md:block relative">
      <div className="grid md:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN – DETAILS */}
        <div className="md:col-span-6">
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-[#bfa45a]/20" />

            {ingredients.map((ingredient, index) => {
              let opacity = 0.25
              let scale = 0.96
              let isActive = false

              if (index === currentIndex) {
                opacity = 1
                scale = 1
                isActive = true
              } else if (index === currentIndex + 1) {
                opacity = 0.25 + offset * 0.75
                scale = 0.96 + offset * 0.04
              } else if (index === currentIndex - 1) {
                opacity = 1 - (1 - offset) * 0.75
                scale = 1 - (1 - offset) * 0.04
              }

              return (
                <div
                  key={ingredient.id}
                  ref={(el) => {
                    stepRefs.current[index] = el
                  }}
                  className="relative min-h-[80vh] flex items-center py-16"
                  style={{
                    opacity,
                    transform: `scale(${scale})`,
                    transition: 'opacity 0.12s linear, transform 0.12s linear'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onNavigate(ingredient)}
                    className="text-left w-full"
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="ml-12">
                      <div className="text-[#2a0d0f] text-sm font-medium mb-2 tracking-wide">
                        {String(index + 1).padStart(2, '0')}/{String(totalSteps).padStart(2, '0')}
                      </div>

                      <h3
                        className={`text-4xl md:text-5xl font-bold mb-4 transition-colors duration-300 ${
                          isActive ? 'text-[#bfa45a]' : 'text-[#1a1a1a]'
                        }`}
                      >
                        {ingredient.name}
                      </h3>

                      <div
                        className="text-[#666] text-lg leading-relaxed max-w-xl"
                        dangerouslySetInnerHTML={{
                          __html: ingredient.description.replace(
                            /\*\*(.*?)\*\*/g,
                            '<strong style="color: #1a1a1a;">$1</strong>'
                          )
                        }}
                      />
                    </div>
                  </button>

                  <div
                    className={`absolute left-5 w-3 h-3 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-[#bfa45a] ring-4 ring-white scale-125'
                        : 'bg-[#bfa45a]/30 scale-100'
                    }`}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT COLUMN – FIXED IMAGE (always on screen) */}
        <div className="md:col-span-6 relative">
          <div className="hidden md:block">
            <div
              className="fixed right-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] top-[max(7rem,12vh)] w-[40vw] max-w-[480px] h-[70vh] z-10"
              style={{ pointerEvents: 'none' }}
            >
              <div
                className="relative w-full h-full overflow-hidden shadow-2xl border border-[#bfa45a]/20 bg-[#f0f9f9]"
                style={{ borderRadius: '50% / 30%' }}
              >
                {ingredients.map((ingredient, index) => {
                  let translateY = 100
                  let opacity = 0
                  let scale = 0.96
                  let zIndex = index
                  const isActive = index === currentIndex

                  if (index <= currentIndex) {
                    if (isActive) {
                      opacity = 1
                      translateY = 0
                      scale = 1
                    } else {
                      opacity = Math.max(0.3, 1 - (currentIndex - index) * 0.15)
                      scale = Math.max(0.9, 1 - (currentIndex - index) * 0.02)
                      translateY = Math.min(20, (currentIndex - index) * 8)
                    }
                  } else if (index === currentIndex + 1) {
                    translateY = (1 - offset) * 100
                    opacity = 0.35 + offset * 0.65
                    scale = 0.96 + offset * 0.04
                  }

                  return (
                    <div
                      key={ingredient.id}
                      className="absolute inset-0"
                      style={{
                        transform: `translateY(${translateY}%) scale(${scale})`,
                        opacity,
                        zIndex: 10 + zIndex,
                        transition: 'transform 0.45s ease, opacity 0.45s ease'
                      }}
                    >
                      <div className="w-full h-full">
                        <img
                          src={useMockImages ? mockImages[index] : getOptimizedImage(ingredient.image)}
                          alt={ingredient.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="md:hidden" />
        </div>
      </div>
    </div>
  )
}
