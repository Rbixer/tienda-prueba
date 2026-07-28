/**
 * SW mínimo y seguro para Next.js App Router.
 * - NO cachea HTML de páginas (rompe chunks tras cada deploy).
 * - NO sirve HTML offline como si fuera JS/CSS.
 * - Solo ayuda cuando no hay red en navegaciones.
 */
const CACHE = "tienda-barrio-v11";
const PRECACHE = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/manifest.webmanifest",
];

function offlineHtml() {
  return caches.match("/offline.html").then((cached) => {
    if (cached) return cached;
    return new Response(
      `<!doctype html><html lang="es"><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Reconectando</title><body style="margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#0b2545;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:1.5rem"><div><p>Sin conexión o el servidor se reinició.</p><p style="opacity:.75">Reintentando…</p><button onclick="location.reload()" style="margin-top:1rem;padding:.75rem 1.2rem;border:0;border-radius:.75rem;font-weight:700">Reintentar</button></div><script>setTimeout(function(){location.reload()},2000)</script></body></html>`,
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API y bundles de Next: siempre red, sin cache SW (evita HTML/JS rotos)
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/")
  ) {
    return; // deja pasar al navegador
  }

  // Navegación: red primero; si falla (reinicio/red), offline con auto-reload
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Nunca cachear documentos HTML de Next
          if (response.status >= 500) {
            return offlineHtml();
          }
          return response;
        })
        .catch(async () => {
          try {
            await new Promise((r) => setTimeout(r, 600));
            const retry = await fetch(request);
            if (retry.status < 500) return retry;
          } catch {
            // ignore
          }
          return offlineHtml();
        }),
    );
    return;
  }

  // Estáticos propios (iconos, offline, manifest): red con fallback a precache
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/offline.html" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/sw.js"
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((c) => c || fetch(request))),
    );
  }
  // resto: red normal sin interceptar
});
