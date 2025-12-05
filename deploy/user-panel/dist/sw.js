// Service Worker for Nefol PWA
const CACHE_NAME = 'nefol-pwa-v1'
const RUNTIME_CACHE = 'nefol-runtime-v1'

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/IMAGES/light theme logo.webp',
  '/IMAGES/dark theme logo.webp'
]

async function precacheAppShell() {
  console.log('[Service Worker] Caching app shell')
  const cache = await caches.open(CACHE_NAME)
  const results = await Promise.allSettled(
    PRECACHE_ASSETS.map(async (asset) => {
      try {
        const request = new Request(asset, { cache: 'reload' })
        const response = await fetch(request)
        if (!response.ok || response.status === 206) {
          throw new Error(`status: ${response.status}`)
        }
        await cache.put(request, response.clone())
      } catch (error) {
        throw new Error(`[Service Worker] Failed to precache ${asset} (${error})`)
      }
    })
  )

  const failures = results.filter((result) => result.status === 'rejected')
  if (failures.length) {
    failures.forEach((failure) => console.warn(failure.reason))
  }
}

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    precacheAppShell()
      .catch((error) => console.warn(error))
      .finally(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          })
      )
    })
    .then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // Skip range requests to avoid partial response caching
  if (request.headers.has('range')) {
    return
  }

  // Skip API calls and socket connections
  if (url.pathname.startsWith('/api/') || 
      url.protocol === 'ws:' || 
      url.protocol === 'wss:') {
    return
  }

  // Strategy: Cache First, Network Fallback for static assets
  // Network First, Cache Fallback for HTML pages
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // For HTML pages, prefer network but use cache if offline
        if (request.headers.get('accept')?.includes('text/html')) {
          return fetch(request)
            .then((networkResponse) => {
              // Cache successful responses (but not partial responses - 206)
              if (networkResponse.ok && networkResponse.status !== 206) {
                const responseClone = networkResponse.clone()
                caches.open(RUNTIME_CACHE).then((cache) => {
                  cache.put(request, responseClone)
                })
              }
              return networkResponse
            })
            .catch(() => {
              // If network fails, return cached version
              return cachedResponse || new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/html'
                })
              })
            })
        }

        // For static assets (images, CSS, JS), use cache first
        if (cachedResponse) {
          return cachedResponse
        }

        // If not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Don't cache non-successful responses or partial responses (206)
            if (!networkResponse.ok || networkResponse.status === 206) {
              return networkResponse
            }

            // Cache the response (only full responses, not partial)
            // Check if response is complete before caching
            if (networkResponse.status !== 206 && networkResponse.ok) {
              const responseClone = networkResponse.clone()
              caches.open(RUNTIME_CACHE).then((cache) => {
                // Double-check before caching to avoid 206 errors
                if (networkResponse.status !== 206) {
                  cache.put(request, responseClone).catch((err) => {
                    console.warn('[Service Worker] Failed to cache response:', err)
                  })
                }
              })
            }

            return networkResponse
          })
          .catch(() => {
            // If offline and not in cache, return a placeholder for images
            if (request.destination === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Image</text></svg>',
                {
                  headers: { 'Content-Type': 'image/svg+xml' }
                }
              )
            }
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            })
          })
      })
    )
  }
})

// Handle background sync (for future offline cart/order functionality)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag)
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart())
  }
})

async function syncCart() {
  // Future: Sync cart data when back online
  console.log('[Service Worker] Syncing cart...')
}

// Handle push notifications (for future order updates)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received')
  const data = event.data?.json() || {}
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/IMAGES/light theme logo.webp',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: data
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Nefol', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked')
  event.notification.close()

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  )
})

