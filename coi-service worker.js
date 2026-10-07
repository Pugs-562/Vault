/*! coi-serviceworker v0.1.7 - MIT License */
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('coi-serviceworker.js').then(
      (registration) => {
        registration.addEventListener('updatefound', () => window.location.reload());
        if (registration.active && !navigator.serviceWorker.controller) window.location.reload();
      },
      (err) => console.error('COI Service Worker failed: ', err)
    );
  }
} else {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener('fetch', (event) => {
    // THE FIX: Do not intercept the local ROM file (blob:) or it will break the game
    if (event.request.url.startsWith('blob:') || event.request.url.startsWith('data:')) {
      return; 
    }
    
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return;

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 0) return response;
          const newHeaders = new Headers(response.headers);
          newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
}
