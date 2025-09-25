// Service Worker for Hebrew FlashCard
// Helps maintain background audio functionality

const CACHE_NAME = 'hebrew-flashcard-v2'; // 更新版本号强制刷新缓存
const urlsToCache = [
  './',
  './HebrewFlashCard.html',
  './css/style.css',
  './js/main.js',
  './js/data.js',
  './manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v2');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // 强制激活新的Service Worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating v2');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 立即控制所有页面
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when possible, but always try network first for HTML
self.addEventListener('fetch', (event) => {
  // For HTML files, always try network first to get updates
  if (event.request.destination === 'document' || 
      event.request.url.endsWith('.html') ||
      event.request.url.endsWith('.js') ||
      event.request.url.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network succeeds, update cache and return response
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request);
        })
    );
  } else {
    // For other resources, use cache-first strategy
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});

// Handle background sync for autoplay
self.addEventListener('sync', (event) => {
  if (event.tag === 'autoplay-sync') {
    event.waitUntil(handleAutoplaySync());
  }
});

function handleAutoplaySync() {
  // This would handle continuing autoplay in the background
  // Note: Limited by browser policies for background audio
  console.log('Background sync triggered for autoplay');
}

// Handle message from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'AUDIO_CONTROL') {
    // Handle audio control messages
    console.log('Audio control message received:', event.data);
  }
});