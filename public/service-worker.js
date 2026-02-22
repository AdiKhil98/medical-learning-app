/**
 * Service Worker for MedMeister App
 *
 * Implements caching strategies for optimal offline experience:
 * - Cache-first for static assets (JS, CSS, fonts, images)
 * - Network-first for API calls
 * - Stale-while-revalidate for HTML pages
 */

// IMPORTANT: This version MUST change with each deployment to force cache refresh
// Format: medmeister-v{major}.{timestamp}
const CACHE_VERSION = `medmeister-v2-${  Date.now()}`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Assets to cache immediately on install
const STATIC_ASSETS = ['/', '/manifest.json', '/robots.txt'];

// Cache size limits
const MAX_DYNAMIC_CACHE_SIZE = 50;
const MAX_API_CACHE_SIZE = 100;

/**
 * Install Event - Cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (name) =>
                (name.startsWith('kp-med-') || name.startsWith('medmeister-')) && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE
            )
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim(); // Take control immediately
      })
  );
});

/**
 * Fetch Event - Implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Strategy 1: Cache-first for static assets (JS, CSS, fonts, images)
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy 2: Network-first for API calls
  if (isAPIRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Strategy 3: Network-first for HTML pages (always get fresh HTML!)
  if (request.destination === 'document' || request.url.endsWith('.html') || request.url.endsWith('/')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // Strategy 4: Stale-while-revalidate for everything else
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

/**
 * Check if request is for a static asset
 */
function isStaticAsset(url) {
  const staticExtensions = [
    '.js',
    '.css',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp',
    '.ico',
  ];
  return staticExtensions.some((ext) => url.pathname.endsWith(ext)) || url.pathname.includes('/_expo/static/');
}

/**
 * Check if request is an API call
 */
function isAPIRequest(url) {
  return (
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('posthog') ||
    url.hostname.includes('analytics')
  );
}

/**
 * Cache-first strategy
 * Try cache first, fallback to network, then cache the response
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }

  console.log('[SW] Cache miss, fetching:', request.url);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return new Response('Offline - Resource not cached', { status: 503 });
  }
}

/**
 * Network-first strategy
 * Try network first, fallback to cache, and update cache
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      await limitCacheSize(cacheName, MAX_API_CACHE_SIZE);
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale-while-revalidate strategy
 * Return cached response immediately, then update cache in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
        await limitCacheSize(cacheName, MAX_DYNAMIC_CACHE_SIZE);
      }
      return response;
    })
    .catch((error) => {
      console.error('[SW] Background fetch failed:', error);
      return cached || new Response('Offline', { status: 503 });
    });

  return cached || fetchPromise;
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxSize) {
    console.log(`[SW] Cache ${cacheName} exceeds ${maxSize} items, removing oldest`);
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxSize); // Recursive until under limit
  }
}

/**
 * Message handler - Clear caches on demand & skip waiting
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(cacheNames.map((name) => caches.delete(name)));
        })
        .then(() => {
          console.log('[SW] All caches cleared');
          return self.clients.matchAll();
        })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        })
    );
  }

  // Force immediate activation of new service worker
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting, activating immediately...');
    self.skipWaiting();
  }
});

console.log('[SW] Service worker loaded');
