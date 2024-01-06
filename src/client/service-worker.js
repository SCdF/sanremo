import { manifest, version } from '@parcel/service-worker';
console.info('sw', { manifest, version });

async function install() {
  console.info('install sw', { manifest, version });
  const cache = await caches.open(version);
  await cache.addAll(manifest);
}
addEventListener('install', (e) => e.waitUntil(install()));

async function activate() {
  console.info('activate sw', { manifest, version });
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => key !== version && caches.delete(key)));
}
addEventListener('activate', (e) => e.waitUntil(activate()));

addEventListener('fetch', async (event) => {
  const url = event.request.url;
  console.info(url, 'fetch', { event });
  const fromCache = await caches.match(event.request);
  if (fromCache) {
    console.info(url, 'in cache', { fromCache });
    return event.respondWith(fromCache);
  }

  if (event.request.url.endsWith('/')) {
    const index = await caches.match('/index.html');
    console.info(url, 'means index', { index });
    return event.respondWith(index);
  }

  console.info(url, 'gotta fetch');
  return event.respondWith(fetch(event.request));
});
