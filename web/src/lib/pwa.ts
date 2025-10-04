export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // Unregister ALL service workers to fix routing issues
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for(let registration of registrations) {
          registration.unregister()
          console.log('🗑️ Unregistered service worker:', registration.scope)
        }
        console.log('ℹ️ Service Worker disabled - PWA install still available via browser')
      })
    })
  }
}
