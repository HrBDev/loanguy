// The native build injects the content fingerprint and complete asset inventory.
const RELEASE = "271fed0131768441";
const PRECACHE = ["assets/main-301299161d7dacde.css","assets/main-5af93683a05aef50.js","favicon.png","fonts/MarkaziTextDigits-VariableFont_wght.ttf","fonts/OFL.txt","fonts/Vazirmatn-Variable.woff2","icons/Icon-192.png","icons/Icon-512.png","icons/Icon-maskable-192.png","icons/Icon-maskable-512.png","index.html","manifest.webmanifest"];
const scope = new URL(self.registration.scope);
// Native and Flutter releases, and independently hosted subpaths, stay isolated.
const PREFIX = "loan-guy-native:" + scope.pathname + ":";
const CACHE = PREFIX + RELEASE;
const absolute = (path) => new URL(path, scope).href;
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      if (!PRECACHE.length) throw new Error("Run the native production build.");
      const cache = await caches.open(CACHE);
      try {
        await cache.addAll(
          PRECACHE.map(
            (path) => new Request(absolute(path), { cache: "reload" }),
          ),
        );
      } catch (error) {
        await caches.delete(CACHE);
        throw error;
      }
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith(PREFIX) && name !== CACHE)
          await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== scope.origin ||
    !url.pathname.startsWith(scope.pathname)
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (event.request.mode === "navigate") {
        const shell = await cache.match(absolute("index.html"), {
          ignoreVary: true,
        });
        if (shell?.redirected)
          return new Response(shell.body, {
            status: shell.status,
            statusText: shell.statusText,
            headers: shell.headers,
          });
        return shell || fetch(event.request);
      }
      // These are immutable same-origin release assets. Static hosts can emit
      // Vary: Origin even though their bytes do not vary; module requests include
      // Origin while precache fetches may omit it. Match that release offline.
      return (
        (await cache.match(event.request, {
          ignoreSearch: true,
          ignoreVary: true,
        })) || fetch(event.request)
      );
    })(),
  );
});
