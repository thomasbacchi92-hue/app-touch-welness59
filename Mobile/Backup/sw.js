// sw.js - Service Worker base per la cartella Mobile
const CACHE_NAME = 'touch-wellness-mobile-v1';

self.addEventListener('install', (event) => {
    console.log('[Service Worker Mobile] Installato');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker Mobile] Attivato');
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Lascia passare tutte le richieste di rete per avere i dati in tempo reale
    event.respondWith(fetch(event.request));
});