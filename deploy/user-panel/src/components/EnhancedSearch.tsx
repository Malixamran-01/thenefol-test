import React, { useState, useEffect, useRef } from 'react'
import { Search, X, TrendingUp, Clock } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { api } from '../services/api'

interface EnhancedSearchProps {
  onClose?: () => void
  className?: string
}

export default function EnhancedSearch({ onClose, className = '' }: EnhancedSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [popularSearches, setPopularSearches] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Load popular and recent searches
    loadPopularSearches()
    loadRecentSearches()
    
    // Focus input
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const loadPopularSearches = async () => {
    try {
      const searches = await api.recommendations.getPopularSearches(10)
      setPopularSearches(Array.isArray(searches) ? searches : [])
    } catch (error) {
      console.error('Failed to load popular searches:', error)
    }
  }

  const loadRecentSearches = () => {
    try {
      const recent = JSON.parse(localStorage.getItem('recent_searches') || '[]')
      setRecentSearches(recent.slice(0, 5))
    } catch (error) {
      console.error('Failed to load recent searches:', error)
    }
  }

  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return
    try {
      const recent = JSON.parse(localStorage.getItem('recent_searches') || '[]')
      const updated = [searchQuery, ...recent.filter((s: string) => s !== searchQuery)].slice(0, 10)
      localStorage.setItem('recent_searches', JSON.stringify(updated))
      setRecentSearches(updated.slice(0, 5))
    } catch (error) {
      console.error('Failed to save recent search:', error)
    }
  }

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) {
      setResults([])
      setShowSuggestions(true)
      return
    }

    setLoading(true)
    setShowSuggestions(false)

    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/search?q=${encodeURIComponent(searchQuery)}`)
      
      if (response.ok) {
        const data = await response.json()
        const products = Array.isArray(data.products) ? data.products : (Array.isArray(data) ? data : [])
        setResults(products)
        
        // Track search
        try {
          await api.recommendations.trackSearch(searchQuery, products.length)
        } catch (err) {
          console.error('Failed to track search:', err)
        }
        
        // Save to recent searches
        saveRecentSearch(searchQuery)
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.trim()) {
      setShowSuggestions(false)
      // Debounce search
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(value)
      }, 300)
    } else {
      setResults([])
      setShowSuggestions(true)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    handleSearch(suggestion)
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowSuggestions(true)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className={`fixed inset-0 bg-black/50 z-[100] ${className}`} onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-3xl w-full mx-4 mt-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search products, ingredients, categories..."
            className="flex-1 outline-none text-lg"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Clear"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Results or Suggestions */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                {results.length} {results.length === 1 ? 'result' : 'results'} found
              </p>
              <div className="space-y-2">
                {results.map((product) => (
                  <a
                    key={product.id || product.slug}
                    href={`#/user/product/${product.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {product.listImage && (
                      <img
                        src={product.listImage}
                        alt={product.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium" style={{color: '#1B4965'}}>
                        {product.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        ₹{typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : showSuggestions && !query ? (
            <div className="p-4">
              {recentSearches.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <h3 className="font-medium text-sm text-gray-700">Recent Searches</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(search)}
                        className="px-3 py-1.5 bg-gray-100 rounded-full text-sm hover:bg-gray-200 transition-colors"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {popularSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <h3 className="font-medium text-sm text-gray-700">Popular Searches</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(search)}
                        className="px-3 py-1.5 bg-gray-100 rounded-full text-sm hover:bg-gray-200 transition-colors"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : query && results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No products found for "{query}"
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

