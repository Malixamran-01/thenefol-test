import React, { useState, useEffect } from 'react'
import EnhancedSearch from './EnhancedSearch'
import { deferStateWork } from '../utils/deferStateWork'

export default function SearchButton() {
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const handleOpenSearch = () => {
      deferStateWork(() => setShowSearch((prev) => (prev ? prev : true)))
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

