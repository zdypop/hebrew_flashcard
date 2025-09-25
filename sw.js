// Service Worker for Hebrew FlashCard
// Helps maintain background audio functionality

const CACHE_NAME = 'hebrew-flashcard-v1';
const urlsToCache = [
  './',
  './HebrewFlashCard.html',
  './css/style.css',
  './js/main.js',
  './js/data.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
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