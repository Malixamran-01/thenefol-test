import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useCart } from '../contexts/CartContext'
import { useWishlist } from '../contexts/WishlistContext'
import { getApiBase } from '../utils/apiBase'
import { userSocketService } from '../services/socket'
import { Heart, Star, ShoppingCart, Filter, SortAsc, SortDesc, X, Clock, TrendingUp, Search as SearchIcon, SlidersHorizontal } from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  description: string
  price: string
  category: string
  brand: string
  key_ingredients: string
  skin_type: string
  hair_type: string
  list_image: string
  pdp_images?: Array<{ url: string }>
  relevance_score: number
  slug?: string
  details?: {
    mrp?: string
    websitePrice?: string
    discountPercent?: string
    [key: string]: any
  }
}

interface SearchFilters {
  categories: Array<{ name: string; count: number }>
  priceRanges: { min_price: number; max_price: number; avg_price: number }
  ingredients: Array<{ name: string; count: number }>
  skinTypes: Array<{ name: string; count: number }>
  hairTypes: Array<{ name: string; count: number }>
}

interface SearchResponse {
  products: SearchResult[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  suggestions: Array<{ suggestion: string; type: string; count: number }>
  popularSearches: string[]
  filters: any
}

export default function SearchPage() {
  const { addItem } = useCart()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null)
  
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
  const [selectedSkinType, setSelectedSkinType] = useState('')
  const [selectedHairType, setSelectedHairType] = useState('')
  const [sortBy, setSortBy] = useState('relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // UI state
  const [showFilters, setShowFilters] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{ suggestion: string; type: string; count: number }>>([])
  const [popularSearches, setPopularSearches] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Get search query from URL
  useEffect(() => {
    const hash = window.location.hash || '#/'
    const urlParams = new URLSearchParams(hash.split('?')[1] || '')
    const query = urlParams.get('q') || ''
    setSearchQuery(query)
    
    // Always perform search to show products (with or without query)
    performSearch(query)
    
    // Load recent searches
    const saved = localStorage.getItem('nefol_recent_searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load recent searches:', e)
      }
    }
  }, [])

  // Load search filters
  useEffect(() => {
    loadSearchFilters()
  }, [])

  // Perform search
  const normalizeProduct = (product: any): SearchResult => {
    let details: any = product.details
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details)
      } catch (err) {
        details = {}
      }
    }

    const apiImages = Array.isArray(product.pdp_images)
      ? product.pdp_images
      : []

    const extraImages: Array<{ url: string }> = []
    for (let idx = 1; idx <= 6; idx++) {
      const key = `pdp_image_${idx}`
      if (product[key]) {
        extraImages.push({ url: product[key] })
      }
    }

    const combinedImages = [...apiImages, ...extraImages]
      .filter((img: any) => img && (img.url || typeof img === 'string'))
      .map((img: any) => (typeof img === 'string' ? { url: img } : img))

    const candidatePaths: (string | undefined)[] = [
      product.list_image,
      ...(combinedImages.map((img: { url: string }) => img.url)),
      product.listImage,
      product.thumbnail,
      product.primary_image
    ]

    const listImage = candidatePaths.find((path) => path && path.trim().length > 0) || ''

    return {
      id: product.id?.toString?.() || product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      brand: product.brand,
      key_ingredients: product.key_ingredients,
      skin_type: product.skin_type,
      hair_type: product.hair_type,
      list_image: listImage,
      pdp_images: combinedImages,
      relevance_score: product.relevance_score ?? 0,
      slug: product.slug,
      details
    }
  }

  const performSearch = async (query: string, page: number = 1) => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
        ...(selectedCategory && { category: selectedCategory }),
        ...(priceRange.min && { minPrice: priceRange.min }),
        ...(priceRange.max && { maxPrice: priceRange.max }),
        ...(selectedIngredients.length > 0 && { ingredients: selectedIngredients.join(',') }),
        ...(selectedSkinType && { skinType: selectedSkinType }),
        ...(selectedHairType && { hairType: selectedHairType })
      })

      // Only add query parameter if there's a search term
      if (query && query.trim()) {
        params.set('q', query.trim())
      }

      const response = await fetch(`${getApiBase()}/api/search?${params}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Search API error:', response.status, errorText)
        throw new Error(`Search failed: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text()
        console.error('Non-JSON response:', responseText)
        throw new Error('Server returned non-JSON response')
      }

      const data: SearchResponse = await response.json()

      const normalizedProducts = (data.products || []).map(normalizeProduct)
      
      setSearchResults(normalizedProducts)
      setSuggestions(data.suggestions)
      setPopularSearches(data.popularSearches)
      setCurrentPage(data.pagination.page)
      setTotalPages(data.pagination.totalPages)
      setTotalResults(data.pagination.total)
      
      // Track search query in real-time
      if (query && query.trim()) {
        userSocketService.trackSearch(query.trim(), data.pagination.total || 0)
      }
      
      // Update URL
      const newHash = query.trim() ? `#/search?q=${encodeURIComponent(query)}` : '#/search'
      window.history.replaceState(null, '', newHash)
      
      // Save to recent searches
      if (query.trim()) {
        const newRecent = [query.trim(), ...recentSearches.filter(s => s !== query.trim())].slice(0, 5)
        setRecentSearches(newRecent)
        localStorage.setItem('nefol_recent_searches', JSON.stringify(newRecent))
      }
      
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search products. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Load search filters
  const loadSearchFilters = async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/search/filters`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Search filters API error:', response.status, errorText)
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text()
        console.error('Non-JSON response for filters:', responseText)
        return
      }

      const data: SearchFilters = await response.json()
      setSearchFilters(data)
    } catch (err) {
      console.error('Failed to load search filters:', err)
    }
  }

  // Handle search input
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setShowSuggestions(value.length >= 2)
    
    if (value.length >= 2) {
      // Debounced search for suggestions
      const timeoutId = setTimeout(() => {
        performSearch(value)
      }, 300)
      
      return () => clearTimeout(timeoutId)
    }
  }

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim())
      setShowSuggestions(false)
    }
  }

  // Handle filter changes
  const handleFilterChange = () => {
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim())
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategory('')
    setPriceRange({ min: '', max: '' })
    setSelectedIngredients([])
    setSelectedSkinType('')
    setSelectedHairType('')
    setSortBy('relevance')
    setSortOrder('desc')
    
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim())
    }
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim(), page)
    }
  }

  const toAbsoluteUrl = (path?: string) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    if (path.startsWith('/IMAGES/')) return path
    const normalized = path.startsWith('/') ? path : `/${path}`
    return `${getApiBase()}${normalized}`
  }

  const resolveImageUrl = (product: SearchResult) => {
    const candidatePaths: (string | undefined)[] = [
      product.list_image,
      ...(Array.isArray(product.pdp_images) ? product.pdp_images.map((img) => img?.url) : []),
      (product as any).listImage,
      (product as any).thumbnail,
      (product as any).primary_image,
      (product as any).pdp_image_1,
      (product as any).pdp_image_2,
      (product as any).pdp_image_3,
      (product as any).pdp_image_4,
      (product as any).pdp_image_5,
      (product as any).pdp_image_6
    ]

    const candidate = candidatePaths.find((path) => path && path.trim().length > 0) || ''
    const resolved = toAbsoluteUrl(candidate)
    return resolved
  }

  // Handle add to cart
  const handleAddToCart = (product: SearchResult) => {
    const primaryImage = resolveImageUrl(product)
    const gallery = [
      primaryImage,
      ...(Array.isArray(product.pdp_images)
        ? product.pdp_images.map((img) => toAbsoluteUrl(img.url))
        : []),
      (product as any).pdp_image_1 && toAbsoluteUrl((product as any).pdp_image_1),
      (product as any).pdp_image_2 && toAbsoluteUrl((product as any).pdp_image_2),
      (product as any).pdp_image_3 && toAbsoluteUrl((product as any).pdp_image_3),
      (product as any).pdp_image_4 && toAbsoluteUrl((product as any).pdp_image_4),
      (product as any).pdp_image_5 && toAbsoluteUrl((product as any).pdp_image_5),
      (product as any).pdp_image_6 && toAbsoluteUrl((product as any).pdp_image_6)
    ].filter((value, index, self): value is string => !!value && self.indexOf(value) === index)

    addItem({
      id: parseInt(product.id) || undefined,
      slug: product.slug || product.title.toLowerCase().replace(/\s+/g, '-'),
      title: product.title,
      price: product.price,
      listImage: primaryImage,
      pdpImages: gallery,
      category: product.category,
      description: product.description
    }, 1)
  }

  // Handle wishlist toggle
  const handleWishlistToggle = (product: SearchResult) => {
    const productId = parseInt(product.id)
    if (isInWishlist(productId)) {
      removeFromWishlist(productId)
    } else {
      addToWishlist(productId)
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion)
    performSearch(suggestion)
    setShowSuggestions(false)
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gradient-primary mb-4">Advanced Search</h1>
          <p className="text-slate-600 text-lg">Find the perfect products with intelligent search and filters</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInput}
                  onFocus={() => setShowSuggestions(searchQuery.length >= 2)}
                  placeholder="Search products, ingredients, or categories..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-lg"
                />
                
                {/* Search Suggestions */}
                {showSuggestions && (
                  <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto">
                    {suggestions.length > 0 ? (
                      <div className="p-2">
                        {suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion.suggestion)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <SearchIcon className="w-4 h-4 text-blue-500" />
                            <div className="flex-1">
                              <div className="font-medium text-slate-800">{suggestion.suggestion}</div>
                              <div className="text-sm text-slate-500">{suggestion.count} products</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    
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
                            onClick={() => handleSuggestionClick(search)}
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
                            onClick={() => handleSuggestionClick(search)}
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
                <SlidersHorizontal className="w-5 h-5" />
                Filters
              </button>
            </div>
          </form>
        </div>

        {/* Filters Panel */}
        {showFilters && searchFilters && (
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value)
                    handleFilterChange()
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">All Categories</option>
                  {searchFilters.categories.map(category => (
                    <option key={category.name} value={category.name}>
                      {category.name} ({category.count})
                    </option>
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
                    onChange={(e) => {
                      setPriceRange(prev => ({ ...prev, min: e.target.value }))
                      handleFilterChange()
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => {
                      setPriceRange(prev => ({ ...prev, max: e.target.value }))
                      handleFilterChange()
                    }}
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
                    onChange={(e) => {
                      setSortBy(e.target.value)
                      handleFilterChange()
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price">Price</option>
                    <option value="title">Name</option>
                    <option value="category">Category</option>
                    <option value="created_at">Newest</option>
                  </select>
                  <button
                    onClick={() => {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      handleFilterChange()
                    }}
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
              <span>Found <strong>{totalResults}</strong> result{totalResults !== 1 ? 's' : ''} for "<strong>{searchQuery}</strong>"</span>
            ) : (
              <span>Showing <strong>{totalResults}</strong> product{totalResults !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Search Error</h2>
            <p className="text-slate-600">{error}</p>
          </div>
        )}

        {/* Search Results */}
        {!loading && !error && searchResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {searchResults.map((product) => (
              <div key={product.id} className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="relative">
                  <img
                    src={resolveImageUrl(product) || ''}
                    alt={product.title}
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = 'none'
                    }}
                  />
                  <button
                    onClick={() => handleWishlistToggle(product)}
                    className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
                      isInWishlist(parseInt(product.id))
                        ? 'bg-red-500 text-white'
                        : 'bg-white/80 text-slate-600 hover:bg-red-500 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isInWishlist(parseInt(product.id)) ? 'fill-current' : ''}`} />
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
                    <div className="flex flex-col">
                      {product.details?.mrp && product.details?.websitePrice ? (
                        <div>
                          <div className="text-gray-500 line-through text-sm">₹{product.details.mrp}</div>
                          <div className="text-2xl font-bold text-green-600">₹{product.details.websitePrice}</div>
                          <div className="text-xs text-green-500">
                            {Math.round(((parseFloat(product.details.mrp) - parseFloat(product.details.websitePrice)) / parseFloat(product.details.mrp) * 100))}% OFF
                          </div>
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-gradient-primary">
                          ₹{product.price}
                        </div>
                      )}
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

        {/* No Results */}
        {!loading && !error && searchQuery && searchResults.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">No products found</h3>
            <p className="text-slate-600 mb-6">
              No products match "{searchQuery}". Try different keywords or adjust your filters.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-4 py-2 border rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              )
            })}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
