// Cronos — service worker
// - Abre mesmo sem internet (guarda o app, ícones, fontes e a biblioteca de gráficos)
// - Página principal: abre na hora pela cópia guardada e baixa a versão nova em segundo plano
//   (a atualização aparece na abertura seguinte)
const VERSION = 'cronos-v4';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Navegação (abrir o app): mostra a cópia guardada na hora (sem esperar a rede)
  if (req.mode === 'navigate') {
    const rede = fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('./index.html', copy)); }
      return res;
    });
    e.waitUntil(rede.catch(() => {}));
    e.respondWith(caches.match('./index.html').then((hit) => hit || rede).catch(() => rede));
    return;
  }

  // Demais arquivos (ícones, fontes, Chart.js): usa o guardado e atualiza em segundo plano
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
