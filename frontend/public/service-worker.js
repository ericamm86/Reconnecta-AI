const STATIC_CACHE = "reconnect-ai-static-v3";
const API_CACHE = "reconnect-ai-api-v3";
const APP_SHELL = ["/", "/index.html", "/favicon.svg", "/manifest.webmanifest", "/icons/maskable-icon.svg"];
const API_NETWORK_FIRST = ["/api/contacts", "/api/dashboard"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => ![STATIC_CACHE, API_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

async function networkFirst(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.json({ data: [] }, { status: 200 });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (API_NETWORK_FIRST.some((path) => url.pathname.startsWith(path))) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin && (request.destination || url.pathname === "/")) {
    event.respondWith(staleWhileRevalidate(request).then((response) => response || caches.match("/")));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag !== "reconnect-ai-sync") return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: "SYNC_OFFLINE_QUEUE" }));
    })
  );
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() || {
    title: "Reconnect AI",
    body: "Voce tem um follow-up pendente."
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/maskable-icon.svg",
      badge: "/icons/maskable-icon.svg",
      data: payload.data || {}
    })
  );
});
