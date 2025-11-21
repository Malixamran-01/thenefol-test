import React, { useState, useEffect } from 'react'
import EnhancedSearch from './EnhancedSearch'

export default function SearchButton() {
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const handleOpenSearch = () => {
      setShowSearch(true)
    }

    window.addEventListener('open-search', handleOpenSearch)
    return () => {
      window.removeEventListener('open-search', handleOpenSearch)
    }
  }, [])

  return (
    <>
      {showSearch && (
        <EnhancedSearch onClose={() => setShowSearch(false)} />
      )}
    </>
  )
}

