import React from 'react'

export default function Categories() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button className="btn-primary">
          Add Category
        </button>
      </div>
      
      <div className="metric-card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Category Management</h2>
        <p className="text-gray-600">Category management features coming soon. This will include creating, editing, and organizing product categories.</p>
      </div>
    </div>
  )
}


