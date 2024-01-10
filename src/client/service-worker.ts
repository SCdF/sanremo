/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { PrecacheEntry } from 'workbox-precaching/_types';
import { registerRoute } from 'workbox-routing';

// import { manifest, version } from '@parcel/service-worker';
// ^ This is broken in a couple of ways and so does not work for us:
// TODO - raise ticxet; version is the hash of this exact file, so stays constant because the hash is calulcated before the manifest is injected
//   https://github.com/parcel-bundler/parcel/issues/9309 *.runtime.* files are not added to the manifest
// TODO - PR; if you build multiple targets the manifest contains resources from all targets
// TODO once you've worked out a good system try to make it into a parcel addon?

// once populated by the post build scripyt this will be an array of files that look like
// <name>.<hash>.<ext> with the exception of 'index.html', which will just be called that
const MANIFEST = ['INJECT_MANIFEST_HERE'];
const INDEX_VERSION = 'INJECT_HTML_HASH_HERE';

const versionedManifest: PrecacheEntry[] = Array();
for (const url of MANIFEST) {
  if (url === '/index.html') {
    versionedManifest.push({ url, revision: INDEX_VERSION });
  } else {
    // other resources have their version in their name,
    // null explicitly disables the warning
    versionedManifest.push({ url, revision: null });
  }
}

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

// Precache all of the assets generated by your build process.
precacheAndRoute(versionedManifest);

// Set up App Shell-style routing, so that all navigation requests
// are fulfilled with your index.html shell. Learn more at
// https://developers.google.com/web/fundamentals/architecture/app-shell
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  // Return false to exempt requests from being fulfilled by index.html.
  ({ request, url }: { request: Request; url: URL }) => {
    // If this isn't a navigation, skip.
    if (request.mode !== 'navigate') {
      return false;
    }

    // If this is a URL that starts with /_, skip.
    if (url.pathname.startsWith('/_')) {
      return false;
    }

    // If this looks like a URL for a resource, because it contains
    // a file extension, skip.
    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }

    // Return true to signal that we want to use the handler.
    return true;
  },
  createHandlerBoundToURL('/index.html'),
);

self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    await self.skipWaiting();

    self.clients
      .matchAll({
        includeUncontrolled: true,
        type: 'window',
      })
      .then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type: 'reload_ready',
          });
        }
      });
  }
});

// Any other custom service worker logic can go here.
