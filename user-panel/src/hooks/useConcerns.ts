import { useEffect, useState } from 'react'
import { getApiBase, resolveMediaUrl } from '../utils/apiBase'

export type Concern = {
  id: number
  slug: string
  name: string
  description: string | null
  image_url: string | null
  /** 'skin' | 'hair' | 'body' — sections on the All concerns page */
  concern_group: string | null
  show_in_nav: boolean
  product_count: number
}

let cache: Promise<Concern[]> | null = null

/** Active concerns (Shop by Concern), fetched once per page load and shared by the navbar and pages. */
export function fetchConcerns(): Promise<Concern[]> {
  if (!cache) {
    cache = fetch(`${getApiBase()}/api/concerns`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((rows: Concern[]) =>
        (Array.isArray(rows) ? rows : []).map((c) => ({ ...c, image_url: c.image_url ? resolveMediaUrl(c.image_url) : null }))
      )
      .catch(() => {
        cache = null // retry on next mount
        return []
      })
  }
  return cache
}

export function useConcerns() {
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetchConcerns().then((rows) => {
      if (!alive) return
      setConcerns(rows)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])
  return { concerns, loading }
}
