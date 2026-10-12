// Firebase Cloud Messaging Service Worker for Portalko.net
// Handles background push notifications when browser/tab is in background or closed

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Config from firebase-applet-config.json
const firebaseConfig = {
  projectId: "thinking-asset-2lcf1",
  appId: "1:365252321801:web:898ea3a9432eed7e6aced8",
  apiKey: "AIzaSyB35ggTZeyyH50V9mRoOAKcc3KNFugrdfg",
  authDomain: "thinking-asset-2lcf1.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-portalko-7159d16f-86b5-4482-beb4-819bb59cd9dd",
  storageBucket: "thinking-asset-2lcf1.firebasestorage.app",
  messagingSenderId: "365252321801",
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Portalko.net Novo obvestilo';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'Imate novo interakcijo na vaši objavi.',
      icon: payload.notification?.icon || '/portalko_logo_clean.png',
      badge: '/favicon.png',
      data: payload.data || {},
      tag: payload.data?.tag || 'portalko-interaction',
      renotify: true,
      vibrate: [200, 100, 200],
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.log('[firebase-messaging-sw.js] Init note:', e);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickTargetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickTargetUrl);
      }
    })
  );
});
