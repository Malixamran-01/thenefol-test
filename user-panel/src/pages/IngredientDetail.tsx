import React, { useState, useEffect } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { getOptimizedImage } from '../utils/imageOptimizer'
import { ingredients } from './Ingredients'

export default function IngredientDetail() {
  const [ingredient, setIngredient] = useState<typeof ingredients[0] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadIngredient = () => {
      const hash = window.location.hash || '#/'
      const match = hash.match(/^#\/user\/ingredients\/([^?#]+)/)
      const ingredientId = match?.[1]
      
      if (!ingredientId) {
        setLoading(false)
        return
      }

      // Find ingredient by ID
      const foundIngredient = ingredients.find(ing => ing.id === ingredientId)
      if (foundIngredient) {
        setIngredient(foundIngredient)
      }
      setLoading(false)
    }

    loadIngredient()
  }, [])

  const handleBack = () => {
    window.location.hash = '#/user/ingredients'
  }

  const handleClose = () => {
    window.location.hash = '#/user/ingredients'
  }

  if (loading) {
    return (
      <main className="min-h-screen py-10" style={{backgroundColor: '#F4F9F9'}}>
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center py-12">
            <p style={{color: '#9DB4C0'}}>Loading ingredient...</p>
          </div>
        </div>
      </main>
    )
  }

  if (!ingredient) {
    return (
      <main className="min-h-screen py-10" style={{backgroundColor: '#F4F9F9'}}>
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">Ingredient not found</p>
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg rounded-lg"
              style={{backgroundColor: 'rgb(75,151,201)'}}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Ingredients
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-10" style={{backgroundColor: '#F4F9F9'}}>
      <div className="mx-auto max-w-4xl px-4">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
          style={{color: '#1B4965'}}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Ingredients
        </button>

        {/* Ingredient Content */}
        <article className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Desktop Layout: Image on Left, Text on Right */}
          <div className="hidden md:flex md:flex-row gap-0">
            {/* Image on Left */}
            <div className="relative w-1/2 min-h-[600px] flex-shrink-0">
              <img 
                src={getOptimizedImage(ingredient.image)} 
                alt={ingredient.name}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Text Content on Right */}
            <div className="w-1/2 p-8 lg:p-12 overflow-y-auto">
              {/* Title */}
              <h1 className="text-3xl lg:text-4xl font-serif mb-6" style={{
                color: '#1B4965', 
                fontWeight: 600, 
                letterSpacing: '-0.01em',
                lineHeight: '1.3',
                fontFamily: 'Georgia, "Times New Roman", serif'
              }}>
                {ingredient.name}
              </h1>

              {/* Description */}
              {ingredient.description && (
                <div 
                  className="prose prose-lg max-w-none mb-8"
                  style={{
                    color: '#1a1a1a',
                    lineHeight: '1.8',
                    fontSize: '1.0625rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
                    fontWeight: 400,
                    letterSpacing: '0.01em'
                  }}
                >
                  <div 
                    dangerouslySetInnerHTML={{
                      __html: ingredient.description.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1a1a1a; font-size: 1.1em; font-weight: bold;">$1</strong>')
                    }}
                  />
                </div>
              )}

              {/* Detailed Info */}
              {ingredient.detailedInfo && (
                <div 
                  className="prose prose-lg max-w-none mb-8"
                  style={{
                    color: '#1a1a1a',
                    lineHeight: '1.8',
                    fontSize: '1.0625rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
                    fontWeight: 400,
                    letterSpacing: '0.01em'
                  }}
                >
                  <div 
                    dangerouslySetInnerHTML={{
                      __html: ingredient.detailedInfo.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1a1a1a; font-size: 1.2em; font-weight: bold;">$1</strong>')
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Mobile Layout: Image Above, Content Below */}
          <div className="md:hidden">
            <div className="relative w-full h-96">
              <img 
                src={getOptimizedImage(ingredient.image)} 
                alt={ingredient.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Post Content - Mobile or when no image */}
          <div className="p-8 md:hidden">
            {/* Title */}
            <h1 className="text-4xl font-serif mb-6" style={{color: '#1B4965', fontWeight: 600, letterSpacing: '-0.02em'}}>
              {ingredient.name}
            </h1>

            {/* Description */}
            {ingredient.description && (
              <div 
                className="prose prose-lg max-w-none mb-8"
                style={{
                  color: '#1a1a1a',
                  lineHeight: '1.8',
                  fontSize: '1.0625rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
                  fontWeight: 400,
                  letterSpacing: '0.01em'
                }}
              >
                <div 
                  dangerouslySetInnerHTML={{
                    __html: ingredient.description.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1a1a1a; font-size: 1.1em; font-weight: bold;">$1</strong>')
                  }}
                />
              </div>
            )}

            {/* Detailed Info */}
            {ingredient.detailedInfo && (
              <div 
                className="prose prose-lg max-w-none mb-8"
                style={{
                  color: '#1a1a1a',
                  lineHeight: '1.8',
                  fontSize: '1.0625rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
                  fontWeight: 400,
                  letterSpacing: '0.01em'
                }}
              >
                <div 
                  dangerouslySetInnerHTML={{
                    __html: ingredient.detailedInfo.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1a1a1a; font-size: 1.2em; font-weight: bold;">$1</strong>')
                  }}
                />
              </div>
            )}
          </div>
        </article>

        {/* Back and Close Buttons */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg rounded-lg hover:opacity-90"
            style={{backgroundColor: '#1B4965'}}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-2 px-6 py-3 text-gray-700 font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg rounded-lg hover:opacity-90 border-2"
            style={{borderColor: '#1B4965', backgroundColor: 'transparent', color: '#1B4965'}}
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>
    </main>
  )
}

