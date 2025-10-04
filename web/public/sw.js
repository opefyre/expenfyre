const CACHE_NAME = 'expenfyre-v8'
const urlsToCache = [
  '/',
  '/manifest.json?v=3',
  '/icon-192x192.png?v=3',
  '/icon-512x512.png?v=3'
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache)
      })
  )
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Take control immediately
  self.clients.claim()
})

// Fetch event - ONLY cache static images, nothing else
self.addEventListener('fetch', (event) => {
  // Only cache PNG images for the app icons
  if (event.request.method === 'GET' && 
      event.request.url.startsWith(self.location.origin) &&
      (event.request.url.includes('icon-192x192.png') || 
       event.request.url.includes('icon-512x512.png') ||
       event.request.url.includes('manifest.json'))) {
    
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request)
        })
    )
    return
  }

  // For ALL other requests, let the browser handle them - no caching, no interference
  return
})