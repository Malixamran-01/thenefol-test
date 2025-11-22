import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useCart } from '../contexts/CartContext'
import type { Product } from '../types'
import { Heart, Star, ShoppingCart, Filter, SortAsc, SortDesc, X, Clock, TrendingUp } from 'lucide-react'

interface SearchProps {
  addToWishlist?: (product: any) => void
}

interface SearchSuggestion {
  type: 'product' | 'ingredient' | 'category'
  title: string
  subtitle?: string
  product?: Product
  count?: number
}

export default function Search({ addToWishlist }: SearchProps) {
  const { items: allProducts, loading, error } = useProducts()
  const { addItem } = useCart()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [sortBy, setSortBy] = useState('relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [wishlistItems, setWishlistItems] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [popularSearches, setPopularSearches] = useState<string[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Common ingredients mapping
  const ingredientMap = useMemo(() => {
    const map: { [key: string]: string[] } = {
      'vitamin c': ['face serum', 'moisturizer', 'cream', 'serum'],
      'hyaluronic acid': ['face serum', 'moisturizer', 'cream', 'serum'],
      'niacinamide': ['face serum', 'moisturizer', 'cream', 'serum'],
      'retinol': ['face serum', 'moisturizer', 'cream', 'night cream'],
      'salicylic acid': ['face wash', 'cleanser', 'scrub', 'toner'],
      'glycolic acid': ['face wash', 'cleanser', 'scrub', 'toner'],
      'aloe vera': ['moisturizer', 'cream', 'gel', 'face wash'],
      'tea tree': ['face wash', 'cleanser', 'toner', 'spot treatment'],
      'argan oil': ['hair oil', 'hair serum', 'hair mask'],
      'coconut oil': ['hair oil', 'hair mask', 'body lotion'],
      'jojoba oil': ['face serum', 'hair oil', 'moisturizer'],
      'rosehip oil': ['face serum', 'moisturizer', 'cream'],
      'shea butter': ['body lotion', 'cream', 'moisturizer'],
      'glycerin': ['moisturizer', 'cream', 'face wash'],
      'ceramides': ['moisturizer', 'cream', 'face serum'],
      'peptides': ['face serum', 'moisturizer', 'cream'],
      'collagen': ['face serum', 'moisturizer', 'cream'],
      'squalane': ['face serum', 'moisturizer', 'cream'],
      'bha': ['face wash', 'cleanser', 'scrub', 'toner'],
      'aha': ['face wash', 'cleanser', 'scrub', 'toner'],
      'spf': ['sunscreen', 'moisturizer', 'cream'],
      'sunscreen': ['sunscreen', 'moisturizer', 'cream'],
      'antioxidants': ['face serum', 'moisturizer', 'cream'],
      'exfoliant': ['face wash', 'cleanser', 'scrub', 'toner'],
      'moisturizing': ['moisturizer', 'cream', 'lotion'],
      'anti aging': ['face serum', 'moisturizer', 'cream', 'night cream'],
      'acne treatment': ['face wash', 'cleanser', 'toner', 'spot treatment'],
      'brightening': ['face serum', 'moisturizer', 'cream'],
      'hydrating': ['moisturizer', 'cream', 'lotion', 'serum'],
      'cleansing': ['face wash', 'cleanser', 'scrub']
    }
    return map
  }, [])

  // Get search query from URL hash
  useEffect(() => {
    const hash = window.location.hash || '#/'
    const urlParams = new URLSearchParams(hash.split('?')[1] || '')
    const query = urlParams.get('q') || ''
    setSearchQuery(query)
    
    // Load recent searches from localStorage
    const saved = localStorage.getItem('nefol_recent_searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load recent searches:', e)
      }
    }
    
    // Set popular searches (you can make this dynamic later)
    setPopularSearches([
      'face serum', 'moisturizer', 'vitamin c', 'hyaluronic acid',
      'face wash', 'hair oil', 'body lotion', 'sunscreen'
    ])
  }, [])

  // Update URL when search query changes
  useEffect(() => {
    if (searchQuery) {
      const newHash = `#/search?q=${encodeURIComponent(searchQuery)}`
      window.history.replaceState(null, '', newHash)
    }
  }, [searchQuery])

  // Handle clicks outside suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Generate search suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 3) return []
    
    const query = searchQuery.toLowerCase()
    const suggestions: SearchSuggestion[] = []
    
    // Product name suggestions
    const productMatches = allProducts.filter(product => 
      product.title.toLowerCase().includes(query)
    ).slice(0, 5)
    
    productMatches.forEach(product => {
      suggestions.push({
        type: 'product',
        title: product.title,
        subtitle: product.category,
        product: product
      })
    })
    
    // Category suggestions
    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))]
    const categoryMatches = categories.filter(cat => 
      cat && cat.toLowerCase().includes(query)
    ).slice(0, 3)
    
    categoryMatches.forEach(category => {
      if (category) {
        const count = allProducts.filter(p => p.category === category).length
        suggestions.push({
          type: 'category',
          title: category,
          subtitle: `${count} products`,
          count: count
        })
      }
    })
    
    // Ingredient suggestions
    Object.keys(ingredientMap).forEach(ingredient => {
      if (ingredient.includes(query)) {
        const relatedProducts = ingredientMap[ingredient]
        const matchingProducts = allProducts.filter(product => 
          relatedProducts.some(related => 
            product.title.toLowerCase().includes(related) ||
            product.description.toLowerCase().includes(related)
          )
        )
        
        if (matchingProducts.length > 0) {
          suggestions.push({
            type: 'ingredient',
            title: ingredient,
            subtitle: `Found in ${matchingProducts.length} products`,
            count: matchingProducts.length
          })
        }
      }
    })
    
    return suggestions.slice(0, 8)
  }, [searchQuery, allProducts, ingredientMap])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = allProducts
      .map(p => p.category)
      .filter(Boolean)
      .filter((cat, index, arr) => arr.indexOf(cat) === index)
    return cats
  }, [allProducts])

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = allProducts

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(product => {
        const titleMatch = product.title.toLowerCase().includes(query)
        const descMatch = product.description.toLowerCase().includes(query)
        const categoryMatch = product.category && product.category.toLowerCase().includes(query)
        
        // Check for ingredient matches
        const ingredientMatch = Object.keys(ingredientMap).some(ingredient => {
          if (ingredient.includes(query)) {
            const relatedProducts = ingredientMap[ingredient]
            return relatedProducts.some(related => 
              product.title.toLowerCase().includes(related) ||
              product.description.toLowerCase().includes(related)
            )
          }
          return false
        })
        
        return titleMatch || descMatch || categoryMatch || ingredientMatch
      })
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    // Price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(product => {
        const price = parseFloat(product.price) || 0
        const min = priceRange.min ? parseFloat(priceRange.min) : 0
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity
        return price >= min && price <= max
      })
    }

    // Sort products
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'price':
          comparison = (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0)
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '')
          break
        case 'relevance':
        default:
          // For relevance, prioritize exact title matches, then partial matches
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            const aTitleMatch = a.title.toLowerCase().includes(query)
            const bTitleMatch = b.title.toLowerCase().includes(query)
            const aExactMatch = a.title.toLowerCase() === query
            const bExactMatch = b.title.toLowerCase() === query
            
            if (aExactMatch && !bExactMatch) return -1
            if (bExactMatch && !aExactMatch) return 1
            if (aTitleMatch && !bTitleMatch) return -1
            if (bTitleMatch && !aTitleMatch) return 1
          }
          comparison = 0
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [allProducts, searchQuery, selectedCategory, priceRange, sortBy, sortOrder, ingredientMap])

  const handleAddToCart = (product: Product) => {
    addItem(product, 1)
  }

  const handleAddToWishlist = (product: Product) => {
    if (wishlistItems.includes(product.slug)) {
      setWishlistItems(prev => prev.filter(slug => slug !== product.slug))
    } else {
      setWishlistItems(prev => [...prev, product.slug])
      if (addToWishlist) {
        addToWishlist(product)
      }
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'product' && suggestion.product) {
      // Navigate to product page
      window.location.hash = `#/user/product/${suggestion.product.slug}`
    } else {
      // Set search query
      setSearchQuery(suggestion.title)
      setShowSuggestions(false)
      
      // Add to recent searches
      const newRecent = [suggestion.title, ...recentSearches.filter(s => s !== suggestion.title)].slice(0, 5)
      setRecentSearches(newRecent)
      localStorage.setItem('nefol_recent_searches', JSON.stringify(newRecent))
    }
  }

  const clearFilters = () => {
    setSelectedCategory('')
    setPriceRange({ min: '', max: '' })
    setSortBy('relevance')
    setSortOrder('desc')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Add to recent searches
      const newRecent = [searchQuery.trim(), ...recentSearches.filter(s => s !== searchQuery.trim())].slice(0, 5)
      setRecentSearches(newRecent)
      localStorage.setItem('nefol_recent_searches', JSON.stringify(newRecent))
      
      setShowSuggestions(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setShowSuggestions(value.length >= 3)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-center py-20">
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center py-20">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Error Loading Products</h2>
            <p className="text-slate-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gradient-primary mb-4">Advanced Search</h1>
          <p className="text-slate-600 text-lg">Search products, ingredients, or categories with intelligent suggestions</p>
        </div>

        {/* Advanced Search Bar */}
        <div className="mb-8 relative">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <img 
                  src="/IMAGES/search icon.svg" 
                  alt="Search" 
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                  onError={(e) => {
                    // Fallback to lucide icon if image fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = '<svg class="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>'
                    }
                  }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleInputChange}
                  onFocus={() => setShowSuggestions(searchQuery.length >= 3)}
                  placeholder="Type at least 3 characters for suggestions... (e.g., vitamin c, face serum, hyaluronic acid)"
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-lg"
                />
                
                {/* Search Suggestions Dropdown */}
                {showSuggestions && (
                  <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto">
                    {searchSuggestions.length > 0 ? (
                      <div className="p-2">
                        {searchSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <div className="flex-shrink-0">
                              {suggestion.type === 'product' && <ShoppingCart className="w-4 h-4 text-blue-500" />}
                              {suggestion.type === 'ingredient' && <Star className="w-4 h-4 text-green-500" />}
                              {suggestion.type === 'category' && <Filter className="w-4 h-4 text-purple-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-800 truncate">{suggestion.title}</div>
                              <div className="text-sm text-slate-500 truncate">{suggestion.subtitle}</div>
                            </div>
                            {suggestion.count && (
                              <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                {suggestion.count}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="text-center text-slate-500">
                          <div className="text-2xl mb-2">🔍</div>
                          <p>No suggestions found</p>
                          <p className="text-sm">Try different keywords</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div className="border-t border-slate-200 p-2">
                        <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Recent Searches
                        </div>
                        {recentSearches.map((search, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              setSearchQuery(search)
                              setShowSuggestions(false)
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="text-sm text-slate-600">{search}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Popular Searches */}
                    <div className="border-t border-slate-200 p-2">
                      <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                        Popular Searches
                      </div>
                      <div className="flex flex-wrap gap-2 p-3">
                        {popularSearches.map((search, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setSearchQuery(search)
                              setShowSuggestions(false)
                            }}
                            className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                          >
                            {search}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="px-6 py-4 rounded-xl bg-slate-200 hover:bg-slate-300 transition-colors flex items-center gap-2"
              >
                <Filter className="w-5 h-5" />
                Filters
              </button>
            </div>
          </form>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-8 p-6 bg-white rounded-xl shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-800">Advanced Filters</h3>
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Price Range (₹)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price">Price</option>
                    <option value="title">Name</option>
                    <option value="category">Category</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-slate-600">
            {searchQuery ? (
              <span>Found <strong>{filteredProducts.length}</strong> result{filteredProducts.length !== 1 ? 's' : ''} for "<strong>{searchQuery}</strong>"</span>
            ) : (
              <span>Showing <strong>{filteredProducts.length}</strong> product{filteredProducts.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          {(selectedCategory || priceRange.min || priceRange.max) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Active filters:</span>
              {selectedCategory && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X className="w-3 h-3 inline" />
                  </button>
                </span>
              )}
              {(priceRange.min || priceRange.max) && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  Price: ₹{priceRange.min || '0'} - ₹{priceRange.max || '∞'}
                  <button
                    onClick={() => setPriceRange({ min: '', max: '' })}
                    className="ml-1 hover:text-green-600"
                  >
                    <X className="w-3 h-3 inline" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">No products found</h3>
            <p className="text-slate-600 mb-6">
              {searchQuery ? `No products match "${searchQuery}"` : 'No products available'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.slug} className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="relative">
                  <img
                    src={product.listImage || '/IMAGES/FACE SERUM (5).jpg'}
                    alt={product.title}
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={() => handleAddToWishlist(product)}
                    className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
                      wishlistItems.includes(product.slug)
                        ? 'bg-red-500 text-white'
                        : 'bg-white/80 text-slate-600 hover:bg-red-500 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${wishlistItems.includes(product.slug) ? 'fill-current' : ''}`} />
                  </button>
                  {product.category && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                      {product.category}
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {product.title}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-gradient-primary">
                      ₹{product.price}
                    </div>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to Top */}
        <div className="mt-12 text-center">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
          >
            Back to Top
          </button>
        </div>
      </div>
    </div>
  )
}
