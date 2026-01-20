// Store the service worker registration outside of React/Redux since it's not serializable
// Similar pattern to how we store the PouchDB handle in src/client/db/index.ts

let registration: ServiceWorkerRegistration | undefined;

export function setRegistration(reg: ServiceWorkerRegistration): void {
  registration = reg;
}

export function getRegistration(): ServiceWorkerRegistration | undefined {
  return registration;
}

/**
 * Trigger the waiting service worker to skip waiting and activate.
 * Call this directly from click handlers when user wants to update.
 */
export function triggerUpdate(): void {
  registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
}
