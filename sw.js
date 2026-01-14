// Edit IQ Service Worker for WebIntoApp
const CACHE_NAME = 'editiq-v2.1.0';
const urlsToCache = [
  '/',
  '/webintoapp.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  'https://res.cloudinary.com/dvd6oa63p/image/upload/v1768175554/workspacebgpng_zytu0b.png'
];

// Install event
self.addEventListener('install', function(event) {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        if (response) {
          console.log('📱 Serving from cache:', event.request.url);
          return response;
        }
        
        return fetch(event.request).then(function(response) {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('✅ Service Worker activated');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});