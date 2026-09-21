/* firebase-messaging-sw.js — background push handler */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAjLxkisBi9pzmjlwdHnYfo25XR2Z6ToEs",
    authDomain: "opay-plus-5802c.firebaseapp.com",
    projectId: "opay-plus-5802c",
    storageBucket: "opay-plus-5802c.firebasestorage.app",
    messagingSenderId: "967061625774",
    appId: "1:967061625774:web:236f88391ccdd9edd2863f"
});

const messaging = firebase.messaging();

const DEFAULT_ICON = '/images/dashboard/logo.png';
const DEFAULT_TARGET = '/message.html';

self.addEventListener('install',  (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// ═══════════════════════════════════════════════════════════════
//  DATA-ONLY message handler.
//  Because the API does NOT send a `notification` field, FCM will
//  NOT auto-display anything. Only this handler runs — so we have
//  full control over what the user sees.
// ═══════════════════════════════════════════════════════════════
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message:', payload);

    const d = payload.data || {};
    const n = payload.notification || {};

    // Prefer data fields; fall back to notification fields if present
    const title = d.title || n.title || 'Incoming Transfer Successfully';
    const body  = d.body  || n.body  || '';
    const icon  = d.icon  || n.icon  || DEFAULT_ICON;
    const image = d.image || n.image || '';
    const target = d.clickAction || n.click_action || DEFAULT_TARGET;

    const options = {
        body: body,
        icon: icon,
        badge: icon,
        tag: 'opay-push-' + (d.messageId || Date.now()),
        renotify: false,
        silent: false,
        requireInteraction: false,
        data: {
            clickAction: target,
            url: target,
            ...d
        }
    };

    if (image) options.image = image;

    return self.registration.showNotification(title, options);
});

// Click handler — open the target page
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data || {};
    const target = data.clickAction || data.url || DEFAULT_TARGET;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const c of list) {
                if (c.url && c.url.includes(self.location.origin) && 'focus' in c) {
                    if ('navigate' in c) c.navigate(target);
                    return c.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(target);
        })
    );
});
