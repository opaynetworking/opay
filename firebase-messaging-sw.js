/* ============================================================================
 * firebase-messaging-sw.js
 * ----------------------------------------------------------------------------
 * Place this file at the ROOT of your website (same level as index.html).
 *
 * This Service Worker handles:
 *   1. Firebase Cloud Messaging (FCM) push notifications sent from the admin
 *      panel (adminprocess.html / adminautoupgrade.html) — works even when the
 *      browser tab is closed.
 *   2. Local Service Worker notifications triggered by the in-page code in
 *      "message new (noficaton).html" via `swReg.showNotification(...)`.
 *
 * It is shared by both the admin side and the user side, so any change to
 * notification behaviour should be made here only.
 * ==========================================================================*/

/* ─── Firebase SDK (compat build – required for Service Workers) ────────── */
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js');

/* ─── Firebase config (must match the one used in your web pages) ───────── */
firebase.initializeApp({
    apiKey: "AIzaSyAjLxkisBi9pzmjlwdHnYfo25XR2Z6ToEs",
    authDomain: "opay-plus-5802c.firebaseapp.com",
    projectId: "opay-plus-5802c",
    storageBucket: "opay-plus-5802c.firebasestorage.app",
    messagingSenderId: "967061625774",
    appId: "1:967061625774:web:236f88391ccdd9edd2863f"
});

const messaging = firebase.messaging();

/* ============================================================================
 * LIFECYCLE EVENTS
 * ----------------------------------------------------------------------------
 *  • install  → activate the new Service Worker immediately instead of waiting
 *               for all tabs to be closed.
 *  • activate → take control of any already-open pages right away so that
 *               `showNotification()` works from the very first page load.
 * ==========================================================================*/
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

/* ============================================================================
 * FCM BACKGROUND PUSH
 * ----------------------------------------------------------------------------
 * Fires when a push is received while the page is closed or in the background.
 * The payload comes from the admin panel's sendPushNotification cloud function
 * (or the direct REST call to https://fcm.googleapis.com/fcm/send).
 * ==========================================================================*/
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background push received:', payload);
    
    /* Support both `notification` and `data` shapes — some backends send one,
       some send the other, some send both. */
    const notif = payload.notification || {};
    const data = payload.data || {};
    
    const title =
        notif.title ||
        data.title ||
        'New notification from Opay Plus';
    
    const bodyText =
        notif.body ||
        data.body ||
        '';
    
    const iconUrl =
        notif.icon ||
        data.icon ||
        '/images/dashboard/logo.png';
    
    const imageUrl =
        notif.image ||
        data.image ||
        undefined;
    
    const clickAction =
        data.clickAction ||
        notif.click_action ||
        '/message new (noficaton).html';
    
    const options = {
        body: bodyText,
        icon: iconUrl,
        badge: '/images/dashboard/logo.png',
        image: imageUrl,
        /* Tagging by title + body prevents duplicate notifications if the same
           push is delivered twice by the browser. */
        tag: 'opay-push-' + (data.messageId || Date.now()),
        renotify: false,
        silent: false,
        requireInteraction: false,
        data: {
            clickAction: clickAction,
            url: clickAction,
            messageId: data.messageId || null,
            timestamp: Date.now()
        }
    };
    
    return self.registration.showNotification(title, options);
});

/* ============================================================================
 * NOTIFICATION CLICK
 * ----------------------------------------------------------------------------
 * Fires when the user taps/clicks a notification.
 *   1. Close the notification.
 *   2. If a matching tab is already open, focus it and navigate to the target
 *      URL.
 *   3. Otherwise open a new tab with the target URL.
 *
 * The URL is resolved from (in order):
 *   • data.clickAction  (FCM pushes)
 *   • data.url          (local SW notifications)
 *   • fallback          (the notifications page)
 * ==========================================================================*/
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const notifData = event.notification.data || {};
    const targetUrl =
        notifData.clickAction ||
        notifData.url ||
        '/message new (noficaton).html';
    
    console.log('[firebase-messaging-sw.js] Notification clicked →', targetUrl);
    
    event.waitUntil(
        clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
            /* Reuse an existing tab if one is already open on our origin. */
            for (const client of clientList) {
                try {
                    if (
                        client.url &&
                        client.url.includes(self.location.origin) &&
                        'focus' in client
                    ) {
                        if ('navigate' in client) {
                            client.navigate(targetUrl);
                        }
                        return client.focus();
                    }
                } catch (err) {
                    console.warn('[firebase-messaging-sw.js] Client focus failed:', err);
                }
            }
            /* No matching tab — open a fresh one. */
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

/* ============================================================================
 * OPTIONAL: Handle notifications closed by the user
 * ----------------------------------------------------------------------------
 * Fires when a notification is dismissed without being clicked.
 * Useful for analytics or cleaning up state.
 * ==========================================================================*/
self.addEventListener('notificationclose', (event) => {
    console.log('[firebase-messaging-sw.js] Notification closed:', event.notification.tag);
});

/* ============================================================================
 * OPTIONAL: Service Worker error handling
 * ----------------------------------------------------------------------------
 * Logs any uncaught errors thrown inside the SW so they show up in DevTools.
 * ==========================================================================*/
self.addEventListener('error', (event) => {
    console.error('[firebase-messaging-sw.js] Uncaught error:', event.error || event.message);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[firebase-messaging-sw.js] Unhandled promise rejection:', event.reason);
});

/* ============================================================================
 * END OF FILE
 * ==========================================================================*/