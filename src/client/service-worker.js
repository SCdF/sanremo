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
