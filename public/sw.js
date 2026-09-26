// Service worker de la PWA: dos responsabilidades separadas.
//
// 1) Web Push (avisos del staff -- "llaman al mesero"/"piden la cuenta",
//    reclamos urgentes, etc. -- ver `apps.restaurantes.push_notifications`,
//    reutilizado por otras apps del backend) -- muestra la notificación del
//    sistema operativo y abre la URL que mandó el backend (o cae en
//    `/admin/restaurante/mesas` si no vino ninguna, comportamiento
//    histórico antes de generalizarse).
//
// 2) Cacheo del app shell para que la PWA instalada abra rápido y no quede
//    en blanco sin conexión -- SOLO archivos estáticos con hash en el
//    nombre (`_next/static/...`) e íconos, que Next.js nunca reescribe sin
//    cambiar la URL. Nunca se cachea una llamada a `/api/` ni una
//    navegación HTML: este panel muestra saldos, stock e inventario en
//    vivo -- servir una respuesta vieja desde cache sería mostrarle al
//    usuario un dato financiero desactualizado sin que se entere.

const CACHE_VERSION = 'erp-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))),
    ).then(() => self.clients.claim()),
  );
});

function esEstaticoCacheable(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !esEstaticoCacheable(url)) {
    return; // Deja pasar todo lo demás sin tocarlo (comportamiento normal del navegador).
  }

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cacheado = await cache.match(event.request);
      if (cacheado) return cacheado;
      const respuesta = await fetch(event.request);
      if (respuesta.ok) cache.put(event.request, respuesta.clone());
      return respuesta;
    }),
  );
});

self.addEventListener('push', (event) => {
  let datos = { title: 'ERPSystem', body: 'Tienes una notificación nueva.', url: null };
  try {
    if (event.data) datos = { ...datos, ...event.data.json() };
  } catch {
    // Payload no-JSON inesperado -- se usa el texto por defecto de arriba.
  }
  event.waitUntil(
    self.registration.showNotification(datos.title, {
      body: datos.body,
      icon: '/icons/icon-192.png',
      tag: 'erp-aviso',
      renotify: true,
      data: { url: datos.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = event.notification.data?.url || '/admin/restaurante/mesas';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(destino) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(destino);
      }
    }),
  );
});
