import { APP_SCOPE, SERVICE_WORKER_URL } from "@/lib/pwa"

/**
 * Register the service worker that keeps the app usable offline (§11b).
 * Registering again is a no-op for the browser, so this needs no guard of its
 * own. A browser without service workers, or one that refuses the
 * registration, leaves the app as it is online, so a failure is not reported.
 */
export async function registerServiceWorker(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) return
    await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: APP_SCOPE,
    })
  } catch {
    // Blocked site data or an insecure origin. The app works without it.
  }
}
