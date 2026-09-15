// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Firebase web config (from your project)
firebase.initializeApp({
  apiKey: "AIzaSyAjLxkisBi9pzmjlwdHnYfo25XR2Z6ToEs",
  authDomain: "opay-plus-5802c.firebaseapp.com",
  projectId: "opay-plus-5802c",
  storageBucket: "opay-plus-5802c.firebasestorage.app",
  messagingSenderId: "967061625774",
  appId: "1:967061625774:web:236f88391ccdd9edd2863f"
});

const messaging = firebase.messaging();

// Handle background notifications (app in background / closed)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'New message';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/firebase-logo.png',      // optional — add a real icon in /public
    badge: '/firebase-logo.png',     // optional
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open your site
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('vercel.app') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow('https://your-app.vercel.app');
      }
    })
  );
});
